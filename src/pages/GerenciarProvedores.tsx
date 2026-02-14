import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Power, Building2 } from 'lucide-react';

interface Provedor {
  id: string;
  nome: string;
  slug: string;
  logo_url: string | null;
  ativo: boolean;
}

export default function GerenciarProvedores() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', slug: '', logoUrl: '' });

  const { data: provedores, isLoading } = useQuery({
    queryKey: ['provedores-admin'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-provedores', {
        body: { action: 'listProvedores' },
      });
      if (error) throw error;
      return data.provedores as Provedor[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-provedores', {
        body: { action: 'createProvedor', nome: formData.nome, slug: formData.slug, logoUrl: formData.logoUrl || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provedores-admin'] });
      toast.success('Provedor criado!');
      setFormData({ nome: '', slug: '', logoUrl: '' });
      setIsDialogOpen(false);
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('manage-provedores', {
        body: { action: 'toggleProvedorStatus', provedorId: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provedores-admin'] });
      toast.success('Status atualizado!');
    },
    onError: (e: any) => toast.error('Erro: ' + e.message),
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciar Provedores</h2>
          <p className="text-muted-foreground">Administre os provedores do sistema</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Novo Provedor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar Provedor</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} required placeholder="ex: meu-provedor" />
              </div>
              <div>
                <Label>URL da Logo</Label>
                <Input value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} placeholder="https://exemplo.com/logo.png" />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Provedor'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Provedores</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {provedores?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="flex items-center gap-2">
                    {p.logo_url ? <img src={p.logo_url} className="h-6" alt="" /> : <Building2 className="h-5 w-5 text-muted-foreground" />}
                    {p.nome}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{p.slug}</TableCell>
                  <TableCell><Badge variant={p.ativo ? 'default' : 'secondary'}>{p.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate(p.id)} disabled={toggleMutation.isPending}>
                      <Power className="h-4 w-4" />
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
