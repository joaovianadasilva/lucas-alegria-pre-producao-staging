import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Trash2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  TIPOS_REGUA, BASES_VOLUME, BASES_VALOR, CICLOS,
  ReguaComissaoJSON, emptyReguaComissao, validateReguaComissao,
  isBaseVolume, isBaseValor, labelBase, previewRegua,
  RegraReceitaResumo, Faixa,
} from '@/lib/regras/comissao';

interface Provedor { id: string; nome: string }
interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any | null;
  provedores: Provedor[];
  onSaved: () => void;
}

export default function ReguaComissaoEditorDialog({ open, onOpenChange, initial, provedores, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [aplicaTodos, setAplicaTodos] = useState(false);
  const [provedorIds, setProvedorIds] = useState<string[]>([]);
  const [r, setR] = useState<ReguaComissaoJSON>(emptyReguaComissao());
  const [saving, setSaving] = useState(false);
  const [receitas, setReceitas] = useState<RegraReceitaResumo[]>([]);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setNome(initial.nome || '');
      setAtivo(initial.ativo ?? true);
      setAplicaTodos(initial.aplica_todos ?? false);
      setProvedorIds(initial.provedor_ids || (initial.provedor_id ? [initial.provedor_id] : []));
      setR({ ...emptyReguaComissao(), ...(initial.regra || {}) });
    } else {
      setNome(''); setAtivo(true); setAplicaTodos(false); setProvedorIds([]);
      setR(emptyReguaComissao());
    }
  }, [open, initial]);

  // Carrega regras de receita disponíveis
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke('central-operacional', {
        body: { action: 'listarRegras', tipo: 'receita' },
      });
      if (error || data?.error) { toast.error('Erro ao carregar regras de receita'); return; }
      const items: RegraReceitaResumo[] = (data.regras || []).map((x: any) => ({
        id: x.id,
        nome: x.nome,
        ativo: x.ativo,
        aplica_todos: x.aplica_todos,
        provedor_ids: x.provedor_ids || [],
        base_valor: x.regra?.base_valor,
        base_volume: x.regra?.base_volume,
        base_comissao_ativa: !!x.regra?.base_comissao?.ativa,
      }));
      setReceitas(items);
    })();
  }, [open]);

  // Filtra receitas compatíveis com o(s) provedor(es) selecionados
  const receitasFiltradas = useMemo(() => {
    return receitas.filter(rec => {
      if (!rec.ativo) return false;
      if (aplicaTodos) return rec.aplica_todos;
      if (provedorIds.length === 0) return true;
      if (rec.aplica_todos) return true;
      return provedorIds.every(pid => rec.provedor_ids.includes(pid));
    });
  }, [receitas, aplicaTodos, provedorIds]);

  const receitaSelecionada = receitas.find(x => x.id === r.regra_receita_id) || null;

  // Bases disponíveis dado a receita escolhida + tipo de régua
  const opcoesBaseFaixa = useMemo(() => {
    if (!receitaSelecionada) return [] as { value: string; label: string }[];
    const vols = receitaSelecionada.base_volume ? BASES_VOLUME.filter(b => b.value === receitaSelecionada.base_volume) : [];
    const vals = receitaSelecionada.base_valor ? BASES_VALOR.filter(b => b.value === receitaSelecionada.base_valor) : [];
    if (r.tipo_regua === 'faixa_volume') return vols;
    if (r.tipo_regua === 'faixa_valor') return vals;
    if (r.tipo_regua === 'hibrida') return [...vols, ...vals];
    return [];
  }, [receitaSelecionada, r.tipo_regua]);

  const opcoesBaseCalculo = useMemo(() => {
    if (!receitaSelecionada) return [] as { value: string; label: string }[];
    const vols = receitaSelecionada.base_volume ? BASES_VOLUME.filter(b => b.value === receitaSelecionada.base_volume) : [];
    const vals = receitaSelecionada.base_valor ? BASES_VALOR.filter(b => b.value === receitaSelecionada.base_valor) : [];
    if (r.tipo_regua === 'valor_fixo_unidade') return vols;
    if (r.tipo_regua === 'hibrida') return [...vols, ...vals].filter(b => b.value !== r.base_faixa);
    if (r.tipo_regua === 'faixa_volume') return vols;
    if (r.tipo_regua === 'faixa_valor') return vals;
    // percentual_fixo
    return [...vols, ...vals];
  }, [receitaSelecionada, r.tipo_regua, r.base_faixa]);

  // Auto-ajusta base_calculo = base_faixa em faixa_volume/faixa_valor
  useEffect(() => {
    if ((r.tipo_regua === 'faixa_volume' || r.tipo_regua === 'faixa_valor') && r.base_faixa && r.base_calculo !== r.base_faixa) {
      setR(s => ({ ...s, base_calculo: s.base_faixa! }));
    }
  }, [r.tipo_regua, r.base_faixa]);

  const showFaixa = r.tipo_regua === 'faixa_volume' || r.tipo_regua === 'faixa_valor' || r.tipo_regua === 'hibrida';
  const showFaixas = showFaixa;

  const addFaixa = () => {
    const last = r.faixas[r.faixas.length - 1];
    const min = last ? (last.max != null ? last.max + 1 : 0) : 1;
    setR(s => ({ ...s, faixas: [...s.faixas, { min, max: null, fator: 100, tipo_fator: 'percentual' }] }));
  };
  const updateFaixa = (i: number, patch: Partial<Faixa>) => {
    setR(s => ({ ...s, faixas: s.faixas.map((f, idx) => idx === i ? { ...f, ...patch } : f) }));
  };
  const removeFaixa = (i: number) => setR(s => ({ ...s, faixas: s.faixas.filter((_, idx) => idx !== i) }));

  const handleSave = async () => {
    const err = validateReguaComissao(nome, aplicaTodos, provedorIds, r);
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const action = initial ? 'atualizarRegra' : 'criarRegra';
      const body: any = {
        action, nome, tipo: 'comissao', ativo,
        aplica_todos: aplicaTodos,
        provedor_ids: aplicaTodos ? [] : provedorIds,
        regra: r,
      };
      if (initial) body.id = initial.id;
      const { data, error } = await supabase.functions.invoke('central-operacional', { body });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success('Régua salva');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar régua' : 'Nova régua'} — Comissão</DialogTitle>
          <DialogDescription>
            Calcula comissão a partir de bases geradas por uma Regra de Receita. Forward-looking: cancelamentos e reembolsos
            são tratados pelo módulo financeiro e não recalculam comissão aqui.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 1. Dados gerais */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">1. Dados gerais</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome da régua</Label>
                  <Input value={nome} onChange={e => setNome(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <div className="flex items-center gap-2"><Switch checked={ativo} onCheckedChange={setAtivo} /><Label>Ativa</Label></div>
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={r.descricao || ''} onChange={e => setR(s => ({ ...s, descricao: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Vigência inicial</Label><Input type="date" value={r.vigencia_inicio} onChange={e => setR(s => ({ ...s, vigencia_inicio: e.target.value }))} /></div>
                <div><Label>Vigência final (opcional)</Label><Input type="date" value={r.vigencia_fim || ''} onChange={e => setR(s => ({ ...s, vigencia_fim: e.target.value || null }))} /></div>
              </div>
            </CardContent>
          </Card>

          {/* 2. Provedor alvo */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">2. Provedor alvo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <RadioGroup value={aplicaTodos ? 'todos' : 'especificos'} onValueChange={(v) => setAplicaTodos(v === 'todos')} className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer rounded-md border p-3 hover:bg-muted/40">
                  <RadioGroupItem value="todos" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Aplicar a todos os provedores</div>
                    <div className="text-xs text-muted-foreground">A régua vale para qualquer provedor da plataforma.</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer rounded-md border p-3 hover:bg-muted/40">
                  <RadioGroupItem value="especificos" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Selecionar provedores específicos</div>
                    <div className="text-xs text-muted-foreground">A régua só vale para os provedores escolhidos abaixo.</div>
                  </div>
                </label>
              </RadioGroup>
              {!aplicaTodos && (
                <div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">{provedorIds.length === 0 ? 'Selecione provedores' : `${provedorIds.length} selecionado(s)`}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72">
                      <div className="space-y-1 max-h-72 overflow-auto">
                        {provedores.map(p => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm py-1">
                            <Checkbox checked={provedorIds.includes(p.id)} onCheckedChange={() => setProvedorIds(provedorIds.includes(p.id) ? provedorIds.filter(x => x !== p.id) : [...provedorIds, p.id])} />
                            <span>{p.nome}</span>
                          </label>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {provedorIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {provedorIds.map(id => <Badge key={id} variant="secondary">{provedores.find(x => x.id === id)?.nome || id}</Badge>)}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Regra de Receita vinculada */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">3. Regra de Receita vinculada</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Regra de Receita</Label>
                <Select value={r.regra_receita_id || ''} onValueChange={(v) => setR(s => ({ ...s, regra_receita_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={receitasFiltradas.length ? 'Selecione a regra' : 'Nenhuma regra de receita compatível'} /></SelectTrigger>
                  <SelectContent>
                    {receitasFiltradas.map(rec => (
                      <SelectItem key={rec.id} value={rec.id}>{rec.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Só listamos regras de receita ativas que cobrem o escopo de provedor escolhido.</p>
              </div>
              {receitaSelecionada && (
                <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
                  <div><span className="text-muted-foreground">Bases disponíveis:</span></div>
                  <div className="flex flex-wrap gap-1">
                    {receitaSelecionada.base_volume && <Badge variant="outline">Volume: {labelBase(receitaSelecionada.base_volume)}</Badge>}
                    {receitaSelecionada.base_valor && <Badge variant="outline">Valor: {labelBase(receitaSelecionada.base_valor)}</Badge>}
                    {receitaSelecionada.base_comissao_ativa && <Badge>Base de comissão dedicada</Badge>}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Tipo da régua */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">4. Tipo da régua</CardTitle></CardHeader>
            <CardContent>
              <RadioGroup value={r.tipo_regua} onValueChange={(v: any) => setR(s => ({ ...s, tipo_regua: v, base_faixa: undefined, faixas: [] }))} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {TIPOS_REGUA.map(t => (
                  <label key={t.value} className="flex items-start gap-2 cursor-pointer rounded-md border p-3 hover:bg-muted/40">
                    <RadioGroupItem value={t.value} className="mt-0.5" />
                    <div>
                      <div className="text-sm font-medium">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* 5. Base para definir faixa */}
          {showFaixa && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">5. Base para definir faixa</CardTitle></CardHeader>
              <CardContent>
                <Select value={r.base_faixa || ''} onValueChange={(v: any) => setR(s => ({ ...s, base_faixa: v }))} disabled={!receitaSelecionada}>
                  <SelectTrigger><SelectValue placeholder="Selecione a base" /></SelectTrigger>
                  <SelectContent>
                    {opcoesBaseFaixa.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* 6. Base para cálculo + parâmetros do tipo */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{showFaixa ? '6.' : '5.'} Base para cálculo da comissão</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={r.base_calculo || ''} onValueChange={(v: any) => setR(s => ({ ...s, base_calculo: v }))} disabled={!receitaSelecionada}>
                <SelectTrigger><SelectValue placeholder="Selecione a base" /></SelectTrigger>
                <SelectContent>
                  {opcoesBaseCalculo.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>

              {r.tipo_regua === 'percentual_fixo' && (
                <div>
                  <Label>Percentual fixo (%)</Label>
                  <Input type="number" step="0.01" value={r.percentual_fixo ?? ''} onChange={e => setR(s => ({ ...s, percentual_fixo: e.target.value ? Number(e.target.value) : undefined }))} />
                </div>
              )}
              {r.tipo_regua === 'valor_fixo_unidade' && (
                <div>
                  <Label>Valor fixo por unidade (R$)</Label>
                  <Input type="number" step="0.01" value={r.valor_fixo_unidade ?? ''} onChange={e => setR(s => ({ ...s, valor_fixo_unidade: e.target.value ? Number(e.target.value) : undefined }))} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 7. Faixas e fatores */}
          {showFaixas && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">{showFaixa ? '7.' : '6.'} Faixas e fatores</CardTitle>
                <Button size="sm" variant="outline" onClick={addFaixa}><Plus className="h-4 w-4 mr-1" /> Adicionar faixa</Button>
              </CardHeader>
              <CardContent>
                {r.faixas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma faixa cadastrada.</p>
                ) : (
                  <div className="space-y-2">
                    {r.faixas.map((f, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 items-end border rounded-md p-2">
                        <div className="col-span-2">
                          <Label className="text-xs">Mín</Label>
                          <Input type="number" value={f.min} onChange={e => updateFaixa(i, { min: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Máx (vazio = ∞)</Label>
                          <Input type="number" value={f.max ?? ''} onChange={e => updateFaixa(i, { max: e.target.value === '' ? null : Number(e.target.value) })} />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Tipo</Label>
                          <Select value={f.tipo_fator} onValueChange={(v: any) => updateFaixa(i, { tipo_fator: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="percentual">Percentual (%)</SelectItem>
                              <SelectItem value="valor_fixo">Valor fixo (R$)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Fator</Label>
                          <Input type="number" step="0.01" value={f.fator} onChange={e => updateFaixa(i, { fator: Number(e.target.value) })} />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs">Descrição</Label>
                          <Input value={f.descricao || ''} onChange={e => updateFaixa(i, { descricao: e.target.value })} />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <Button size="icon" variant="ghost" onClick={() => removeFaixa(i)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 8. Ciclo */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{showFaixas ? '8.' : showFaixa ? '7.' : '6.'} Ciclo de apuração</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Tipo de ciclo</Label>
                  <Select value={r.ciclo.tipo} onValueChange={(v: any) => setR(s => ({ ...s, ciclo: { ...s.ciclo, tipo: v } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CICLOS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Dia previsto de pagamento</Label>
                  <Input type="number" min={1} max={31} value={r.ciclo.dia_pagamento ?? ''} onChange={e => setR(s => ({ ...s, ciclo: { ...s.ciclo, dia_pagamento: e.target.value ? Number(e.target.value) : undefined } }))} placeholder="Ex.: 15" />
                </div>
                {r.ciclo.tipo === 'personalizado' && (
                  <div>
                    <Label>Intervalo (dias)</Label>
                    <Input type="number" min={1} value={r.ciclo.intervalo_dias ?? ''} onChange={e => setR(s => ({ ...s, ciclo: { ...s.ciclo, intervalo_dias: e.target.value ? Number(e.target.value) : undefined } }))} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 9. Prévia */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Prévia em linguagem natural</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm">{previewRegua(r, receitaSelecionada?.nome)}</p>
              {showFaixas && r.faixas.length > 0 && (
                <ul className="mt-2 text-xs text-muted-foreground space-y-0.5">
                  {[...r.faixas].sort((a, b) => a.min - b.min).map((f, i) => (
                    <li key={i}>
                      {f.min}–{f.max ?? '∞'} → {f.fator}{f.tipo_fator === 'percentual' ? '%' : ' R$'}{f.descricao ? ` (${f.descricao})` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
