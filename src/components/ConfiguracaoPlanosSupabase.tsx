import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  carregarPlanos,
  carregarAdicionais,
  salvarPlanos,
  salvarAdicionais,
  removerPlano,
  removerAdicional,
  formatarItemCatalogo,
  type ItemCatalogo,
} from '@/lib/catalogoSupabase';

const SENHA_ADMIN = 'admin123';

interface ConfiguracaoPlanosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ConfiguracaoPlanosSupabase({ open, onOpenChange, onUpdate }: ConfiguracaoPlanosProps) {
  const [autenticado, setAutenticado] = useState(false);
  const [senha, setSenha] = useState('');
  const [planos, setPlanos] = useState<ItemCatalogo[]>([]);
  const [adicionais, setAdicionais] = useState<ItemCatalogo[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Formulário de novo item
  const [novoId, setNovoId] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [novoValor, setNovoValor] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [planosData, adicionaisData] = await Promise.all([
        carregarPlanos(),
        carregarAdicionais()
      ]);
      setPlanos(planosData);
      setAdicionais(adicionaisData);
    } catch (error) {
      toast({
        title: 'Erro ao carregar dados',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autenticado) {
      loadData();
    }
  }, [autenticado]);

  const handleLogin = () => {
    if (senha === SENHA_ADMIN) {
      setAutenticado(true);
      setSenha('');
    } else {
      toast({
        title: 'Senha incorreta',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const handleAdicionarPlano = async () => {
    if (!novoId || !novoNome || !novoValor) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha ID, Nome e Valor',
        variant: 'destructive',
      });
      return;
    }

    if (!/^\d+$/.test(novoId)) {
      toast({
        title: 'ID inválido',
        description: 'O ID deve conter apenas números',
        variant: 'destructive',
      });
      return;
    }

    const valor = parseFloat(novoValor);
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Digite um valor numérico positivo',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await salvarPlanos(novoId, novoNome, valor);

      setNovoId('');
      setNovoNome('');
      setNovoValor('');

      toast({
        title: 'Plano adicionado',
        description: formatarItemCatalogo({ id: novoId, nome: novoNome, valor }),
      });

      await loadData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Erro ao adicionar plano',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarAdicional = async () => {
    if (!novoId || !novoNome || !novoValor) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha ID, Nome e Valor',
        variant: 'destructive',
      });
      return;
    }

    if (!/^\d+$/.test(novoId)) {
      toast({
        title: 'ID inválido',
        description: 'O ID deve conter apenas números',
        variant: 'destructive',
      });
      return;
    }

    const valor = parseFloat(novoValor);
    if (isNaN(valor) || valor <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Digite um valor numérico positivo',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await salvarAdicionais(novoId, novoNome, valor);

      setNovoId('');
      setNovoNome('');
      setNovoValor('');

      toast({
        title: 'Adicional adicionado',
        description: formatarItemCatalogo({ id: novoId, nome: novoNome, valor }),
      });

      await loadData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Erro ao adicionar adicional',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverPlano = async (id: string) => {
    setLoading(true);
    try {
      await removerPlano(id);
      toast({
        title: 'Plano removido',
      });
      await loadData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Erro ao remover plano',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverAdicional = async (id: string) => {
    setLoading(true);
    try {
      await removerAdicional(id);
      toast({
        title: 'Adicional removido',
      });
      await loadData();
      onUpdate?.();
    } catch (error) {
      toast({
        title: 'Erro ao remover adicional',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAutenticado(false);
    setSenha('');
    setNovoId('');
    setNovoNome('');
    setNovoValor('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuração de Planos e Adicionais</DialogTitle>
        </DialogHeader>

        {!autenticado ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Senha de Acesso</Label>
              <Input
                id="senha"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Digite a senha"
              />
            </div>
            <Button onClick={handleLogin} className="w-full">
              Acessar
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="planos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="planos">Planos</TabsTrigger>
              <TabsTrigger value="adicionais">Adicionais</TabsTrigger>
            </TabsList>

            <TabsContent value="planos" className="space-y-4">
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-semibold">Adicionar Novo Plano</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="plano-id">ID</Label>
                    <Input
                      id="plano-id"
                      value={novoId}
                      onChange={(e) => setNovoId(e.target.value)}
                      placeholder="12345"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plano-nome">Nome</Label>
                    <Input
                      id="plano-nome"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="Fibra 100MB"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plano-valor">Valor (R$)</Label>
                    <Input
                      id="plano-valor"
                      type="number"
                      step="0.01"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      placeholder="79.90"
                      disabled={loading}
                    />
                  </div>
                </div>
                {novoId && novoNome && novoValor && (
                  <p className="text-sm text-muted-foreground">
                    Preview: {formatarItemCatalogo({ id: novoId, nome: novoNome, valor: parseFloat(novoValor) || 0 })}
                  </p>
                )}
                <Button onClick={handleAdicionarPlano} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Adicionar Plano
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {planos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {loading ? 'Carregando...' : 'Nenhum plano cadastrado'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      planos.map((plano) => (
                        <TableRow key={plano.id}>
                          <TableCell className="font-mono">{plano.id}</TableCell>
                          <TableCell>{plano.nome}</TableCell>
                          <TableCell>R$ {plano.valor.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoverPlano(plano.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="adicionais" className="space-y-4">
              <div className="space-y-4 border rounded-lg p-4">
                <h3 className="font-semibold">Adicionar Novo Adicional</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="adicional-id">ID</Label>
                    <Input
                      id="adicional-id"
                      value={novoId}
                      onChange={(e) => setNovoId(e.target.value)}
                      placeholder="20001"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adicional-nome">Nome</Label>
                    <Input
                      id="adicional-nome"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      placeholder="IP Fixo"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adicional-valor">Valor (R$)</Label>
                    <Input
                      id="adicional-valor"
                      type="number"
                      step="0.01"
                      value={novoValor}
                      onChange={(e) => setNovoValor(e.target.value)}
                      placeholder="15.00"
                      disabled={loading}
                    />
                  </div>
                </div>
                {novoId && novoNome && novoValor && (
                  <p className="text-sm text-muted-foreground">
                    Preview: {formatarItemCatalogo({ id: novoId, nome: novoNome, valor: parseFloat(novoValor) || 0 })}
                  </p>
                )}
                <Button onClick={handleAdicionarAdicional} className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Adicionar Adicional
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adicionais.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          {loading ? 'Carregando...' : 'Nenhum adicional cadastrado'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      adicionais.map((adicional) => (
                        <TableRow key={adicional.id}>
                          <TableCell className="font-mono">{adicional.id}</TableCell>
                          <TableCell>{adicional.nome}</TableCell>
                          <TableCell>R$ {adicional.valor.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoverAdicional(adicional.id)}
                              disabled={loading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
