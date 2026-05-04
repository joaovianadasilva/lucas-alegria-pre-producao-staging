import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Filter, CheckCircle2, Eye, Download } from 'lucide-react';
import { ContractDetailsDialog, ContratoCompleto } from '@/components/ContractDetailsDialog';
import { formatLocalDate } from '@/lib/dateUtils';

interface Props {
  tipo: 'recebimento' | 'reembolso';
}

interface Provedor { id: string; nome: string }
interface Contrato {
  id: string; provedor_id: string; codigo_contrato?: string; codigo_cliente?: string;
  nome_completo: string; cpf?: string; plano_nome: string; plano_valor: number;
  data_ativacao?: string; data_cancelamento?: string; status_contrato?: string;
  data_pgto_primeira_mensalidade?: string; data_pgto_segunda_mensalidade?: string; data_pgto_terceira_mensalidade?: string;
  data_recebimento?: string; data_reembolso?: string;
  reembolsavel?: boolean;
}

const fmtBRL = (n: number) => n?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function OperacionalContratos({ tipo }: Props) {
  const qc = useQueryClient();
  const [provedorIds, setProvedorIds] = useState<string[]>([]);
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<'elegiveis' | 'processados'>('elegiveis');
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; contrato?: Contrato; data: string }>({ open: false, data: new Date().toISOString().slice(0, 10) });

  // Detalhes
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

  const { data: contratos, isLoading } = useQuery({
    queryKey: ['central-contratos', tipo, aba, provedorIds, busca],
    queryFn: async () => {
      const action = aba === 'elegiveis' ? 'listElegiveis' : 'listProcessados';
      const { data, error } = await supabase.functions.invoke('central-operacional', {
        body: { action, tipo, provedorIds: provedorIds.length ? provedorIds : undefined, busca: busca || undefined },
      });
      if (error) throw error;
      return data.contratos as Contrato[];
    },
  });

  const confirmar = useMutation({
    mutationFn: async ({ contratoId, data }: { contratoId: string; data: string }) => {
      const action = tipo === 'recebimento' ? 'confirmarRecebimento' : 'confirmarReembolso';
      const { data: resp, error } = await supabase.functions.invoke('central-operacional', { body: { action, contratoId, data } });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);
    },
    onSuccess: () => {
      toast.success(tipo === 'recebimento' ? 'Recebimento confirmado!' : 'Reembolso confirmado!');
      qc.invalidateQueries({ queryKey: ['central-contratos'] });
      setConfirmDialog({ open: false, data: new Date().toISOString().slice(0, 10) });
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const titulo = tipo === 'recebimento' ? 'Recebimentos' : 'Reembolsos';
  const dataLabelCol = tipo === 'recebimento' ? 'Data ativação' : 'Data cancelamento';
  const dataDial = tipo === 'recebimento' ? 'Data do recebimento' : 'Data do reembolso';

  const toggleProv = (id: string) => {
    setProvedorIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const openDetails = async (c: Contrato) => {
    setDetailsOpen(true);
    setLoadingDetails(true);
    setContractDetails(null);
    try {
      const { data, error } = await supabase.functions.invoke('manage-contracts', {
        body: { action: 'getContract', provedorId: c.provedor_id, contratoId: c.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao carregar detalhes');
      setContractDetails(data.contrato);
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
      setDetailsOpen(false);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleContractUpdated = () => {
    qc.invalidateQueries({ queryKey: ['central-contratos'] });
  };

  const exportCSV = () => {
    const rows = contratos || [];
    if (!rows.length) { toast.info('Nada para exportar'); return; }
    const isProc = aba === 'processados';
    const dataCol = tipo === 'recebimento' ? 'data_ativacao' : 'data_cancelamento';
    const procCol = tipo === 'recebimento' ? 'data_recebimento' : 'data_reembolso';
    const cols = ['provedor', 'codigo_contrato', 'codigo_cliente', 'nome_completo', 'cpf', 'plano_nome', 'plano_valor', 'status_contrato', dataCol];
    if (isProc) cols.push(procCol);
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
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${tipo}s_${aba}_${stamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} contrato(s) exportado(s)`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{titulo}</h1>
          <p className="text-muted-foreground">Controle operacional entre provedores.</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={!contratos?.length} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
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
          <div className="flex-1 min-w-[240px]">
            <Label>Buscar</Label>
            <Input placeholder="Nome, CPF, código contrato/cliente" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Tabs value={aba} onValueChange={v => setAba(v as any)}>
        <TabsList>
          <TabsTrigger value="elegiveis">Elegíveis</TabsTrigger>
          <TabsTrigger value="processados">Já {tipo === 'recebimento' ? 'recebidos' : 'reembolsados'}</TabsTrigger>
        </TabsList>

        <TabsContent value={aba}>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provedor</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>{dataLabelCol}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                  ) : (contratos || []).length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum contrato encontrado.</TableCell></TableRow>
                  ) : (contratos || []).map(c => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetails(c)}>
                      <TableCell>{provedorMap.get(c.provedor_id) || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{c.codigo_contrato || c.id.slice(0, 8)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{c.nome_completo}</div>
                        <div className="text-xs text-muted-foreground">{c.cpf}</div>
                      </TableCell>
                      <TableCell>{c.plano_nome}</TableCell>
                      <TableCell>{fmtBRL(Number(c.plano_valor))}</TableCell>
                      <TableCell>{formatLocalDate(tipo === 'recebimento' ? c.data_ativacao : c.data_cancelamento) || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{c.status_contrato || '—'}</Badge></TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDetails(c)} title="Ver detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {aba === 'elegiveis' ? (
                            <Button size="sm" onClick={() => setConfirmDialog({ open: true, contrato: c, data: new Date().toISOString().slice(0, 10) })}>
                              Confirmar
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                              {formatLocalDate(tipo === 'recebimento' ? c.data_recebimento : c.data_reembolso) || ''}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmDialog.open} onOpenChange={(o) => setConfirmDialog(s => ({ ...s, open: o }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar {tipo === 'recebimento' ? 'recebimento' : 'reembolso'}</DialogTitle>
          </DialogHeader>
          {confirmDialog.contrato && (
            <div className="space-y-3">
              <div className="text-sm">
                <div><span className="text-muted-foreground">Cliente:</span> {confirmDialog.contrato.nome_completo}</div>
                <div><span className="text-muted-foreground">Plano:</span> {confirmDialog.contrato.plano_nome} — {fmtBRL(Number(confirmDialog.contrato.plano_valor))}</div>
              </div>
              <div>
                <Label>{dataDial}</Label>
                <Input type="date" value={confirmDialog.data} onChange={e => setConfirmDialog(s => ({ ...s, data: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(s => ({ ...s, open: false }))}>Cancelar</Button>
            <Button
              disabled={confirmar.isPending}
              onClick={() => confirmDialog.contrato && confirmar.mutate({ contratoId: confirmDialog.contrato.id, data: confirmDialog.data })}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ContractDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        contract={contractDetails}
        loading={loadingDetails}
        onContractUpdated={handleContractUpdated}
      />
    </div>
  );
}
