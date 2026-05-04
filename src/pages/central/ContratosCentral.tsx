import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ContractDetailsDialog, ContratoCompleto } from '@/components/ContractDetailsDialog';
import { Filter, ChevronLeft, ChevronRight, Eye, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatLocalDate } from '@/lib/dateUtils';

interface Provedor { id: string; nome: string }
interface ContratoRow {
  id: string; provedor_id: string;
  codigo_contrato?: string; codigo_cliente?: string;
  nome_completo: string; cpf?: string; celular?: string; email?: string;
  plano_nome: string; plano_valor: number; valor_total?: number;
  status?: string; status_contrato?: string; tipo_venda?: string;
  created_at: string; data_ativacao?: string; data_cancelamento?: string;
}

const PAGE_SIZE = 20;
const fmtBRL = (n?: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ContratosCentral() {
  const qc = useQueryClient();

  const [pProvedores, setPProvedores] = useState<string[]>([]);
  const [pStatus, setPStatus] = useState('todos');
  const [pStatusContrato, setPStatusContrato] = useState('todos');
  const [pTipoVenda, setPTipoVenda] = useState('todos');
  const [pBusca, setPBusca] = useState('');
  const [pDataInicio, setPDataInicio] = useState('');
  const [pDataFim, setPDataFim] = useState('');

  const [filters, setFilters] = useState<any>(null);
  const [page, setPage] = useState(1);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [contractDetails, setContractDetails] = useState<ContratoCompleto | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  const { data: result, isLoading } = useQuery({
    queryKey: ['central-contratos-list', filters, page],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('central-operacional', {
        body: { action: 'listContratos', ...filters, page, pageSize: PAGE_SIZE },
      });
      if (error) throw error;
      return data as { contratos: ContratoRow[]; total: number };
    },
    enabled: !!filters,
  });

  const apply = () => {
    setFilters({
      provedorIds: pProvedores.length ? pProvedores : undefined,
      status: pStatus !== 'todos' ? pStatus : undefined,
      statusContrato: pStatusContrato !== 'todos' ? pStatusContrato : undefined,
      tipoVenda: pTipoVenda !== 'todos' ? pTipoVenda : undefined,
      busca: pBusca || undefined,
      dataInicio: pDataInicio || undefined,
      dataFim: pDataFim || undefined,
    });
    setPage(1);
  };

  const clear = () => {
    setPProvedores([]); setPStatus('todos'); setPStatusContrato('todos');
    setPTipoVenda('todos'); setPBusca(''); setPDataInicio(''); setPDataFim('');
    setFilters(null); setPage(1);
  };

  const toggleProv = (id: string) =>
    setPProvedores(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const openDetails = async (id: string, provedorId: string) => {
    setDetailsOpen(true);
    setLoadingDetails(true);
    setContractDetails(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-contracts', {
        body: { action: 'getContract', provedorId, contratoId: id },
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

  const exportCSV = () => {
    const rows = result?.contratos || [];
    if (!rows.length) { toast.info('Nada para exportar'); return; }
    const cols = ['provedor', 'codigo_contrato', 'codigo_cliente', 'nome_completo', 'cpf', 'celular', 'email', 'plano_nome', 'plano_valor', 'valor_total', 'status', 'status_contrato', 'tipo_venda', 'created_at', 'data_ativacao', 'data_cancelamento'];
    const csv = [cols.join(',')].concat(
      rows.map(r => cols.map(c => {
        const v = c === 'provedor' ? (provedorMap.get(r.provedor_id) || '') : ((r as any)[c] ?? '');
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `contratos_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const total = result?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Todos os Contratos</h1>
          <p className="text-muted-foreground">Visão consolidada cross-provedor.</p>
        </div>
        {filters && (
          <Button variant="outline" onClick={exportCSV} className="gap-2">
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Provedores</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Filter className="h-4 w-4" />
                    {pProvedores.length ? `${pProvedores.length} selecionado(s)` : 'Todos'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72">
                  <div className="space-y-2 max-h-72 overflow-auto">
                    {(provedores || []).map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox checked={pProvedores.includes(p.id)} onCheckedChange={() => toggleProv(p.id)} />
                        {p.nome}
                      </label>
                    ))}
                    {pProvedores.length > 0 && (
                      <Button variant="ghost" size="sm" onClick={() => setPProvedores([])}>Limpar</Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={pStatus} onValueChange={setPStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status contrato</Label>
              <Select value={pStatusContrato} onValueChange={setPStatusContrato}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de venda</Label>
              <Select value={pTipoVenda} onValueChange={setPTipoVenda}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="nova">Nova</SelectItem>
                  <SelectItem value="upgrade">Upgrade</SelectItem>
                  <SelectItem value="downgrade">Downgrade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Data início</Label>
              <Input type="date" value={pDataInicio} onChange={e => setPDataInicio(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Data fim</Label>
              <Input type="date" value={pDataFim} onChange={e => setPDataFim(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Buscar</Label>
              <Input placeholder="Nome, CPF, código, e-mail, celular" value={pBusca} onChange={e => setPBusca(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={apply}><Filter className="mr-2 h-4 w-4" /> Aplicar Filtros</Button>
            <Button variant="outline" onClick={clear}>Limpar</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Contratos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!filters ? (
            <div className="text-center py-12 text-muted-foreground">Aplique os filtros para visualizar contratos.</div>
          ) : isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : (result?.contratos.length ?? 0) === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum contrato encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Status contrato</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead>Ativação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(result?.contratos || []).map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs">{provedorMap.get(c.provedor_id) || '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{c.codigo_contrato || c.id.slice(0, 8).toUpperCase()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.nome_completo}</div>
                      <div className="text-xs text-muted-foreground">{c.cpf || c.celular}</div>
                    </TableCell>
                    <TableCell>{c.plano_nome}</TableCell>
                    <TableCell>{fmtBRL(Number(c.valor_total || c.plano_valor))}</TableCell>
                    <TableCell><Badge variant="outline">{c.status || '—'}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{c.status_contrato || '—'}</Badge></TableCell>
                    <TableCell className="text-xs">{c.created_at ? formatLocalDate(c.created_at) : '—'}</TableCell>
                    <TableCell className="text-xs">{c.data_ativacao ? formatLocalDate(c.data_ativacao) : '—'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDetails(c.id, c.provedor_id)} title="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {filters && totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">Exibindo {start}–{end} de {total}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Button>
                <span className="text-sm">Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ContractDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        contract={contractDetails}
        loading={loadingDetails}
        onContractUpdated={() => qc.invalidateQueries({ queryKey: ['central-contratos-list'] })}
      />
    </div>
  );
}
