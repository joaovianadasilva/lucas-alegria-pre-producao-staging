import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Filter, Wallet, Download, Eye } from 'lucide-react';
import { ContractDetailsDialog, ContratoCompleto } from '@/components/ContractDetailsDialog';
import { toast } from 'sonner';
import { formatLocalDate, toISODateString } from '@/lib/dateUtils';
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar,
} from 'recharts';

interface Provedor { id: string; nome: string }
type Preset = 'hoje' | '7d' | 'mes_atual' | 'mes_anterior' | 'ano' | 'custom';

const fmtBRL = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = (n: number, d = 0) => (n || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });

function getPresetRange(p: Preset): { ini: string; fim: string } {
  const today = new Date();
  const t = (d: Date) => toISODateString(d);
  if (p === 'hoje') return { ini: t(today), fim: t(today) };
  if (p === '7d') { const d = new Date(today); d.setDate(d.getDate() - 6); return { ini: t(d), fim: t(today) }; }
  if (p === 'mes_atual') { const ini = new Date(today.getFullYear(), today.getMonth(), 1); return { ini: t(ini), fim: t(today) }; }
  if (p === 'mes_anterior') {
    const ini = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const fim = new Date(today.getFullYear(), today.getMonth(), 0);
    return { ini: t(ini), fim: t(fim) };
  }
  if (p === 'ano') { const ini = new Date(today.getFullYear(), 0, 1); return { ini: t(ini), fim: t(today) }; }
  return { ini: t(today), fim: t(today) };
}

interface Relatorio {
  kpis: {
    contratosCadastrados: number; valorContratosCadastrados: number;
    contratosInstalados: number; valorContratosInstalados: number;
    faturamentoTotal: number; comissaoTotal: number;
    contratosComBase: number; ticketMedio: number; percentualComissao: number;
  };
  serieTemporal: { data: string; faturamento: number; comissao: number }[];
  porRegraReceita: { id: string; nome: string; contratos: number; base: number }[];
  porReguaComissao: { id: string; nome: string; regra_receita_nome: string; base: number; comissao: number; aplicacoes: number; faixas_acionadas?: string[] }[];
  detalhado: any[];
  totalRegrasReceita: number;
  totalReguasComissao: number;
  avisos?: string[];
}

const PAGE_SIZE = 20;

export default function RelatorioVisaoGeralReceita() {
  const [provedorIds, setProvedorIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>('mes_atual');
  const initial = getPresetRange('mes_atual');
  const [dataInicio, setDataInicio] = useState(initial.ini);
  const [dataFim, setDataFim] = useState(initial.fim);
  const [applied, setApplied] = useState({ provedorIds: [] as string[], dataInicio: initial.ini, dataFim: initial.fim, key: 0 });
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');

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
    queryKey: ['central-relatorio-receita', applied],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('central-operacional', {
        body: {
          action: 'relatorioReceita',
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
      setDataInicio(r.ini); setDataFim(r.fim);
    }
  };

  const aplicar = () => {
    if (!dataInicio || !dataFim) { toast.error('Selecione um período'); return; }
    if (dataInicio > dataFim) { toast.error('Data inicial maior que final'); return; }
    setApplied({ provedorIds, dataInicio, dataFim, key: applied.key + 1 });
    setPage(1);
  };

  const toggleProv = (id: string) =>
    setProvedorIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const k = relatorio?.kpis;

  const detalhadoFiltrado = useMemo(() => {
    const rows = relatorio?.detalhado || [];
    if (!busca.trim()) return rows;
    const s = busca.toLowerCase();
    return rows.filter((r: any) =>
      (r.nome_completo || '').toLowerCase().includes(s) ||
      (r.codigo_contrato || '').toLowerCase().includes(s) ||
      (r.codigo_cliente || '').toLowerCase().includes(s)
    );
  }, [relatorio, busca]);

  const totalPages = Math.max(1, Math.ceil(detalhadoFiltrado.length / PAGE_SIZE));
  const paged = detalhadoFiltrado.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const rows = detalhadoFiltrado;
    if (!rows.length) { toast.error('Sem linhas para exportar'); return; }
    const header = ['Contrato', 'Cliente', 'Provedor', 'Data evento', 'Plano', 'Valor contrato', 'Regra de receita', 'Base gerada', 'Comissão total'];
    const lines = [header.join(';')];
    for (const r of rows) {
      lines.push([
        r.codigo_contrato || '',
        (r.nome_completo || '').replace(/;/g, ','),
        provedorMap.get(r.provedor_id) || r.provedor_id,
        r.data_evento,
        (r.plano_nome || '').replace(/;/g, ','),
        Number(r.valor_total_contrato || 0).toFixed(2),
        (r.regra_receita_nome || '').replace(/;/g, ','),
        Number(r.base_gerada || 0).toFixed(2),
        Number(r.comissao_total || 0).toFixed(2),
      ].join(';'));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `relatorio-receita-${applied.dataInicio}-${applied.dataFim}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-7 w-7" />
        <div>
          <h1 className="text-3xl font-bold">Visão Geral de Receita</h1>
          <p className="text-muted-foreground">Faturamento gerado pelas Regras de Receita e comissão calculada pelas Réguas ativas.</p>
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
              <Button key={v} size="sm" variant={preset === v ? 'default' : 'outline'} onClick={() => handlePreset(v)}>{lbl}</Button>
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
          {/* Contexto de vendas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <KpiCard
              titulo="Contratos vendidos no período"
              valor={fmtNum(k!.contratosCadastrados)}
              sub={fmtBRL(k!.valorContratosCadastrados)}
              accent="text-blue-600"
            />
            <KpiCard
              titulo="Contratos instalados no período"
              valor={fmtNum(k!.contratosInstalados)}
              sub={fmtBRL(k!.valorContratosInstalados)}
              accent="text-emerald-600"
            />
          </div>

          {/* Receita & comissão */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <KpiCard titulo="Vendas consideradas" valor={fmtNum(k!.contratosComBase)} sub="Base para cálculo da comissão" accent="text-indigo-600" />
            <KpiCard titulo="Faturamento (regras de receita)" valor={fmtBRL(k!.faturamentoTotal)} sub={`${k!.contratosComBase} contratos atingidos`} accent="text-primary" />
            <KpiCard titulo="Comissão total" valor={fmtBRL(k!.comissaoTotal)} sub={`${fmtNum(k!.percentualComissao, 2)}% do faturamento`} accent="text-amber-600" />
            <KpiCard titulo="Ticket médio" valor={fmtBRL(k!.ticketMedio)} sub="Faturamento ÷ contratos" />
            <KpiCard titulo="Regras ativas" valor={`${relatorio.totalRegrasReceita} / ${relatorio.totalReguasComissao}`} sub="Receita / Comissão" />
          </div>

          {/* Gráfico temporal */}
          <Card>
            <CardHeader><CardTitle className="text-base">Faturamento × Comissão por dia</CardTitle></CardHeader>
            <CardContent style={{ height: 320 }}>
              {relatorio.serieTemporal.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Sem dados no período.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={relatorio.serieTemporal} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" tickFormatter={d => formatLocalDate(d, { day: '2-digit', month: '2-digit' })} />
                    <YAxis tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                    <Tooltip labelFormatter={d => formatLocalDate(String(d))} formatter={(v: any) => fmtBRL(Number(v))} />
                    <Legend />
                    <Bar dataKey="faturamento" name="Faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="comissao" name="Comissão" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Quebras */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Por Regra de Receita</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Regra</TableHead>
                    <TableHead className="text-right">Contratos</TableHead>
                    <TableHead className="text-right">Base gerada</TableHead>
                    <TableHead className="text-right">% total</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {relatorio.porRegraReceita.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">—</TableCell></TableRow>
                    ) : relatorio.porRegraReceita.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="text-right">{r.contratos}</TableCell>
                        <TableCell className="text-right">{fmtBRL(r.base)}</TableCell>
                        <TableCell className="text-right">{k!.faturamentoTotal > 0 ? `${((r.base / k!.faturamentoTotal) * 100).toFixed(1)}%` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Por Régua de Comissão</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Régua</TableHead>
                    <TableHead>Regra de receita</TableHead>
                    <TableHead>Faixa(s) acionada(s)</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {relatorio.porReguaComissao.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">—</TableCell></TableRow>
                    ) : relatorio.porReguaComissao.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="text-muted-foreground">{r.regra_receita_nome}</TableCell>
                        <TableCell className="text-xs">
                          {r.faixas_acionadas && r.faixas_acionadas.length > 0
                            ? r.faixas_acionadas.map((f, i) => <Badge key={i} variant="outline" className="mr-1 mb-1">{f}</Badge>)
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right">{fmtBRL(r.base)}</TableCell>
                        <TableCell className="text-right font-semibold">{fmtBRL(r.comissao)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Avisos de inconsistência */}
          {relatorio.avisos && relatorio.avisos.length > 0 && (
            <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20">
              <CardHeader className="pb-2"><CardTitle className="text-base text-amber-700 dark:text-amber-400">Avisos de configuração</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {relatorio.avisos.map((a, i) => <div key={i}>• {a}</div>)}
              </CardContent>
            </Card>
          )}

          {/* Detalhado */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base">Detalhado por contrato × regra</CardTitle>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Buscar por código ou cliente..."
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPage(1); }}
                  className="h-9 w-64"
                />
                <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
                  <Download className="h-4 w-4" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Data evento</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Valor contrato</TableHead>
                  <TableHead>Regra de receita</TableHead>
                  <TableHead className="text-right">Base gerada</TableHead>
                  <TableHead>Faixa</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {paged.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-6">Sem registros.</TableCell></TableRow>
                  ) : paged.map((r: any, idx: number) => (
                    <TableRow key={`${r.contrato_id}-${r.regra_receita_id}-${idx}`}>
                      <TableCell className="font-mono text-xs">{r.codigo_contrato || '—'}</TableCell>
                      <TableCell className="max-w-[220px] truncate" title={r.nome_completo}>{r.nome_completo}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{provedorMap.get(r.provedor_id) || '—'}</TableCell>
                      <TableCell>{formatLocalDate(r.data_evento)}</TableCell>
                      <TableCell className="max-w-[180px] truncate" title={r.plano_nome}>{r.plano_nome}</TableCell>
                      <TableCell className="text-right">{fmtBRL(r.valor_total_contrato)}</TableCell>
                      <TableCell className="text-xs">{r.regra_receita_nome}</TableCell>
                      <TableCell className="text-right">{fmtBRL(r.base_gerada)}</TableCell>
                      <TableCell className="text-xs">
                        {(r.comissoes || []).map((c: any, i: number) => c.faixa_label && c.faixa_label !== '—'
                          ? <Badge key={i} variant="outline" className="mr-1">{c.faixa_label}</Badge>
                          : null)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{fmtBRL(r.comissao_total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
            <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
              <span className="text-muted-foreground">
                {detalhadoFiltrado.length} {detalhadoFiltrado.length === 1 ? 'linha' : 'linhas'} • página {page} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ titulo, valor, sub, accent }: { titulo: string; valor: string; sub?: string; accent?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{titulo}</CardTitle></CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${accent || ''}`}>{valor}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
