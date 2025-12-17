import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Filter, X, Calendar, User, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HistoricoItem {
  id: string;
  created_at: string;
  tipo: 'edicao_agendamento' | 'reagendamento' | 'contrato' | 'adicional';
  usuario?: { nome: string; sobrenome: string; email: string };
  entidade_nome: string;
  entidade_id: string;
  acao: string;
  detalhes_resumo: string;
  detalhes_completos: any;
}

// Helper para exibir nome do usuário com fallback para email
const formatUsuarioNome = (usuario?: { nome: string; sobrenome: string; email: string }) => {
  if (!usuario) return 'Sistema';
  const nomeCompleto = `${usuario.nome || ''} ${usuario.sobrenome || ''}`.trim();
  if (nomeCompleto) return nomeCompleto;
  if (usuario.email) return usuario.email;
  return 'Usuário sem nome';
};

export default function Historico() {
  const { toast } = useToast();
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('all');
  const [tipoFiltro, setTipoFiltro] = useState('all');
  const [detalhesSelecionado, setDetalhesSelecionado] = useState<HistoricoItem | null>(null);

  // Buscar usuários para o filtro
  const { data: usuarios } = useQuery({
    queryKey: ['usuarios-historico'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, sobrenome, email')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      return data;
    }
  });

  // Buscar histórico
  const { data: historico, isLoading, refetch } = useQuery({
    queryKey: ['historico', dataInicio, dataFim, usuarioFiltro, tipoFiltro],
    queryFn: async () => {
      const items: HistoricoItem[] = [];

      // Histórico de edições de agendamentos
      if (tipoFiltro === 'all' || tipoFiltro === 'agendamento') {
        let query = supabase
          .from('historico_edicoes_agendamentos')
          .select(`
            id,
            created_at,
            campo_alterado,
            valor_anterior,
            valor_novo,
            usuario_id,
            profiles!historico_edicoes_agendamentos_usuario_id_fkey(nome, sobrenome, email),
            agendamentos!historico_edicoes_agendamentos_agendamento_id_fkey(
              id,
              nome_cliente,
              codigo_cliente,
              data_agendamento
            )
          `)
          .order('created_at', { ascending: false });

        if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00`);
        if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`);
        if (usuarioFiltro !== 'all') query = query.eq('usuario_id', usuarioFiltro);

        const { data, error } = await query;

        if (!error && data) {
          items.push(...data.map((item: any) => ({
            id: item.id,
            created_at: item.created_at,
            tipo: 'edicao_agendamento' as const,
            usuario: item.profiles,
            entidade_nome: item.agendamentos?.nome_cliente || 'N/A',
            entidade_id: item.agendamentos?.id || '',
            acao: item.campo_alterado === 'criacao' ? 'Criação' : 'Edição',
            detalhes_resumo: `${item.campo_alterado}: ${item.valor_anterior || '-'} → ${item.valor_novo || '-'}`,
            detalhes_completos: item
          })));
        }
      }

      // Histórico de reagendamentos
      if (tipoFiltro === 'all' || tipoFiltro === 'agendamento') {
        let query = supabase
          .from('historico_reagendamentos')
          .select(`
            id,
            created_at,
            data_anterior,
            slot_anterior,
            data_nova,
            slot_novo,
            motivo,
            usuario_id,
            profiles!historico_reagendamentos_usuario_id_fkey(nome, sobrenome, email),
            agendamentos!historico_reagendamentos_agendamento_id_fkey(
              id,
              nome_cliente,
              codigo_cliente
            )
          `)
          .order('created_at', { ascending: false });

        if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00`);
        if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`);
        if (usuarioFiltro !== 'all') query = query.eq('usuario_id', usuarioFiltro);

        const { data, error } = await query;

        if (!error && data) {
          items.push(...data.map((item: any) => ({
            id: item.id,
            created_at: item.created_at,
            tipo: 'reagendamento' as const,
            usuario: item.profiles,
            entidade_nome: item.agendamentos?.nome_cliente || 'N/A',
            entidade_id: item.agendamentos?.id || '',
            acao: 'Reagendamento',
            detalhes_resumo: `${format(new Date(item.data_anterior), 'dd/MM/yyyy')} → ${format(new Date(item.data_nova), 'dd/MM/yyyy')}`,
            detalhes_completos: item
          })));
        }
      }

      // Histórico de contratos
      if (tipoFiltro === 'all' || tipoFiltro === 'contrato') {
        let query = supabase
          .from('historico_contratos')
          .select(`
            id,
            created_at,
            tipo_acao,
            campo_alterado,
            valor_anterior,
            valor_novo,
            usuario_id,
            profiles!historico_contratos_usuario_id_fkey(nome, sobrenome, email),
            contratos!historico_contratos_contrato_id_fkey(
              id,
              nome_completo,
              codigo_cliente
            )
          `)
          .order('created_at', { ascending: false });

        if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00`);
        if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`);
        if (usuarioFiltro !== 'all') query = query.eq('usuario_id', usuarioFiltro);

        const { data, error } = await query;

        if (!error && data) {
          items.push(...data.map((item: any) => ({
            id: item.id,
            created_at: item.created_at,
            tipo: 'contrato' as const,
            usuario: item.profiles,
            entidade_nome: item.contratos?.nome_completo || 'N/A',
            entidade_id: item.contratos?.id || '',
            acao: item.tipo_acao === 'criacao' ? 'Criação' : 'Edição',
            detalhes_resumo: item.campo_alterado || 'Contrato criado',
            detalhes_completos: item
          })));
        }
      }

      // Histórico de adicionais
      if (tipoFiltro === 'all' || tipoFiltro === 'adicional') {
        let query = supabase
          .from('historico_adicionais_contrato')
          .select(`
            id,
            created_at,
            adicional_codigo,
            adicional_nome,
            adicional_valor,
            tipo_acao,
            usuario_id,
            profiles!historico_adicionais_contrato_usuario_id_fkey(nome, sobrenome, email),
            contratos!historico_adicionais_contrato_contrato_id_fkey(
              id,
              nome_completo,
              codigo_cliente
            )
          `)
          .order('created_at', { ascending: false });

        if (dataInicio) query = query.gte('created_at', `${dataInicio}T00:00:00`);
        if (dataFim) query = query.lte('created_at', `${dataFim}T23:59:59`);
        if (usuarioFiltro !== 'all') query = query.eq('usuario_id', usuarioFiltro);

        const { data, error } = await query;

        if (!error && data) {
          items.push(...data.map((item: any) => ({
            id: item.id,
            created_at: item.created_at,
            tipo: 'adicional' as const,
            usuario: item.profiles,
            entidade_nome: item.contratos?.nome_completo || 'N/A',
            entidade_id: item.contratos?.id || '',
            acao: item.tipo_acao === 'adicao' ? 'Adição' : 'Remoção',
            detalhes_resumo: `${item.adicional_nome} - R$ ${item.adicional_valor}`,
            detalhes_completos: item
          })));
        }
      }

      // Ordenar tudo por data
      return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  });

  const limparFiltros = () => {
    setDataInicio('');
    setDataFim('');
    setUsuarioFiltro('all');
    setTipoFiltro('all');
  };

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'edicao_agendamento': return 'default';
      case 'reagendamento': return 'secondary';
      case 'contrato': return 'outline';
      case 'adicional': return 'destructive';
      default: return 'default';
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'edicao_agendamento': return 'Agendamento';
      case 'reagendamento': return 'Reagendamento';
      case 'contrato': return 'Contrato';
      case 'adicional': return 'Adicional';
      default: return tipo;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Histórico de Alterações</h2>
        <p className="text-muted-foreground">
          Visualize todas as ações realizadas no sistema
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
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data-inicio">
                <Calendar className="inline h-4 w-4 mr-1" />
                Data Início
              </Label>
              <Input
                id="data-inicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-fim">
                <Calendar className="inline h-4 w-4 mr-1" />
                Data Fim
              </Label>
              <Input
                id="data-fim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usuario">
                <User className="inline h-4 w-4 mr-1" />
                Usuário
              </Label>
              <Select value={usuarioFiltro} onValueChange={setUsuarioFiltro}>
                <SelectTrigger id="usuario">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {usuarios?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {`${user.nome || ''} ${user.sobrenome || ''}`.trim() || user.email || 'Usuário sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">
                <FileText className="inline h-4 w-4 mr-1" />
                Tipo de Ação
              </Label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  <SelectItem value="agendamento">Agendamentos</SelectItem>
                  <SelectItem value="contrato">Contratos</SelectItem>
                  <SelectItem value="adicional">Adicionais</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={() => refetch()}>
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={limparFiltros}>
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Ações</CardTitle>
          <CardDescription>
            {historico?.length || 0} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : historico && historico.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Entidade</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {item.usuario?.nome?.[0] || item.usuario?.email?.[0]?.toUpperCase() || 'S'}
                            {item.usuario?.sobrenome?.[0] || ''}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {formatUsuarioNome(item.usuario)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(item.tipo)}>
                        {getTipoLabel(item.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {item.entidade_nome}
                    </TableCell>
                    <TableCell>{item.acao}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {item.detalhes_resumo}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDetalhesSelecionado(item)}
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro encontrado com os filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!detalhesSelecionado} onOpenChange={() => setDetalhesSelecionado(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Alteração</DialogTitle>
          </DialogHeader>

          {detalhesSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data/Hora</Label>
                  <p className="text-sm">
                    {format(new Date(detalhesSelecionado.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label>Usuário</Label>
                  <p className="text-sm">
                    {formatUsuarioNome(detalhesSelecionado.usuario)}
                  </p>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Badge variant={getBadgeVariant(detalhesSelecionado.tipo)}>
                    {getTipoLabel(detalhesSelecionado.tipo)}
                  </Badge>
                </div>
                <div>
                  <Label>Ação</Label>
                  <p className="text-sm">{detalhesSelecionado.acao}</p>
                </div>
              </div>

              <div>
                <Label>Entidade Relacionada</Label>
                <p className="text-sm">{detalhesSelecionado.entidade_nome}</p>
              </div>

              <div>
                <Label>Detalhes Completos</Label>
                <div className="bg-muted p-4 rounded-lg mt-2">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(detalhesSelecionado.detalhes_completos, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}