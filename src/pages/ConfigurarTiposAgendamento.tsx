import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TipoAgendamento {
  id: string;
  codigo: string;
  nome: string;
  ativo: boolean;
}

export default function ConfigurarTiposAgendamento() {
  const { provedorAtivo } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ codigo: '', nome: '' });

  const { data: tipos, isLoading } = useQuery({
    queryKey: ['catalogo-tipos-agendamento-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-catalog', {
        body: { action: 'listAllTiposAgendamento', provedorId: provedorAtivo?.id },
      });
      if (error) throw error;
      return data.tipos as TipoAgendamento[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('manage-catalog', {
        body: {
          action: editingId ? 'updateTipoAgendamento' : 'addTipoAgendamento',
          provedorId: provedorAtivo?.id,
          tipoId: editingId || undefined,
          codigo: formData.codigo,
          nome: formData.nome,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo-tipos-agendamento-admin'] });
      toast.success(editingId ? 'Tipo atualizado!' : 'Tipo criado!');
      resetForm();
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, ativo }: { itemId: string; ativo: boolean }) => {
      const { error } = await supabase.functions.invoke('manage-catalog', {
        body: { action: 'toggleStatus', provedorId: provedorAtivo?.id, tabela: 'catalogo_tipos_agendamento', itemId, ativo },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo-tipos-agendamento-admin'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const resetForm = () => { setFormData({ codigo: '', nome: '' }); setEditingId(null); };

  const handleEdit = (tipo: TipoAgendamento) => {
    setEditingId(tipo.id);
    setFormData({ codigo: tipo.codigo, nome: tipo.nome });
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(); };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurar Tipos de Agendamento</h2>
        <p className="text-muted-foreground">Gerencie os tipos de agendamento disponíveis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Editar Tipo' : 'Adicionar Novo Tipo'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saveMutation.isPending}>
                <Plus className="mr-2 h-4 w-4" />{editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tipos Cadastrados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tipos?.map((tipo) => (
                <TableRow key={tipo.id} className={!tipo.ativo ? 'opacity-50' : ''}>
                  <TableCell>{tipo.codigo}</TableCell>
                  <TableCell>{tipo.nome}</TableCell>
                  <TableCell>
                    <Switch
                      checked={tipo.ativo}
                      onCheckedChange={(checked) => toggleMutation.mutate({ itemId: tipo.id, ativo: checked })}
                      disabled={toggleMutation.isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(tipo)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
