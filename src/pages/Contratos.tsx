import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Filter, Edit, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

interface Contrato {
  id: string;
  nome_completo: string;
  celular: string;
  email: string;
  cpf: string | null;
  codigo_contrato: string | null;
  codigo_cliente: string | null;
  created_at: string;
}

const ITEMS_PER_PAGE = 20;

export default function Contratos() {
  const queryClient = useQueryClient();
  
  // Filtros pendentes (UI)
  const [pendingDataInicio, setPendingDataInicio] = useState('');
  const [pendingDataFim, setPendingDataFim] = useState('');
  const [pendingCodigoClienteFilter, setPendingCodigoClienteFilter] = useState('todos');
  const [pendingCodigoContratoFilter, setPendingCodigoContratoFilter] = useState('todos');
  
  // Filtros aplicados (query)
  const [appliedFilters, setAppliedFilters] = useState({
    dataInicio: '',
    dataFim: '',
    codigoClienteFilter: 'todos',
    codigoContratoFilter: 'todos'
  });
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  
  // Modal de edição
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [editCodigoContrato, setEditCodigoContrato] = useState('');
  const [editCodigoCliente, setEditCodigoCliente] = useState('');

  // Verificar se filtros foram aplicados
  const filtersApplied = 
    appliedFilters.dataInicio !== '' || 
    appliedFilters.dataFim !== '' ||
    appliedFilters.codigoClienteFilter !== 'todos' ||
    appliedFilters.codigoContratoFilter !== 'todos';

  // Função para aplicar filtros
  const handleApplyFilters = () => {
    setAppliedFilters({
      dataInicio: pendingDataInicio,
      dataFim: pendingDataFim,
      codigoClienteFilter: pendingCodigoClienteFilter,
      codigoContratoFilter: pendingCodigoContratoFilter
    });
    setCurrentPage(1);
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setPendingDataInicio('');
    setPendingDataFim('');
    setPendingCodigoClienteFilter('todos');
    setPendingCodigoContratoFilter('todos');
    setAppliedFilters({
      dataInicio: '',
      dataFim: '',
      codigoClienteFilter: 'todos',
      codigoContratoFilter: 'todos'
    });
    setCurrentPage(1);
  };

  // Query para buscar contratos
  const { data: contratosData, isLoading } = useQuery({
    queryKey: ['contratos-list', appliedFilters, currentPage],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-contracts', {
        body: {
          action: 'listContractsWithFilter',
          limit: ITEMS_PER_PAGE,
          offset: (currentPage - 1) * ITEMS_PER_PAGE,
          dataInicio: appliedFilters.dataInicio || undefined,
          dataFim: appliedFilters.dataFim || undefined,
          codigoClienteFilter: appliedFilters.codigoClienteFilter !== 'todos' ? appliedFilters.codigoClienteFilter : undefined,
          codigoContratoFilter: appliedFilters.codigoContratoFilter !== 'todos' ? appliedFilters.codigoContratoFilter : undefined
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao carregar contratos');

      return data;
    },
    enabled: filtersApplied
  });

  const contratos = contratosData?.contratos || [];
  const totalContratos = contratosData?.total || 0;
  const totalPages = Math.ceil(totalContratos / ITEMS_PER_PAGE);

  // Mutation para atualizar códigos
  const updateCodesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedContrato) throw new Error('Nenhum contrato selecionado');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('manage-contracts', {
        body: {
          action: 'updateContractCodes',
          contratoId: selectedContrato.id,
          codigoContrato: editCodigoContrato || null,
          codigoCliente: editCodigoCliente || null,
          usuarioId: user?.id
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos-list'] });
      toast.success('Contrato atualizado com sucesso!');
      setEditDialogOpen(false);
      setSelectedContrato(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });

  const handleEdit = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setEditCodigoContrato(contrato.codigo_contrato || '');
    setEditCodigoCliente(contrato.codigo_cliente || '');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    updateCodesMutation.mutate();
  };

  // Calcular range de exibição
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalContratos);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Contratos</h2>
        <p className="text-muted-foreground">
          Gerencie os contratos cadastrados no sistema
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={pendingDataInicio}
                onChange={(e) => setPendingDataInicio(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={pendingDataFim}
                onChange={(e) => setPendingDataFim(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Código do Cliente</Label>
              <Select value={pendingCodigoClienteFilter} onValueChange={setPendingCodigoClienteFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="vazio">Vazio</SelectItem>
                  <SelectItem value="preenchido">Preenchido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Código do Contrato</Label>
              <Select value={pendingCodigoContratoFilter} onValueChange={setPendingCodigoContratoFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="vazio">Vazio</SelectItem>
                  <SelectItem value="preenchido">Preenchido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={handleApplyFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Contratos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contratos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!filtersApplied ? (
            <div className="text-center py-12 text-muted-foreground">
              <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aplique os filtros para visualizar os contratos</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : contratos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum contrato encontrado com os filtros aplicados
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nome do Cliente</TableHead>
                      <TableHead>Celular</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Cód. Contrato</TableHead>
                      <TableHead>Cód. Cliente</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contratos.map((contrato: Contrato) => (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-mono text-xs">
                          {contrato.id.substring(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell>{contrato.nome_completo}</TableCell>
                        <TableCell>{contrato.celular}</TableCell>
                        <TableCell>{contrato.email}</TableCell>
                        <TableCell>{contrato.cpf || '-'}</TableCell>
                        <TableCell>{contrato.codigo_contrato || '-'}</TableCell>
                        <TableCell>{contrato.codigo_cliente || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(contrato)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Exibindo {startIndex} - {endIndex} de {totalContratos}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Códigos do Contrato</DialogTitle>
            <DialogDescription>
              Atualize o código do contrato e/ou código do cliente
            </DialogDescription>
          </DialogHeader>
          
          {selectedContrato && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">{selectedContrato.nome_completo}</p>
                <p className="text-xs text-muted-foreground">ID: {selectedContrato.id.substring(0, 8).toUpperCase()}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="codigo_contrato">Código do Contrato</Label>
                <Input
                  id="codigo_contrato"
                  value={editCodigoContrato}
                  onChange={(e) => setEditCodigoContrato(e.target.value)}
                  placeholder="Digite o código do contrato"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="codigo_cliente">Código do Cliente</Label>
                <Input
                  id="codigo_cliente"
                  value={editCodigoCliente}
                  onChange={(e) => setEditCodigoCliente(e.target.value)}
                  placeholder="Digite o código do cliente"
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateCodesMutation.isPending}>
              {updateCodesMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
