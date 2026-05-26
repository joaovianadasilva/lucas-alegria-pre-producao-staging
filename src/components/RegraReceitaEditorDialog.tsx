import { useState, useEffect } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  EVENTOS_GERADORES, EVENTOS_GERADORES_VALIDOS, DATA_REFERENCIA_PADRAO,
  DATAS_REFERENCIA, ENTIDADES, BASES_VALOR, BASES_VOLUME,
  RegraReceitaJSON, emptyRegraReceita, validateRegraReceita, Entidade,
} from '@/lib/regras/receita';
import { GroupEditor, Group, Node, isGroup } from './RegraEditorDialog';

interface Provedor { id: string; nome: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: any | null;
  provedores: Provedor[];
  onSaved: () => void;
}

export default function RegraReceitaEditorDialog({ open, onOpenChange, initial, provedores, onSaved }: Props) {
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [aplicaTodos, setAplicaTodos] = useState(false);
  const [provedorIds, setProvedorIds] = useState<string[]>([]);
  const [r, setR] = useState<RegraReceitaJSON>(emptyRegraReceita());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setNome(initial.nome || '');
      setAtivo(initial.ativo ?? true);
      setAplicaTodos(initial.aplica_todos ?? false);
      setProvedorIds(initial.provedor_ids || (initial.provedor_id ? [initial.provedor_id] : []));
      setR({ ...emptyRegraReceita(), ...(initial.regra || {}) });
    } else {
      setNome(''); setAtivo(true); setAplicaTodos(false); setProvedorIds([]);
      setR(emptyRegraReceita());
    }
  }, [open, initial]);

  // Helpers para o GroupEditor (árvore de condições)
  const setTree = (next: Group) => setR(s => ({ ...s, condicoes: next }));
  const tree = r.condicoes as Group;
  const updateNode = (path: number[], updater: (n: Node) => Node) => {
    const recur = (node: Node, depth: number): Node => {
      if (depth === path.length) return updater(node);
      if (!isGroup(node)) return node;
      const idx = path[depth];
      return { ...node, children: node.children.map((c, i) => i === idx ? recur(c, depth + 1) : c) };
    };
    setTree(recur(tree, 0) as Group);
  };
  const addCondition = (path: number[]) => updateNode(path, (n) => isGroup(n) ? { ...n, children: [...n.children, { field: 'status_contrato', operator: 'eq', value: '' }] } : n);
  const addGroup = (path: number[]) => updateNode(path, (n) => isGroup(n) ? { ...n, children: [...n.children, { op: 'AND', children: [] } as Group] } : n);
  const removeChild = (parentPath: number[], childIdx: number) => updateNode(parentPath, (n) => { if (!isGroup(n)) return n; const c = [...n.children]; c.splice(childIdx, 1); return { ...n, children: c }; });
  const setOp = (path: number[], op: 'AND' | 'OR') => updateNode(path, (n) => isGroup(n) ? { ...n, op } : n);
  const updateChild = (parentPath: number[], childIdx: number, child: Node) => updateNode(parentPath, (n) => { if (!isGroup(n)) return n; const c = [...n.children]; c[childIdx] = child; return { ...n, children: c }; });

  const toggleEntidade = (list: Entidade[], e: Entidade): Entidade[] =>
    list.includes(e) ? list.filter(x => x !== e) : [...list, e];

  const handleSave = async () => {
    const err = validateRegraReceita(nome, aplicaTodos, provedorIds, r);
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const action = initial ? 'atualizarRegra' : 'criarRegra';
      const body: any = {
        action, nome, tipo: 'receita', ativo,
        aplica_todos: aplicaTodos,
        provedor_ids: aplicaTodos ? [] : provedorIds,
        regra: r,
      };
      if (initial) body.id = initial.id;
      const { data, error } = await supabase.functions.invoke('central-operacional', { body });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success('Regra salva');
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const bc = r.base_comissao;
  const setBc = (patch: Partial<typeof bc>) => setR(s => ({ ...s, base_comissao: { ...s.base_comissao, ...patch } }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar regra' : 'Nova regra'} — Receita</DialogTitle>
          <DialogDescription>Define como uma soma de valor e volume é calculada a partir dos contratos do provedor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 1. Identificação */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">1. Identificação</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Nome da regra</Label>
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
              <RadioGroup
                value={aplicaTodos ? 'todos' : 'especificos'}
                onValueChange={(v) => setAplicaTodos(v === 'todos')}
                className="space-y-2"
              >
                <label className="flex items-start gap-2 cursor-pointer rounded-md border p-3 hover:bg-muted/40">
                  <RadioGroupItem value="todos" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Aplicar a todos os provedores</div>
                    <div className="text-xs text-muted-foreground">A regra vale para qualquer provedor da plataforma.</div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer rounded-md border p-3 hover:bg-muted/40">
                  <RadioGroupItem value="especificos" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Selecionar provedores específicos</div>
                    <div className="text-xs text-muted-foreground">A regra só vale para os provedores escolhidos abaixo.</div>
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


          {/* 2-4 Evento, data, entidades */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">2. Evento gerador, data e entidades elegíveis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Evento gerador</Label>
                  <Select
                    value={(EVENTOS_GERADORES_VALIDOS as readonly string[]).includes(r.evento_gerador) ? r.evento_gerador : ''}
                    onValueChange={(v: any) => setR(s => ({
                      ...s,
                      evento_gerador: v,
                      data_referencia: (DATA_REFERENCIA_PADRAO[v] as any) || s.data_referencia,
                    }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione o evento" /></SelectTrigger>
                    <SelectContent>{EVENTOS_GERADORES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {!(EVENTOS_GERADORES_VALIDOS as readonly string[]).includes(r.evento_gerador) && (
                    <p className="text-xs text-destructive mt-1">
                      Evento "{r.evento_gerador}" não é mais válido para regras de receita. Selecione Venda ou Ativação.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Venda conta no cadastro do contrato (cancelamentos posteriores não removem da base). Ativação conta quando <code>data_ativacao</code> é preenchida.
                  </p>
                </div>
                <div>
                  <Label>Data de referência</Label>
                  <Select value={r.data_referencia} onValueChange={(v: any) => setR(s => ({ ...s, data_referencia: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DATAS_REFERENCIA.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Entidades elegíveis</Label>
                <div className="flex gap-4 mt-2">
                  {ENTIDADES.map(e => (
                    <label key={e.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={r.entidades_elegiveis.includes(e.value)} onCheckedChange={() => setR(s => ({ ...s, entidades_elegiveis: toggleEntidade(s.entidades_elegiveis, e.value) }))} />
                      <span>{e.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. Condições */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">3. Condições de elegibilidade</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Combine condições com E/OU. Um contrato entra na regra quando a expressão é verdadeira.</p>
              <GroupEditor
                node={tree}
                path={[]}
                root
                onSetOp={(op) => setTree({ ...tree, op })}
                onAddCondition={() => addCondition([])}
                onAddGroup={() => addGroup([])}
                onUpdateChild={(idx, c) => updateChild([], idx, c)}
                onRemoveChild={(idx) => removeChild([], idx)}
                addCondition={addCondition}
                addGroup={addGroup}
                removeChild={removeChild}
                setOp={setOp}
                updateChild={updateChild}
              />
            </CardContent>
          </Card>

          {/* 6-7 Bases */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">4. Bases de valor e volume</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Base de valor é o que é somado em R$. Base de volume é o que é contado (usado depois em faixas de comissão).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Base de valor</Label>
                  <Select value={r.base_valor} onValueChange={(v: any) => setR(s => ({ ...s, base_valor: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BASES_VALOR.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Base de volume</Label>
                  <Select value={r.base_volume} onValueChange={(v: any) => setR(s => ({ ...s, base_volume: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{BASES_VOLUME.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 8. Base de comissão */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">5. Base de comissão</CardTitle>
              <div className="flex items-center gap-2"><Switch checked={bc.ativa} onCheckedChange={(v) => setBc({ ativa: v })} /><Label className="text-xs">Esta regra gera base de comissão?</Label></div>
            </CardHeader>
            {bc.ativa && (
              <CardContent className="space-y-3">
                <div>
                  <Label>Nome da base de comissão</Label>
                  <Input value={bc.nome || ''} onChange={e => setBc({ nome: e.target.value })} placeholder="Ex.: Comissão venda inicial" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Base de valor da comissão</Label>
                    <Select value={bc.base_valor || ''} onValueChange={(v: any) => setBc({ base_valor: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{BASES_VALOR.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Evento de referência</Label>
                    <Select value={bc.evento_gerador || ''} onValueChange={(v: any) => setBc({ evento_gerador: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{EVENTOS_GERADORES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label>Data de referência</Label>
                    <Select value={bc.data_referencia || ''} onValueChange={(v: any) => setBc({ data_referencia: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{DATAS_REFERENCIA.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label>Entidades incluídas</Label>
                    <div className="flex gap-4 mt-2">
                      {ENTIDADES.map(e => (
                        <label key={e.value} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={(bc.entidades_incluidas || []).includes(e.value)} onCheckedChange={() => setBc({ entidades_incluidas: toggleEntidade(bc.entidades_incluidas || [], e.value) })} />
                          <span>{e.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label>Entidades excluídas</Label>
                    <div className="flex gap-4 mt-2">
                      {ENTIDADES.map(e => (
                        <label key={e.value} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={(bc.entidades_excluidas || []).includes(e.value)} onCheckedChange={() => setBc({ entidades_excluidas: toggleEntidade(bc.entidades_excluidas || [], e.value) })} />
                          <span>{e.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
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
