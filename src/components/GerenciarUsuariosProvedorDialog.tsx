import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Trash2, UserPlus, ArrowLeft } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const availableRoles = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'vendedor_clique', label: 'Vendedor Clique' },
  { value: 'vendedor_provedor', label: 'Vendedor Provedor' },
  { value: 'tecnico', label: 'Técnico' },
];

export default function GerenciarUsuariosProvedorDialog({ open, onOpenChange, provedorId, provedorNome }: Props) {
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    nome: '', sobrenome: '', email: '', password: '', telefone: '', role: 'vendedor_clique',
  });

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

  const createUserMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'createUser',
          provedorId,
          email: newUserForm.email,
          password: newUserForm.password,
          nome: newUserForm.nome,
          sobrenome: newUserForm.sobrenome,
          telefone: newUserForm.telefone || undefined,
          roles: [newUserForm.role],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios-provedor', provedorId] });
      queryClient.invalidateQueries({ queryKey: ['todos-usuarios'] });
      toast.success('Usuário criado e vinculado ao provedor!');
      setNewUserForm({ nome: '', sobrenome: '', email: '', password: '', telefone: '', role: 'vendedor_clique' });
      setShowCreateForm(false);
    },
    onError: (e: any) => toast.error('Erro ao criar usuário: ' + e.message),
  });

  const vinculadosIds = new Set(usuariosVinculados?.map(u => u.id) || []);
  const usuariosDisponiveis = todosUsuarios?.filter(u => !vinculadosIds.has(u.id)) || [];

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setShowCreateForm(false); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Usuários - {provedorNome}</DialogTitle>
          <DialogDescription>Gerencie os usuários vinculados a este provedor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {showCreateForm ? (
            /* ── Formulário de criar novo usuário ── */
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h4 className="text-sm font-medium">Criar novo usuário</h4>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createUserMutation.mutate(); }} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Nome</Label>
                    <Input value={newUserForm.nome} onChange={(e) => setNewUserForm({ ...newUserForm, nome: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Sobrenome</Label>
                    <Input value={newUserForm.sobrenome} onChange={(e) => setNewUserForm({ ...newUserForm, sobrenome: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} required />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} required minLength={6} />
                </div>
                <div>
                  <Label>Telefone (opcional)</Label>
                  <Input value={newUserForm.telefone} onChange={(e) => setNewUserForm({ ...newUserForm, telefone: e.target.value })} />
                </div>
                <div>
                  <Label>Perfil</Label>
                  <Select value={newUserForm.role} onValueChange={(v) => setNewUserForm({ ...newUserForm, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {availableRoles.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? 'Criando...' : 'Criar e Vincular'}
                </Button>
              </form>
            </div>
          ) : (
            /* ── Modo de visualização / adicionar existente ── */
            <>
              <div className="space-y-1">
                <label className="text-sm font-medium">Adicionar usuário existente</label>
                <div className="flex gap-2">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={loadingTodos}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione um usuário" />
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
                    onClick={() => selectedUserId && addMutation.mutate(selectedUserId)}
                    disabled={!selectedUserId || addMutation.isPending}
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    Vincular
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ou crie um usuário novo:</span>
                <Button variant="outline" size="sm" onClick={() => setShowCreateForm(true)}>
                  <UserPlus className="h-4 w-4 mr-1" />
                  Novo Usuário
                </Button>
              </div>
            </>
          )}

          {/* Linked users table */}
          {!showCreateForm && (
            loadingVinculados ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="h-[400px] overflow-y-scroll rounded-md border">
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
              </div>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
