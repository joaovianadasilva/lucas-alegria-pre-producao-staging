import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, FileBarChart } from 'lucide-react';
import { toast } from 'sonner';
import { formatLocalDate, toISODateString } from '@/lib/dateUtils';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  BarChart, Bar,
} from 'recharts';

interface Provedor { id: string; nome: string }

type Preset = 'hoje' | '7d' | 'mes_atual' | 'mes_anterior' | 'ano' | 'custom';

const fmtBRL = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (n: number) => (n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

function getPresetRange(p: Preset): { ini: string; fim: string } {
  const today = new Date();
  const t = (d: Date) => toISODateString(d);
  if (p === 'hoje') return { ini: t(today), fim: t(today) };
  if (p === '7d') {
    const d = new Date(today); d.setDate(d.getDate() - 6);
    return { ini: t(d), fim: t(today) };
  }
  if (p === 'mes_atual') {
    const ini = new Date(today.getFullYear(), today.getMonth(), 1);
    return { ini: t(ini), fim: t(today) };
  }
  if (p === 'mes_anterior') {
    const ini = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const fim = new Date(today.getFullYear(), today.getMonth(), 0);
    return { ini: t(ini), fim: t(fim) };
  }
  if (p === 'ano') {
    const ini = new Date(today.getFullYear(), 0, 1);
    return { ini: t(ini), fim: t(today) };
  }
  return { ini: t(today), fim: t(today) };
}

interface Relatorio {
  kpis: any;
  serieTemporal: { data: string; cadastrados: number; instalados: number }[];
  composicao: {
    semAdicionais: { cadastrados: number; instalados: number; valorPlanoCadastrados: number; valorPlanoInstalados: number };
    comAdicionais: { cadastrados: number; instalados: number; valorPlanoCadastrados: number; valorAdicionaisCadastrados: number; valorPlanoInstalados: number; valorAdicionaisInstalados: number };
  };
  rankings: {
    planos: { codigo: string; nome: string; cadastrados: number; instalados: number }[];
    adicionais: { codigo: string; nome: string; total: number }[];
    origens: { chave: string; cadastrados: number; instalados: number }[];
    representantes: { chave: string; cadastrados: number; instalados: number }[];
  };
  cancelamentosPorMotivo: { motivo: string; total: number }[];
}

export default function RelatorioVisaoGeralVendas() {
  const [provedorIds, setProvedorIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>('mes_atual');
  const initial = getPresetRange('mes_atual');
  const [dataInicio, setDataInicio] = useState(initial.ini);
  const [dataFim, setDataFim] = useState(initial.fim);
  const [applied, setApplied] = useState({ provedorIds: [] as string[], dataInicio: initial.ini, dataFim: initial.fim, key: 0 });

  const { data: provedores } = useQuery({
    queryKey: ['central-provedores'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('central-operacional', { body: { action: 'listProvedores' } });
      if (error) throw error;
      return data.provedores as Provedor[];
    },
  });

  const provedorMap = useMemo(() => {
    const m = new Map<string, string>();
    (provedores || []).forEach(p => m.set(p.id, p.nome));
    return m;
  }, [provedores]);

  const { data: relatorio, isLoading, isFetching } = useQuery<Relatorio>({
    queryKey: ['central-relatorio-vendas', applied],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('central-operacional', {
        body: {
          action: 'relatorioVisaoGeralVendas',
          provedorIds: applied.provedorIds.length ? applied.provedorIds : undefined,
          dataInicio: applied.dataInicio,
          dataFim: applied.dataFim,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar relatório');
      return data as Relatorio;
    },
  });

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') {
      const r = getPresetRange(p);
      setDataInicio(r.ini);
      setDataFim(r.fim);
    }
  };

  const aplicar = () => {
    if (!dataInicio || !dataFim) { toast.error('Selecione um período'); return; }
    if (dataInicio > dataFim) { toast.error('Data inicial maior que final'); return; }
    setApplied({ provedorIds, dataInicio, dataFim, key: applied.key + 1 });
  };

  const toggleProv = (id: string) =>
    setProvedorIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const k = relatorio?.kpis;
  const comp = relatorio?.composicao;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <FileBarChart className="h-7 w-7" />
        <div>
          <h1 className="text-3xl font-bold">Visão Geral de Vendas</h1>
          <p className="text-muted-foreground">Consolidado de cadastros, instalações e cancelamentos.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filtros</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Provedores {provedorIds.length > 0 && <Badge variant="secondary">{provedorIds.length}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <div className="space-y-2 max-h-72 overflow-auto">
                {(provedores || []).map(p => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox checked={provedorIds.includes(p.id)} onCheckedChange={() => toggleProv(p.id)} />
                    {p.nome}
                  </label>
                ))}
                {provedorIds.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setProvedorIds([])}>Limpar</Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex flex-wrap gap-1">
            {([
              ['hoje', 'Hoje'], ['7d', '7 dias'], ['mes_atual', 'Mês atual'],
              ['mes_anterior', 'Mês anterior'], ['ano', 'Ano'], ['custom', 'Customizado'],
            ] as [Preset, string][]).map(([v, lbl]) => (
              <Button
                key={v}
                size="sm"
                variant={preset === v ? 'default' : 'outline'}
                onClick={() => handlePreset(v)}
              >{lbl}</Button>
            ))}
          </div>

          <div>
            <Label className="text-xs">Início</Label>
            <Input type="date" value={dataInicio} onChange={e => { setDataInicio(e.target.value); setPreset('custom'); }} />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={dataFim} onChange={e => { setDataFim(e.target.value); setPreset('custom'); }} />
          </div>

          <Button onClick={aplicar} disabled={isFetching}>
            {isFetching ? 'Carregando...' : 'Aplicar filtros'}
          </Button>
        </CardContent>
      </Card>

      {isLoading || !relatorio ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>
      ) : (
        <>
          {/* Linha 1 - KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard titulo="Contratos Cadastrados" total={k.cadastrados} mediaDia={k.mediaCadastradosDia} mediaSemana={k.mediaCadastradosSemana} accent="text-blue-600" />
            <KpiCard titulo="Contratos Instalados" total={k.instalados} mediaDia={k.mediaInstaladosDia} mediaSemana={k.mediaInstaladosSemana} accent="text-emerald-600" />
            <KpiCard titulo="Contratos Cancelados" total={k.cancelados} mediaDia={k.mediaCanceladosDia} mediaSemana={k.mediaCanceladosSemana} accent="text-red-600" />
          </div>

          {/* Linha 2 - Gráfico temporal */}
          <Card>
            <CardHeader><CardTitle className="text-base">Cadastros vs Instalações por dia</CardTitle></CardHeader>
            <CardContent style={{ height: 320 }}>
              {relatorio.serieTemporal.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados no período.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.serieTemporal} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" tickFormatter={d => formatLocalDate(d, { day: '2-digit', month: '2-digit' })} />
                    <YAxis allowDecimals={false} />
                    <Tooltip labelFormatter={d => formatLocalDate(String(d))} />
                    <Legend />
                    <Bar dataKey="cadastrados" name="Cadastrados" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="instalados" name="Instalados" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Linha 3 - Composição */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Sem adicionais</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Cadastrados</div>
                  <Row label="Quantidade" value={comp!.semAdicionais.cadastrados} />
                  <Row label="Valor planos" value={fmtBRL(comp!.semAdicionais.valorPlanoCadastrados)} highlight />
                </div>
                <div className="space-y-1 border-t pt-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Instalados</div>
                  <Row label="Quantidade" value={comp!.semAdicionais.instalados} />
                  <Row label="Valor planos" value={fmtBRL(comp!.semAdicionais.valorPlanoInstalados)} highlight />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Com adicionais</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Cadastrados</div>
                  <Row label="Quantidade" value={comp!.comAdicionais.cadastrados} />
                  <Row label="Valor planos" value={fmtBRL(comp!.comAdicionais.valorPlanoCadastrados)} />
                  <Row label="Valor adicionais" value={fmtBRL(comp!.comAdicionais.valorAdicionaisCadastrados)} />
                  <Row label="Valor total" value={fmtBRL(comp!.comAdicionais.valorPlanoCadastrados + comp!.comAdicionais.valorAdicionaisCadastrados)} highlight />
                </div>
                <div className="space-y-1 border-t pt-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Instalados</div>
                  <Row label="Quantidade" value={comp!.comAdicionais.instalados} />
                  <Row label="Valor planos" value={fmtBRL(comp!.comAdicionais.valorPlanoInstalados)} />
                  <Row label="Valor adicionais" value={fmtBRL(comp!.comAdicionais.valorAdicionaisInstalados)} />
                  <Row label="Valor total" value={fmtBRL(comp!.comAdicionais.valorPlanoInstalados + comp!.comAdicionais.valorAdicionaisInstalados)} highlight />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Linha 4 - Rankings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Planos (Top 10)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Cadastrados</TableHead>
                      <TableHead className="text-right">Instalados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorio.rankings.planos.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">—</TableCell></TableRow>
                    ) : relatorio.rankings.planos.map(p => (
                      <TableRow key={p.codigo}>
                        <TableCell><div className="font-medium">{p.nome}</div><div className="text-xs text-muted-foreground">{p.codigo}</div></TableCell>
                        <TableCell className="text-right">{p.cadastrados}</TableCell>
                        <TableCell className="text-right">{p.instalados}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Adicionais mais cadastrados (Top 10)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adicional</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorio.rankings.adicionais.length === 0 ? (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">—</TableCell></TableRow>
                    ) : relatorio.rankings.adicionais.map(a => (
                      <TableRow key={a.codigo}>
                        <TableCell><div className="font-medium">{a.nome}</div><div className="text-xs text-muted-foreground">{a.codigo}</div></TableCell>
                        <TableCell className="text-right">{a.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Linha 4b - Origem e Representante */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Vendas por origem</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Origem</TableHead>
                      <TableHead className="text-right">Cadastrados</TableHead>
                      <TableHead className="text-right">Instalados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(relatorio.rankings.origens?.length ?? 0) === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">—</TableCell></TableRow>
                    ) : relatorio.rankings.origens!.map(o => (
                      <TableRow key={o.chave}>
                        <TableCell className="font-medium">{o.chave}</TableCell>
                        <TableCell className="text-right">{o.cadastrados}</TableCell>
                        <TableCell className="text-right">{o.instalados}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Vendas por representante</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Representante</TableHead>
                      <TableHead className="text-right">Cadastrados</TableHead>
                      <TableHead className="text-right">Instalados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relatorio.rankings.representantes.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">—</TableCell></TableRow>
                    ) : relatorio.rankings.representantes.map(r => (
                      <TableRow key={r.chave}>
                        <TableCell className="font-medium">{r.chave}</TableCell>
                        <TableCell className="text-right">{r.cadastrados}</TableCell>
                        <TableCell className="text-right">{r.instalados}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Linha 5 - Cancelamentos por motivo */}
          <Card>
            <CardHeader><CardTitle className="text-base">Cancelamentos por motivo</CardTitle></CardHeader>
            <CardContent style={{ height: Math.max(220, relatorio.cancelamentosPorMotivo.length * 36 + 60) }}>
              {relatorio.cancelamentosPorMotivo.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Sem cancelamentos no período.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.cancelamentosPorMotivo} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="motivo" width={200} />
                    <Tooltip />
                    <Bar dataKey="total" name="Cancelamentos" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ titulo, total, mediaDia, mediaSemana, accent }: { titulo: string; total: number; mediaDia: number; mediaSemana: number; accent?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{titulo}</CardTitle></CardHeader>
      <CardContent>
        <div className={`text-4xl font-bold ${accent || ''}`}>{total.toLocaleString('pt-BR')}</div>
        <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
          <div>Média/dia: <span className="font-medium text-foreground">{fmtNum(mediaDia)}</span></div>
          <div>Média/semana: <span className="font-medium text-foreground">{fmtNum(mediaSemana)}</span></div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${highlight ? 'pt-2 border-t font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
