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
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Representante {
  id: string;
  nome: string;
  ativo: boolean;
}

export default function ConfigurarRepresentantes() {
  const { provedorAtivo } = useAuth();
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');

  const { data: representantes, isLoading } = useQuery({
    queryKey: ['catalogo-representantes-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-catalog', {
        body: { action: 'listAllRepresentantes', provedorId: provedorAtivo?.id },
      });
      if (error) throw error;
      return data.data as Representante[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke('manage-catalog', {
        body: { action: 'addRepresentante', provedorId: provedorAtivo?.id, nome },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo-representantes-admin'] });
      toast.success('Representante adicionado!');
      setNome('');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ itemId, ativo }: { itemId: string; ativo: boolean }) => {
      const { error } = await supabase.functions.invoke('manage-catalog', {
        body: { action: 'toggleStatus', provedorId: provedorAtivo?.id, tabela: 'catalogo_representantes', itemId, ativo },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalogo-representantes-admin'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => toast.error('Erro: ' + error.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    addMutation.mutate();
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Configurar Representantes</h2>
        <p className="text-muted-foreground">Gerencie os representantes de vendas</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Adicionar Representante</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome</Label>
                <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" disabled={addMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Representantes Cadastrados</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {representantes?.map((rep) => (
                <TableRow key={rep.id} className={!rep.ativo ? 'opacity-50' : ''}>
                  <TableCell>{rep.nome}</TableCell>
                  <TableCell>
                    <Switch
                      checked={rep.ativo}
                      onCheckedChange={(checked) => toggleMutation.mutate({ itemId: rep.id, ativo: checked })}
                      disabled={toggleMutation.isPending}
                    />
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
