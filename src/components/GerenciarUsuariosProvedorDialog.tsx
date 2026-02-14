import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, UserPlus } from 'lucide-react';

interface Usuario {
  id: string;
  nome: string;
  sobrenome: string;
  email: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provedorId: string;
  provedorNome: string;
}

export default function GerenciarUsuariosProvedorDialog({ open, onOpenChange, provedorId, provedorNome }: Props) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');

  const { data: usuariosVinculados, isLoading: loadingVinculados } = useQuery({
    queryKey: ['usuarios-provedor', provedorId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-provedores', {
        body: { action: 'listUsuariosProvedor', provedorId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.usuarios as Usuario[];
    },
    enabled: open,
  });

  const { data: todosUsuarios, isLoading: loadingTodos } = useQuery({
    queryKey: ['todos-usuarios'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-provedores', {
        body: { action: 'listAllUsers' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.usuarios as Usuario[];
    },
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-provedores', {
        body: { action: 'addUsuarioProvedor', provedorId, userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-provedor', provedorId] });
      toast.success('Usuário vinculado!');
      setSelectedUserId('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('manage-provedores', {
        body: { action: 'removeUsuarioProvedor', provedorId, userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-provedor', provedorId] });
      toast.success('Usuário desvinculado!');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const vinculadosIds = new Set(usuariosVinculados?.map(u => u.id) || []);
  const usuariosDisponiveis = todosUsuarios?.filter(u => !vinculadosIds.has(u.id)) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Usuários - {provedorNome}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add user */}
          <div className="flex gap-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingTodos}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Selecione um usuário para adicionar" />
              </SelectTrigger>
              <SelectContent>
                {usuariosDisponiveis.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome} {u.sobrenome} ({u.email})
                  </SelectItem>
                ))}
                {usuariosDisponiveis.length === 0 && (
                  <SelectItem value="_none" disabled>Nenhum usuário disponível</SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              onClick={() => selectedUserId && addMutation.mutate(selectedUserId)}
              disabled={!selectedUserId || addMutation.isPending}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Linked users table */}
          {loadingVinculados ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosVinculados?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Nenhum usuário vinculado
                    </TableCell>
                  </TableRow>
                )}
                {usuariosVinculados?.map(u => (
                  <TableRow key={u.id}>
                    <TableCell>{u.nome} {u.sobrenome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeMutation.mutate(u.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
