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
import { Filter, Banknote, Download, Eye } from 'lucide-react';
import { ContractDetailsDialog, ContratoCompleto } from '@/components/ContractDetailsDialog';
import { toast } from 'sonner';
import { formatLocalDate, toISODateString } from '@/lib/dateUtils';

interface Provedor { id: string; nome: string }
type Preset = 'hoje' | '7d' | 'mes_atual' | 'mes_anterior' | 'ano' | 'custom';

const fmtBRL = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

interface ContratoLinha {
  contrato_id: string;
  provedor_id: string;
  codigo_contrato?: string;
  codigo_cliente?: string;
  nome_completo?: string;
  plano_nome?: string;
  valor_total: number;
  created_at?: string;
  data_ativacao?: string;
  data_recebimento?: string;
  data_reembolso?: string;
  data_cancelamento?: string;
  recebimento_efetivado: boolean;
  reembolso_efetivado: boolean;
  reembolsavel: boolean;
  status_recebimento?: 'recebido' | 'elegivel' | 'pendente';
  status_reembolso?: 'pago' | 'pendente';
}

interface Relatorio {
  kpis: {
    contasAReceber: number;
    receitaRecebida: number;
    reembolsosAPagar: number;
    reembolsosPagos: number;
    despesasPagas: number;
    fluxoLiquido: number;
  };
  porProvedor: {
    provedor_id: string;
    contasAReceber: number;
    receitaRecebida: number;
    reembolsosAPagar: number;
    reembolsosPagos: number;
    fluxoLiquido: number;
  }[];
  contratosVendidos: ContratoLinha[];
  contratosReembolsaveis: ContratoLinha[];
  contratosRecebidos: ContratoLinha[];
  contratosReembolsados: ContratoLinha[];
}

const PAGE_SIZE = 20;

export default function RelatorioCaixa() {
  const [provedorIds, setProvedorIds] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>('mes_atual');
  const initial = getPresetRange('mes_atual');
  const [dataInicio, setDataInicio] = useState(initial.ini);
  const [dataFim, setDataFim] = useState(initial.fim);
  const [applied, setApplied] = useState({
    provedorIds: [] as string[], dataInicio: initial.ini, dataFim: initial.fim, key: 0,
  });

  const qc = useQueryClient();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [contractDetails, setContractDetails] = useState<ContratoCompleto | null>(null);

  const openDetails = async (contratoId: string, provedorId: string) => {
    if (!contratoId) return;
    setDetailsOpen(true);
    setLoadingDetails(true);
    setContractDetails(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-contracts', {
        body: { action: 'getContract', provedorId, contratoId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro');
      setContractDetails(data.contrato);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
      setDetailsOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

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
    queryKey: ['central-relatorio-caixa', applied],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('central-operacional', {
        body: {
          action: 'relatorioCaixa',
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
  };

  const toggleProv = (id: string) =>
    setProvedorIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const k = relatorio?.kpis;
  const onUpdated = () => qc.invalidateQueries({ queryKey: ['central-relatorio-caixa'] });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Banknote className="h-7 w-7" />
        <div>
          <h1 className="text-3xl font-bold">Relatório de Caixa</h1>
          <p className="text-muted-foreground">Entradas, saídas, recebíveis e reembolsos do período.</p>
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
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <KpiCard titulo="Contas a Receber" valor={fmtBRL(k!.contasAReceber)} accent="text-indigo-600" sub="Faturamento (regras de receita)" />
            <KpiCard titulo="Receita Recebida" valor={fmtBRL(k!.receitaRecebida)} accent="text-emerald-600" sub="Recebimentos efetivados" />
            <KpiCard titulo="Reembolsos a Pagar" valor={fmtBRL(k!.reembolsosAPagar)} accent="text-amber-600" sub="Cancelados elegíveis" />
            <KpiCard titulo="Reembolsos Pagos" valor={fmtBRL(k!.reembolsosPagos)} accent="text-rose-600" sub="Reembolsos efetivados" />
            <KpiCard titulo="Despesas Pagas" valor={fmtBRL(k!.despesasPagas)} sub="Em breve" />
            <KpiCard titulo="Fluxo de Caixa Líquido" valor={fmtBRL(k!.fluxoLiquido)} accent={k!.fluxoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'} sub="Recebido − Reembolsado − Despesas" />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Caixa por Provedor</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Provedor</TableHead>
                  <TableHead className="text-right">Contas a Receber</TableHead>
                  <TableHead className="text-right">Receita Recebida</TableHead>
                  <TableHead className="text-right">Reembolsos a Pagar</TableHead>
                  <TableHead className="text-right">Reembolsos Pagos</TableHead>
                  <TableHead className="text-right">Fluxo Líquido</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {relatorio.porProvedor.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">Sem dados.</TableCell></TableRow>
                  ) : relatorio.porProvedor.map(p => (
                    <TableRow key={p.provedor_id}>
                      <TableCell className="font-medium">{provedorMap.get(p.provedor_id) || p.provedor_id}</TableCell>
                      <TableCell className="text-right">{fmtBRL(p.contasAReceber)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(p.receitaRecebida)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(p.reembolsosAPagar)}</TableCell>
                      <TableCell className="text-right">{fmtBRL(p.reembolsosPagos)}</TableCell>
                      <TableCell className={`text-right font-semibold ${p.fluxoLiquido >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtBRL(p.fluxoLiquido)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Tabs defaultValue="vendidos">
            <TabsList className="mb-2">
              <TabsTrigger value="vendidos">Contratos vendidos ({relatorio.contratosVendidos.length})</TabsTrigger>
              <TabsTrigger value="reembolsaveis">Contratos reembolsáveis ({relatorio.contratosReembolsaveis.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="vendidos">
              <ContratosTabela
                titulo="Contratos vendidos no período"
                rows={relatorio.contratosVendidos}
                provedorMap={provedorMap}
                dateField="created_at"
                dateLabel="Cadastro"
                extraColumns={[
                  { header: 'Recebimento', render: r => statusBadge(r.status_recebimento) },
                ]}
                onRowClick={openDetails}
                filename="contratos-vendidos"
              />
            </TabsContent>
            <TabsContent value="reembolsaveis">
              <ContratosTabela
                titulo="Contratos reembolsáveis no período"
                rows={relatorio.contratosReembolsaveis}
                provedorMap={provedorMap}
                dateField="data_cancelamento"
                dateLabel="Cancelamento"
                extraColumns={[
                  { header: 'Reembolso', render: r => r.status_reembolso === 'pago'
                    ? <Badge variant="default" className="bg-emerald-600">Pago</Badge>
                    : <Badge variant="outline">Pendente</Badge> },
                ]}
                onRowClick={openDetails}
                filename="contratos-reembolsaveis"
              />
            </TabsContent>
          </Tabs>

          <Tabs defaultValue="recebidos">
            <TabsList className="mb-2">
              <TabsTrigger value="recebidos">Contratos recebidos ({relatorio.contratosRecebidos.length})</TabsTrigger>
              <TabsTrigger value="reembolsados">Contratos reembolsados ({relatorio.contratosReembolsados.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="recebidos">
              <ContratosTabela
                titulo="Contratos Recebidos no período"
                rows={relatorio.contratosRecebidos}
                provedorMap={provedorMap}
                dateField="data_recebimento"
                dateLabel="Recebimento"
                onRowClick={openDetails}
                filename="contratos-recebidos"
              />
            </TabsContent>
            <TabsContent value="reembolsados">
              <ContratosTabela
                titulo="Contratos Reembolsados no período"
                rows={relatorio.contratosReembolsados}
                provedorMap={provedorMap}
                dateField="data_reembolso"
                dateLabel="Reembolso"
                onRowClick={openDetails}
                filename="contratos-reembolsados"
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      <ContractDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        contract={contractDetails}
        loading={loadingDetails}
        onContractUpdated={onUpdated}
      />
    </div>
  );
}

function statusBadge(s?: string) {
  if (s === 'recebido') return <Badge className="bg-emerald-600">Recebido</Badge>;
  if (s === 'pendente') return <Badge variant="outline" className="border-amber-500 text-amber-700">Pendente</Badge>;
  return <Badge variant="secondary">Elegível</Badge>;
}

function KpiCard({ titulo, valor, sub, accent }: { titulo: string; valor: string; sub?: string; accent?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{titulo}</CardTitle></CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${accent || ''}`}>{valor}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

interface ExtraColumn {
  header: string;
  render: (r: ContratoLinha) => React.ReactNode;
}

function ContratosTabela({
  titulo, rows, provedorMap, dateField, dateLabel, extraColumns, onRowClick, filename,
}: {
  titulo: string;
  rows: ContratoLinha[];
  provedorMap: Map<string, string>;
  dateField: keyof ContratoLinha;
  dateLabel: string;
  extraColumns?: ExtraColumn[];
  onRowClick: (id: string, prov: string) => void;
  filename: string;
}) {
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState('');

  const filtered = useMemo(() => {
    if (!busca.trim()) return rows;
    const s = busca.toLowerCase();
    return rows.filter(r =>
      (r.nome_completo || '').toLowerCase().includes(s) ||
      (r.codigo_contrato || '').toLowerCase().includes(s) ||
      (r.codigo_cliente || '').toLowerCase().includes(s)
    );
  }, [rows, busca]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    if (!filtered.length) { toast.error('Sem linhas para exportar'); return; }
    const headers = ['Contrato', 'Cliente', 'Provedor', dateLabel, 'Plano', 'Valor', ...(extraColumns?.map(c => c.header) || [])];
    const lines = [headers.join(';')];
    for (const r of filtered) {
      const dv = (r[dateField] as string) || '';
      const cells = [
        r.codigo_contrato || '',
        (r.nome_completo || '').replace(/;/g, ','),
        (provedorMap.get(r.provedor_id) || r.provedor_id).replace(/;/g, ','),
        dv ? formatLocalDate(dv) : '',
        (r.plano_nome || '').replace(/;/g, ','),
        Number(r.valor_total || 0).toFixed(2),
      ];
      if (extraColumns) {
        for (const c of extraColumns) {
          if (c.header === 'Recebimento') cells.push(r.status_recebimento || '');
          else if (c.header === 'Reembolso') cells.push(r.status_reembolso || '');
          else cells.push('');
        }
      }
      lines.push(cells.join(';'));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const totalCol = 6 + (extraColumns?.length || 0) + 1;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-base">{titulo} <span className="text-muted-foreground text-sm">({rows.length})</span></CardTitle>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Buscar..."
            value={busca}
            onChange={e => { setBusca(e.target.value); setPage(1); }}
            className="h-9 w-48"
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
            <TableHead>{dateLabel}</TableHead>
            <TableHead>Plano</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            {extraColumns?.map(c => <TableHead key={c.header}>{c.header}</TableHead>)}
            <TableHead className="text-right w-[60px]">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow><TableCell colSpan={totalCol} className="text-center text-muted-foreground py-6">Sem registros.</TableCell></TableRow>
            ) : paged.map(r => {
              const dv = (r[dateField] as string) || '';
              return (
                <TableRow
                  key={r.contrato_id}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => onRowClick(r.contrato_id, r.provedor_id)}
                >
                  <TableCell className="font-mono text-xs">{r.codigo_contrato || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={r.nome_completo}>{r.nome_completo}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{provedorMap.get(r.provedor_id) || '—'}</TableCell>
                  <TableCell>{dv ? formatLocalDate(dv) : '—'}</TableCell>
                  <TableCell className="max-w-[160px] truncate" title={r.plano_nome}>{r.plano_nome}</TableCell>
                  <TableCell className="text-right">{fmtBRL(r.valor_total)}</TableCell>
                  {extraColumns?.map(c => <TableCell key={c.header}>{c.render(r)}</TableCell>)}
                  <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                    <Button
                      variant="ghost" size="icon" title="Ver detalhes"
                      onClick={() => onRowClick(r.contrato_id, r.provedor_id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
      <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
        <span className="text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'linha' : 'linhas'} • página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      </div>
    </Card>
  );
}
