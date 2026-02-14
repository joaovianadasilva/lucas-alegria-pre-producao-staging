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
import { Pencil, Plus, Calendar } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';

interface Adicional {
  id: string;
  codigo: string;
  nome: string;
  valor: number;
  ativo: boolean;
  requer_agendamento: boolean;
}

export default function ConfigurarAdicionais() {
  const { provedorAtivo } = useAuth();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ codigo: '', nome: '', valor: '', requer_agendamento: false });

  const { data: adicionais, isLoading } = useQuery({
    queryKey: ['catalogo-adicionais-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-catalog', {
        body: { action: 'listAllAdicionais', provedorId: provedorAtivo?.id },
      });
      if (error) throw error;
      return data.addOns as Adicional[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('manage-catalog', {
        body: {
          action: editingId ? 'updateAddOn' : 'createAddOn',
          provedorId: provedorAtivo?.id,
          addOnId: editingId || undefined,
          codigo: formData.codigo,
          nome: formData.nome,
          valor: parseFloat(formData.valor),
          requer_agendamento: formData.requer_agendamento,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo-adicionais-admin'] });
      queryClient.invalidateQueries({ queryKey: ['catalogo-adicionais'] });
      toast.success(editingId ? 'Adicional atualizado!' : 'Adicional criado!');
      resetForm();
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, ativo }: { itemId: string; ativo: boolean }) => {
      const { error } = await supabase.functions.invoke('manage-catalog', {
        body: { action: 'toggleStatus', provedorId: provedorAtivo?.id, tabela: 'catalogo_adicionais', itemId, ativo },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo-adicionais-admin'] });
      queryClient.invalidateQueries({ queryKey: ['catalogo-adicionais'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const resetForm = () => { setFormData({ codigo: '', nome: '', valor: '', requer_agendamento: false }); setEditingId(null); };

  const handleEdit = (adicional: Adicional) => {
    setEditingId(adicional.id);
    setFormData({ codigo: adicional.codigo, nome: adicional.nome, valor: adicional.valor.toString(), requer_agendamento: adicional.requer_agendamento });
  };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); saveMutation.mutate(); };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurar Adicionais</h2>
        <p className="text-muted-foreground">Gerencie os adicionais disponíveis no catálogo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? 'Editar Adicional' : 'Adicionar Novo Adicional'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="valor">Valor</Label>
                <Input id="valor" type="number" step="0.01" value={formData.valor} onChange={(e) => setFormData({ ...formData, valor: e.target.value })} required />
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center space-x-2">
                  <Checkbox id="requer_agendamento" checked={formData.requer_agendamento} onCheckedChange={(checked) => setFormData({ ...formData, requer_agendamento: checked === true })} />
                  <Label htmlFor="requer_agendamento" className="cursor-pointer flex items-center gap-1">
                    <Calendar className="h-4 w-4" /> Requer Agendamento
                  </Label>
                </div>
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
        <CardHeader><CardTitle>Adicionais Cadastrados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Requer Agenda</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adicionais?.map((adicional) => (
                <TableRow key={adicional.id} className={!adicional.ativo ? 'opacity-50' : ''}>
                  <TableCell>{adicional.codigo}</TableCell>
                  <TableCell>{adicional.nome}</TableCell>
                  <TableCell>R$ {adicional.valor.toFixed(2)}</TableCell>
                  <TableCell>
                    {adicional.requer_agendamento ? (
                      <span className="inline-flex items-center gap-1 text-primary"><Calendar className="h-4 w-4" /> Sim</span>
                    ) : (
                      <span className="text-muted-foreground">Não</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={adicional.ativo}
                      onCheckedChange={(checked) => toggleMutation.mutate({ itemId: adicional.id, ativo: checked })}
                      disabled={toggleMutation.isPending}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(adicional)}>
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
