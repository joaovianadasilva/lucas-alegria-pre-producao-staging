import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TecnicoSelector } from '@/components/TecnicoSelector';
import { SlotSelectorForDate } from '@/components/SlotSelectorForDate';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Edit, XCircle, Filter, Calendar, Clock, User } from 'lucide-react';
import { formatLocalDate } from '@/lib/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STATUS_COLORS = {
  pendente: 'bg-yellow-500',
  concluido: 'bg-green-500',
  reprogramado: 'bg-blue-500',
  cancelado: 'bg-red-500',
};

const STATUS_LABELS = {
  pendente: 'Pendente',
  concluido: 'Concluído',
  reprogramado: 'Reprogramado',
  cancelado: 'Cancelado',
};

const CONFIRMACAO_COLORS = {
  'confirmado': 'bg-green-500',
  'pre-agendado': 'bg-yellow-500',
  'cancelado': 'bg-red-500',
};

const CONFIRMACAO_LABELS = {
  'confirmado': 'Confirmado',
  'pre-agendado': 'Pré-Agendado',
  'cancelado': 'Cancelado',
};

const TIPO_LABELS = {
  contrato: 'Contrato',
  instalacao: 'Instalação',
  manutencao: 'Manutenção',
  visita_tecnica: 'Visita Técnica',
  suporte: 'Suporte',
};

export default function GerenciarAgendamentos() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filtroStatus, setFiltroStatus] = useState('all');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [filtroTecnico, setFiltroTecnico] = useState('all');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [editDialog, setEditDialog] = useState(false);
  const [selectedAgendamento, setSelectedAgendamento] = useState<any>(null);
  const [novoStatus, setNovoStatus] = useState('');
  const [novoTipo, setNovoTipo] = useState('');
  const [novoTecnico, setNovoTecnico] = useState('');
  const [novaConfirmacao, setNovaConfirmacao] = useState('');
  const [novaOrigem, setNovaOrigem] = useState('');
  const [novoRepresentante, setNovoRepresentante] = useState('');
  const [representantesOptions, setRepresentantesOptions] = useState<{id: string, nome: string}[]>([]);

  // Estados para reagendamento
  const [reagendarDialog, setReagendarDialog] = useState(false);
  const [motivoReagendamento, setMotivoReagendamento] = useState('');
  const [novaDataReagendamento, setNovaDataReagendamento] = useState('');
  const [novoSlotReagendamento, setNovoSlotReagendamento] = useState<number | null>(null);
  
  // Estado para histórico completo
  const [historicoCompleto, setHistoricoCompleto] = useState<{
    edicoes: any[];
    reagendamentos: any[];
  }>({ edicoes: [], reagendamentos: [] });

  // Carregar representantes de vendas
  React.useEffect(() => {
    const loadRepresentantes = async () => {
      const { data, error } = await supabase
        .from('catalogo_representantes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      
      if (data && !error) {
        setRepresentantesOptions(data);
      }
    };
    
    loadRepresentantes();
  }, []);

  const { data: agendamentosData, isLoading, refetch } = useQuery({
    queryKey: ['agendamentos', filtroStatus, filtroTipo, filtroTecnico, dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('manage-appointments', {
        body: {
          action: 'listAppointments',
          status: filtroStatus !== 'all' ? filtroStatus : undefined,
          tipo: filtroTipo !== 'all' ? filtroTipo : undefined,
          tecnicoId: filtroTecnico !== 'all' ? filtroTecnico : undefined,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao carregar agendamentos');

      return data;
    },
  });

  // Função para buscar histórico completo
  const fetchHistoricoCompleto = async (agendamentoId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-appointments', {
        body: {
          action: 'getEditHistory',
          agendamentoId: agendamentoId
        }
      });

      if (error) throw error;
      if (data?.success) {
        setHistoricoCompleto({
          edicoes: data.edicoes || [],
          reagendamentos: data.reagendamentos || []
        });
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico",
        variant: "destructive",
      });
    }
  };

  // Funções auxiliares para formatação
  const formatarNomeCampo = (campo: string) => {
    const nomes: Record<string, string> = {
      'tipo': 'Tipo de Agendamento',
      'status': 'Status',
      'confirmacao': 'Confirmação',
      'tecnico_responsavel_id': 'Técnico Responsável',
      'origem': 'Origem',
      'representante_vendas': 'Representante de Vendas',
      'reagendamento': 'Data/Horário'
    };
    return nomes[campo] || campo;
  };

  const formatarValor = (campo: string, valor: string) => {
    if (valor === 'null') return 'Não definido';
    
    if (campo === 'tipo') {
      return TIPO_LABELS[valor as keyof typeof TIPO_LABELS] || valor;
    }
    if (campo === 'status') {
      return STATUS_LABELS[valor as keyof typeof STATUS_LABELS] || valor;
    }
    if (campo === 'confirmacao') {
      return CONFIRMACAO_LABELS[valor as keyof typeof CONFIRMACAO_LABELS] || valor;
    }
    
    return valor;
  };

  // Componentes de Timeline
  const TimelineItem = ({ item, isLast }: { item: any; isLast: boolean }) => (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-primary rounded-full mt-2" />
        {!isLast && <div className="w-0.5 h-full bg-border mt-1" />}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-sm">
            {formatarNomeCampo(item.campo_alterado)}
          </p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(item.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            <span className="line-through">
              {formatarValor(item.campo_alterado, item.valor_anterior)}
            </span>
            {' → '}
            <span className="text-foreground font-medium">
              {formatarValor(item.campo_alterado, item.valor_novo)}
            </span>
          </p>
          {item.usuario && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {item.usuario.nome} {item.usuario.sobrenome}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const TimelineItemReagendamento = ({ item, isLast }: { item: any; isLast: boolean }) => (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center">
        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
        {!isLast && <div className="w-0.5 h-full bg-border mt-1" />}
      </div>
      <div className="flex-1 pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="font-semibold text-sm flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Reagendamento
          </p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {new Date(item.created_at).toLocaleString('pt-BR')}
          </p>
        </div>
        <div className="space-y-1 text-sm">
          <p className="text-muted-foreground">
            <span className="line-through">
              {formatLocalDate(item.data_anterior)} - Slot {item.slot_anterior}
            </span>
            {' → '}
            <span className="text-foreground font-medium">
              {formatLocalDate(item.data_nova)} - Slot {item.slot_novo}
            </span>
          </p>
          {item.motivo && (
            <p className="text-xs italic bg-muted p-2 rounded">
              <strong>Motivo:</strong> {item.motivo}
            </p>
          )}
          {item.usuario && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              {item.usuario.nome} {item.usuario.sobrenome}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const handleEdit = (agendamento: any) => {
    setSelectedAgendamento(agendamento);
    setNovoStatus(agendamento.status);
    setNovoTipo(agendamento.tipo);
    setNovoTecnico(agendamento.tecnico_responsavel_id || '');
    setNovaConfirmacao(agendamento.confirmacao || 'pre-agendado');
    setNovaOrigem(agendamento.origem || '');
    setNovoRepresentante(agendamento.representante_vendas || '');
    
    // Buscar histórico completo
    fetchHistoricoCompleto(agendamento.id);
    
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedAgendamento) return;

    try {
      // Obter usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('manage-appointments', {
        body: {
          action: 'updateAppointment',
          agendamentoId: selectedAgendamento.id,
          updates: {
            tipo: novoTipo,
            status: novoStatus,
            tecnico_responsavel_id: novoTecnico || null,
            confirmacao: novaConfirmacao,
            origem: novaOrigem || null,
            representante_vendas: novoRepresentante || null,
          },
          usuarioId: user?.id
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar');

      toast({
        title: "Sucesso",
        description: "Agendamento atualizado com sucesso!",
      });

      setEditDialog(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro ao atualizar agendamento',
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (agendamento: any) => {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;

    try {
      // Obter usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('manage-appointments', {
        body: {
          action: 'cancelAppointment',
          agendamentoId: agendamento.id,
          usuarioId: user?.id
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao cancelar');

      toast({
        title: "Sucesso",
        description: "Agendamento cancelado com sucesso!",
      });

      refetch();
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    } catch (error) {
      console.error('Erro ao cancelar:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : 'Erro ao cancelar agendamento',
        variant: "destructive",
      });
    }
  };

  const handleReagendar = async () => {
    if (!selectedAgendamento || !novaDataReagendamento || !novoSlotReagendamento) {
      toast({ 
        title: 'Erro', 
        description: 'Preencha a nova data e horário', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('manage-appointments', {
        body: {
          action: 'rescheduleAppointment',
          agendamentoId: selectedAgendamento.id,
          novaData: novaDataReagendamento,
          novoSlot: novoSlotReagendamento,
          motivo: motivoReagendamento || null,
          usuarioId: user?.id
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao reagendar');

      toast({ 
        title: 'Sucesso', 
        description: 'Agendamento reagendado com sucesso!' 
      });
      
      setReagendarDialog(false);
      setMotivoReagendamento('');
      setNovaDataReagendamento('');
      setNovoSlotReagendamento(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['agendamentos'] });
    } catch (error: any) {
      console.error('Erro ao reagendar:', error);
      toast({ 
        title: 'Erro', 
        description: error.message || 'Erro ao reagendar agendamento', 
        variant: 'destructive' 
      });
    }
  };

  const openReagendarDialog = (agendamento: any) => {
    setSelectedAgendamento(agendamento);
    setMotivoReagendamento('');
    setNovaDataReagendamento('');
    setNovoSlotReagendamento(null);
    setReagendarDialog(true);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Agendamentos</h1>
            <p className="text-muted-foreground">Visualize e gerencie todos os agendamentos</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
            <CardDescription>Filtre os agendamentos por status, tipo, técnico ou data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="reprogramado">Reprogramado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="instalacao">Instalação</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="visita_tecnica">Visita Técnica</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agendamentos</CardTitle>
            <CardDescription>
              {agendamentosData?.total || 0} agendamento(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Horário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>ID Cliente</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Representante</TableHead>
                      <TableHead>Confirmação</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Técnico</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendamentosData?.agendamentos?.map((agendamento: any) => (
                      <TableRow key={agendamento.id}>
                        <TableCell className="font-medium">
                          {formatLocalDate(agendamento.data_agendamento)}
                          <br />
                          <span className="text-sm text-muted-foreground">
                            Slot {agendamento.slot_numero}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {TIPO_LABELS[agendamento.tipo as keyof typeof TIPO_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {agendamento.contrato?.codigo_cliente || (
                            <span className="text-muted-foreground text-sm">Não vinculado</span>
                          )}
                        </TableCell>
                        <TableCell>{agendamento.nome_cliente}</TableCell>
                        <TableCell className="text-sm">
                          {agendamento.email_cliente}
                          {agendamento.telefone_cliente && (
                            <>
                              <br />
                              {agendamento.telefone_cliente}
                            </>
                          )}
                        </TableCell>
                        <TableCell>
                          {agendamento.origem || (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {agendamento.representante_vendas || (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={CONFIRMACAO_COLORS[agendamento.confirmacao as keyof typeof CONFIRMACAO_COLORS]}>
                            {CONFIRMACAO_LABELS[agendamento.confirmacao as keyof typeof CONFIRMACAO_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[agendamento.status as keyof typeof STATUS_COLORS]}>
                            {STATUS_LABELS[agendamento.status as keyof typeof STATUS_LABELS]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {agendamento.tecnico ? (
                            <div className="text-sm">
                              {agendamento.tecnico.nome} {agendamento.tecnico.sobrenome}
                              {agendamento.tecnico.telefone && (
                                <>
                                  <br />
                                  <span className="text-muted-foreground">
                                    {agendamento.tecnico.telefone}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Não atribuído</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(agendamento)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {agendamento.status !== 'cancelado' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openReagendarDialog(agendamento)}
                                >
                                  <Calendar className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleCancel(agendamento)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Agendamento</DialogTitle>
            <DialogDescription>
              Edite as informações ou visualize o histórico completo de mudanças
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="editar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editar">Editar</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
            </TabsList>
            
            <TabsContent value="editar" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Confirmação</Label>
                <Select value={novaConfirmacao} onValueChange={setNovaConfirmacao}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre-agendado">Pré-Agendado</SelectItem>
                    <SelectItem value="confirmado">Confirmado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Agendamento</Label>
                <Select value={novoTipo} onValueChange={setNovoTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instalacao">Instalação</SelectItem>
                    <SelectItem value="manutencao">Manutenção</SelectItem>
                    <SelectItem value="visita_tecnica">Visita Técnica</SelectItem>
                    <SelectItem value="suporte">Suporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="reprogramado">Reprogramado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <TecnicoSelector value={novoTecnico} onValueChange={setNovoTecnico} />

              <div className="space-y-2">
                <Label>Origem</Label>
                <Select value={novaOrigem} onValueChange={setNovaOrigem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a origem (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                    <SelectItem value="ex-cliente">Ex-cliente</SelectItem>
                    <SelectItem value="panfleto">Panfleto</SelectItem>
                    <SelectItem value="cartaz-banner-outdoor">Cartaz/Banner/Outdoor</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="internet">Internet</SelectItem>
                    <SelectItem value="anuncio-parede-placa">Anúncio na parede / Placa</SelectItem>
                    <SelectItem value="carro-veiculos-empresa">Carro/Veículos da empresa</SelectItem>
                    <SelectItem value="anuncio-avenida">Anúncio na avenida</SelectItem>
                    <SelectItem value="caixa-poste">Caixa no poste</SelectItem>
                    <SelectItem value="via-tecnico">Via Técnico</SelectItem>
                    <SelectItem value="propaganda">Propaganda</SelectItem>
                    <SelectItem value="mora-proximo">Mora próximo</SelectItem>
                    <SelectItem value="condominio">Condomínio</SelectItem>
                    <SelectItem value="ja-cliente">Já é cliente</SelectItem>
                    <SelectItem value="via-vendedor">Via Vendedor</SelectItem>
                    <SelectItem value="nao-informado">Não informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Representante de Vendas</Label>
                <Select value={novoRepresentante} onValueChange={setNovoRepresentante}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o representante (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {representantesOptions.length === 0 ? (
                      <SelectItem value="sem-representantes" disabled>
                        Nenhum representante cadastrado
                      </SelectItem>
                    ) : (
                      representantesOptions.map((rep) => (
                        <SelectItem key={rep.id} value={rep.nome}>
                          {rep.nome}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            
            <TabsContent value="historico" className="py-4">
              {historicoCompleto.edicoes.length === 0 && historicoCompleto.reagendamentos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma alteração registrada ainda</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Linha do Tempo de Alterações
                  </h4>
                  
                  {[
                    ...historicoCompleto.edicoes.map(e => ({ ...e, tipo: 'edicao' })),
                    ...historicoCompleto.reagendamentos.map(r => ({ ...r, tipo: 'reagendamento' }))
                  ]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((item, index, array) => (
                      <React.Fragment key={`${item.tipo}-${item.id}`}>
                        {item.tipo === 'edicao' ? (
                          <TimelineItem item={item} isLast={index === array.length - 1} />
                        ) : (
                          <TimelineItemReagendamento item={item} isLast={index === array.length - 1} />
                        )}
                      </React.Fragment>
                    ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Fechar
            </Button>
            <Button onClick={handleSaveEdit}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Reagendamento */}
      <Dialog open={reagendarDialog} onOpenChange={setReagendarDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reagendar Agendamento</DialogTitle>
            <DialogDescription>
              Selecione a nova data e horário para o agendamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAgendamento && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-semibold">Agendamento Atual:</p>
                <p className="text-sm">
                  {formatLocalDate(selectedAgendamento.data_agendamento)} - Slot {selectedAgendamento.slot_numero}
                </p>
                <p className="text-sm text-muted-foreground">
                  Cliente: {selectedAgendamento.nome_cliente}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nova Data</Label>
              <Input
                type="date"
                value={novaDataReagendamento}
                onChange={(e) => {
                  setNovaDataReagendamento(e.target.value);
                  setNovoSlotReagendamento(null); // Reset slot ao mudar data
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {novaDataReagendamento && (
              <SlotSelectorForDate
                selectedDate={novaDataReagendamento}
                selectedSlot={novoSlotReagendamento}
                onSlotSelect={setNovoSlotReagendamento}
              />
            )}

            <div className="space-y-2">
              <Label>Motivo do Reagendamento (opcional)</Label>
              <Textarea
                placeholder="Ex: Cliente solicitou alteração, técnico indisponível, etc."
                value={motivoReagendamento}
                onChange={(e) => setMotivoReagendamento(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setReagendarDialog(false);
                setMotivoReagendamento('');
                setNovaDataReagendamento('');
                setNovoSlotReagendamento(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleReagendar}
              disabled={!novaDataReagendamento || !novoSlotReagendamento}
            >
              Confirmar Reagendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
