import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Power, PowerOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import RegraEditorDialog from '@/components/RegraEditorDialog';

type Tipo = 'recebimento' | 'reembolso';
interface Provedor { id: string; nome: string }
interface Regra {
  id: string; nome: string; tipo: Tipo;
  provedor_id: string | null; provedor_ids: string[]; aplica_todos: boolean;
  ativo: boolean; regra: any; prioridade: number;
}

export default function RegrasOperacionais() {
  const [tipo, setTipo] = useState<Tipo>('recebimento');
  const [regras, setRegras] = useState<Regra[]>([]);
  const [provedores, setProvedores] = useState<Provedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Regra | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Regra | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const [regrasResp, provResp] = await Promise.all([
        supabase.functions.invoke('central-operacional', { body: { action: 'listarRegras' } }),
        supabase.functions.invoke('central-operacional', { body: { action: 'listProvedores' } }),
      ]);
      if (regrasResp.error || regrasResp.data?.error) throw new Error(regrasResp.error?.message || regrasResp.data?.error);
      if (provResp.error || provResp.data?.error) throw new Error(provResp.error?.message || provResp.data?.error);
      setRegras(regrasResp.data.regras || []);
      setProvedores(provResp.data.provedores || []);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const toggleAtivo = async (r: Regra) => {
    try {
      const { data, error } = await supabase.functions.invoke('central-operacional', {
        body: { action: 'atualizarRegra', id: r.id, ativo: !r.ativo },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success(r.ativo ? 'Regra desativada' : 'Regra ativada');
      carregar();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      const { data, error } = await supabase.functions.invoke('central-operacional', {
        body: { action: 'excluirRegra', id: confirmDelete.id },
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      toast.success('Regra excluída');
      setConfirmDelete(null);
      carregar();
    } catch (e: any) { toast.error(e.message); }
  };

  const provedorNome = (id: string) => provedores.find(p => p.id === id)?.nome || id.slice(0, 8);

  const renderLista = (t: Tipo) => {
    const list = regras.filter(r => r.tipo === t);
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Regras de {t === 'recebimento' ? 'Recebimento' : 'Reembolso'}</CardTitle>
          <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nova regra</Button>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-muted-foreground">Carregando...</div>}
          {!loading && list.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma regra cadastrada. Sem regras, nenhum contrato será considerado elegível.</div>}
          {!loading && list.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nome}</TableCell>
                    <TableCell>
                      {r.aplica_todos ? (
                        <Badge variant="secondary">Todos os provedores</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(r.provedor_ids || []).slice(0, 3).map(id => <Badge key={id} variant="outline">{provedorNome(id)}</Badge>)}
                          {(r.provedor_ids || []).length > 3 && <Badge variant="outline">+{(r.provedor_ids || []).length - 3}</Badge>}
                          {r.provedor_id && (!r.provedor_ids || r.provedor_ids.length === 0) && <Badge variant="outline">{provedorNome(r.provedor_id)}</Badge>}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{r.ativo ? <Badge>Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => toggleAtivo(r)} title={r.ativo ? 'Desativar' : 'Ativar'}>
                        {r.ativo ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setEditorOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Regras Operacionais</h1>
        <p className="text-sm text-muted-foreground">Configure quando um contrato é elegível para recebimento ou reembolso. Quando há múltiplas regras de um mesmo tipo, basta uma corresponder.</p>
      </div>

      <Tabs value={tipo} onValueChange={(v) => setTipo(v as Tipo)}>
        <TabsList>
          <TabsTrigger value="recebimento">Recebimento</TabsTrigger>
          <TabsTrigger value="reembolso">Reembolso</TabsTrigger>
        </TabsList>
        <TabsContent value="recebimento" className="mt-4">{renderLista('recebimento')}</TabsContent>
        <TabsContent value="reembolso" className="mt-4">{renderLista('reembolso')}</TabsContent>
      </Tabs>

      <RegraEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        tipo={tipo}
        initial={editing}
        provedores={provedores}
        onSaved={carregar}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. A regra "{confirmDelete?.nome}" será removida permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
