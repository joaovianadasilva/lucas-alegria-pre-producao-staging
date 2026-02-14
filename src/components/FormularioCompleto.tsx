import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, ChevronsUpDown, X, Receipt } from 'lucide-react';
import { FormularioCompleto as IFormularioCompleto, UFS, DIAS_VENCIMENTO } from '@/types/formulario';
import { CalendarSlotPicker } from './CalendarSlotPicker';
import { carregarPlanos, carregarAdicionais, formatarItemCatalogo, carregarCidades, carregarRepresentantes, carregarOrigens, ItemCidade, ItemRepresentante, ItemOrigem, ItemCatalogo } from '@/lib/catalogoSupabase';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

// Função para extrair código do formato "[codigo] - [nome] - [R$ valor]"
const extrairCodigoDoItem = (itemFormatado: string): string => {
  const match = itemFormatado.match(/^\[(.+?)\]/);
  return match ? match[1] : '';
};

// Função para calcular idade a partir da data de nascimento
const calcularIdade = (dataNascimento: string): number => {
  const hoje = new Date();
  const nascimento = new Date(dataNascimento);
  
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNascimento = nascimento.getMonth();
  
  // Ajustar se ainda não fez aniversário este ano
  if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  
  return idade;
};

const formularioSchema = z.object({
  codigoCliente: z.string().optional(),
  origem: z.string().min(1, 'Origem é obrigatória'),
  tipoVenda: z.enum(['Adicional Avulso', 'Contrato Ordinário'], { required_error: 'Tipo de venda é obrigatório' }),
  representanteVendas: z.string().min(1, 'Representante de vendas é obrigatório'),
  tipoCliente: z.enum(['F', 'J', 'E'], { required_error: 'Tipo de cliente é obrigatório' }),
  
  nomeCompleto: z.string().min(1, 'Nome completo é obrigatório'),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  orgaoExpedicao: z.string().optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  celular: z.string().min(1, 'Celular é obrigatório'),
  email: z.string().email('Email inválido'),

  residenciaRua: z.string().min(1, 'Rua/Avenida é obrigatória'),
  residenciaUf: z.string().min(1, 'UF é obrigatória'),
  residenciaNumero: z.string().min(1, 'Número é obrigatório'),
  residenciaBairro: z.string().min(1, 'Bairro é obrigatório'),
  residenciaComplemento: z.string().optional(),
  residenciaCep: z.string().min(1, 'CEP é obrigatório'),
  residenciaCidade: z.string().min(1, 'Cidade é obrigatória'),

  instalacaoMesmoEndereco: z.enum(['S', 'N'], { required_error: 'Resposta obrigatória' }),
  instalacaoRua: z.string().optional(),
  instalacaoUf: z.string().optional(),
  instalacaoNumero: z.string().optional(),
  instalacaoBairro: z.string().optional(),
  instalacaoComplemento: z.string().optional(),
  instalacaoCep: z.string().optional(),
  instalacaoCidade: z.string().optional(),

  cnpj: z.string().optional(),
  razaoSocial: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
  documentoEstrangeiro: z.string().optional(),

  planoContratado: z.string().optional(),
  adicionaisContratados: z.array(z.string()).optional(),
  diaVencimento: z.string().min(1, 'Dia de vencimento é obrigatório'),
  observacao: z.string().optional(),
  
  // Taxa de instalação
  taxaInstalacao: z.enum(['gratis', '150', '100', 'outro'], { required_error: 'Taxa de instalação é obrigatória' }),
  taxaInstalacaoOutro: z.string().optional(),

  dataAgendamento: z.string().optional(),
  slotAgendamento: z.number().optional(),
  
  // Campo interno para controlar se agendamento é obrigatório (não enviado ao backend)
  _agendamentoObrigatorio: z.boolean().optional(),
}).superRefine((data, ctx) => {
  // Validação para taxa de instalação "outro"
  if (data.taxaInstalacao === 'outro') {
    if (!data.taxaInstalacaoOutro || data.taxaInstalacaoOutro.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o valor da taxa de instalação',
        path: ['taxaInstalacaoOutro']
      });
    } else {
      const valor = parseFloat(data.taxaInstalacaoOutro);
      if (isNaN(valor) || valor < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Informe um valor numérico válido',
          path: ['taxaInstalacaoOutro']
        });
      }
    }
  }
  // Validação condicional para Pessoa Física
  if (data.tipoCliente === 'F') {
    if (!data.cpf || data.cpf.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CPF é obrigatório para Pessoa Física',
        path: ['cpf']
      });
    }
    if (!data.rg || data.rg.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RG é obrigatório para Pessoa Física',
        path: ['rg']
      });
    }
    if (!data.dataNascimento || data.dataNascimento.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de Nascimento é obrigatória para Pessoa Física',
        path: ['dataNascimento']
      });
    }
    
    // Validação de idade mínima para Pessoa Física
    if (data.dataNascimento && data.dataNascimento.trim() !== '') {
      try {
        const idade = calcularIdade(data.dataNascimento);
        if (idade < 18) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'O cliente deve ter pelo menos 18 anos de idade',
            path: ['dataNascimento']
          });
        }
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Data de nascimento inválida',
          path: ['dataNascimento']
        });
      }
    }
  }
  
  // Validação condicional para Pessoa Jurídica
  if (data.tipoCliente === 'J') {
    if (!data.cnpj || data.cnpj.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CNPJ é obrigatório para Pessoa Jurídica',
        path: ['cnpj']
      });
    }
    if (!data.razaoSocial || data.razaoSocial.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Razão Social é obrigatória para Pessoa Jurídica',
        path: ['razaoSocial']
      });
    }
    if (!data.cpf || data.cpf.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CPF é obrigatório para Pessoa Jurídica',
        path: ['cpf']
      });
    }
    if (!data.rg || data.rg.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'RG é obrigatório para Pessoa Jurídica',
        path: ['rg']
      });
    }
    if (!data.orgaoExpedicao || data.orgaoExpedicao.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Órgão de Expedição é obrigatório para Pessoa Jurídica',
        path: ['orgaoExpedicao']
      });
    }
    if (!data.dataNascimento || data.dataNascimento.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de Nascimento é obrigatória para Pessoa Jurídica',
        path: ['dataNascimento']
      });
    }
    
    // Validação de idade mínima para Pessoa Jurídica
    if (data.dataNascimento && data.dataNascimento.trim() !== '') {
      try {
        const idade = calcularIdade(data.dataNascimento);
        if (idade < 18) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'O representante legal deve ter pelo menos 18 anos de idade',
            path: ['dataNascimento']
          });
        }
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Data de nascimento inválida',
          path: ['dataNascimento']
        });
      }
    }
  }

  // Validação condicional para Estrangeiro
  if (data.tipoCliente === 'E') {
    if (!data.dataNascimento || data.dataNascimento.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Data de Nascimento é obrigatória para Estrangeiro',
        path: ['dataNascimento']
      });
    }
    if (!data.documentoEstrangeiro || data.documentoEstrangeiro.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CNRM ou RNE é obrigatório para Estrangeiro',
        path: ['documentoEstrangeiro']
      });
    }
    
    // Validação de idade mínima para Estrangeiro
    if (data.dataNascimento && data.dataNascimento.trim() !== '') {
      try {
        const idade = calcularIdade(data.dataNascimento);
        if (idade < 18) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'O cliente deve ter pelo menos 18 anos de idade',
            path: ['dataNascimento']
          });
        }
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Data de nascimento inválida',
          path: ['dataNascimento']
        });
      }
    }
  }
  // Validação condicional para endereço de instalação diferente
  if (data.instalacaoMesmoEndereco === 'N') {
    if (!data.instalacaoRua || data.instalacaoRua.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Rua é obrigatória para instalação',
        path: ['instalacaoRua']
      });
    }
    if (!data.instalacaoUf || data.instalacaoUf.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'UF é obrigatória para instalação',
        path: ['instalacaoUf']
      });
    }
    if (!data.instalacaoNumero || data.instalacaoNumero.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Número é obrigatório para instalação',
        path: ['instalacaoNumero']
      });
    }
    if (!data.instalacaoBairro || data.instalacaoBairro.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bairro é obrigatório para instalação',
        path: ['instalacaoBairro']
      });
    }
    if (!data.instalacaoCep || data.instalacaoCep.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CEP é obrigatório para instalação',
        path: ['instalacaoCep']
      });
    }
    if (!data.instalacaoCidade || data.instalacaoCidade.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Cidade é obrigatória para instalação',
        path: ['instalacaoCidade']
      });
    }
  }
  
  // Validação condicional baseada no Tipo de Venda
  if (data.tipoVenda === 'Contrato Ordinário') {
    // Para Contrato Ordinário, plano é obrigatório
    if (!data.planoContratado || data.planoContratado.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Plano contratado é obrigatório para Contrato Ordinário',
        path: ['planoContratado']
      });
    }
    // Agendamento sempre obrigatório para Contrato Ordinário
    if (!data.dataAgendamento || data.dataAgendamento.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'É necessário selecionar uma data de agendamento',
        path: ['dataAgendamento']
      });
    }
    if (!data.slotAgendamento || data.slotAgendamento < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'É necessário selecionar uma vaga de agendamento',
        path: ['slotAgendamento']
      });
    }
  } else if (data.tipoVenda === 'Adicional Avulso') {
    // Para Adicional Avulso, adicionais são obrigatórios
    if (!data.adicionaisContratados || data.adicionaisContratados.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pelo menos um adicional deve ser selecionado para Adicional Avulso',
        path: ['adicionaisContratados']
      });
    }
    // Para Adicional Avulso, agendamento é obrigatório apenas se _agendamentoObrigatorio for true
    // (isso é controlado pelo componente baseado nos adicionais que requerem agendamento)
    if (data._agendamentoObrigatorio === true) {
      if (!data.dataAgendamento || data.dataAgendamento.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'É necessário selecionar uma data de agendamento (um dos adicionais requer agendamento)',
          path: ['dataAgendamento']
        });
      }
      if (!data.slotAgendamento || data.slotAgendamento < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'É necessário selecionar uma vaga de agendamento (um dos adicionais requer agendamento)',
          path: ['slotAgendamento']
        });
      }
    }
  }
});

type FormularioSchema = z.infer<typeof formularioSchema>;

interface Props {
  webhookUrl?: string;
  spreadsheetId: string;
}

export const FormularioCompleto: React.FC<Props> = ({ webhookUrl, spreadsheetId }) => {
  const { provedorAtivo } = useAuth();
  const provedorId = provedorAtivo?.id || '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [planosOptions, setPlanosOptions] = useState<string[]>([]);
  const [adicionaisOptions, setAdicionaisOptions] = useState<string[]>([]);
  const [cidadesOptions, setCidadesOptions] = useState<ItemCidade[]>([]);
  const [representantesOptions, setRepresentantesOptions] = useState<ItemRepresentante[]>([]);
  const [origensOptions, setOrigensOptions] = useState<ItemOrigem[]>([]);
  const [planosData, setPlanosData] = useState<ItemCatalogo[]>([]);
  const [adicionaisData, setAdicionaisData] = useState<ItemCatalogo[]>([]);
  const { toast } = useToast();

  const form = useForm<FormularioSchema>({
    resolver: zodResolver(formularioSchema),
    defaultValues: {
      tipoCliente: 'F',
      instalacaoMesmoEndereco: 'S',
    }
  });

  const tipoCliente = form.watch('tipoCliente');
  const tipoVenda = form.watch('tipoVenda');
  const instalacaoMesmoEndereco = form.watch('instalacaoMesmoEndereco');
  const planoSelecionado = form.watch('planoContratado');
  const adicionaisSelecionados = form.watch('adicionaisContratados');
  const diaVencimento = form.watch('diaVencimento');
  const taxaInstalacao = form.watch('taxaInstalacao');
  const taxaInstalacaoOutro = form.watch('taxaInstalacaoOutro');

  // Verificar se algum adicional selecionado requer agendamento
  const algumAdicionalRequerAgenda = useMemo(() => {
    if (!adicionaisSelecionados || adicionaisSelecionados.length === 0) return false;
    
    return adicionaisSelecionados.some(adicionalFormatado => {
      const codigo = extrairCodigoDoItem(adicionalFormatado);
      const adicional = adicionaisData.find(a => a.id === codigo);
      return adicional?.requerAgendamento === true;
    });
  }, [adicionaisSelecionados, adicionaisData]);

  // Agendamento é obrigatório se:
  // - Tipo de venda é "Contrato Ordinário" (sempre)
  // - OU Tipo de venda é "Adicional Avulso" E algum adicional requer agenda
  const agendamentoObrigatorio = tipoVenda === 'Contrato Ordinário' || 
    (tipoVenda === 'Adicional Avulso' && algumAdicionalRequerAgenda);

  // Atualizar o campo interno _agendamentoObrigatorio para validação
  useEffect(() => {
    form.setValue('_agendamentoObrigatorio', agendamentoObrigatorio);
  }, [agendamentoObrigatorio, form]);

  // Cálculo do resumo do contrato
  const resumoContrato = useMemo(() => {
    let planoInfo: { nome: string; valor: number } | null = null;
    let adicionaisInfo: { nome: string; valor: number }[] = [];
    let totalMensal = 0;

    if (planoSelecionado) {
      const codigo = extrairCodigoDoItem(planoSelecionado);
      const plano = planosData.find(p => p.id === codigo);
      if (plano) {
        planoInfo = { nome: plano.nome, valor: plano.valor };
        totalMensal += plano.valor;
      }
    }

    if (adicionaisSelecionados && adicionaisSelecionados.length > 0) {
      adicionaisSelecionados.forEach(adicionalFormatado => {
        const codigo = extrairCodigoDoItem(adicionalFormatado);
        const adicional = adicionaisData.find(a => a.id === codigo);
        if (adicional) {
          adicionaisInfo.push({ nome: adicional.nome, valor: adicional.valor });
          totalMensal += adicional.valor;
        }
      });
    }

    return { planoInfo, adicionaisInfo, totalMensal };
  }, [planoSelecionado, adicionaisSelecionados, planosData, adicionaisData]);

  const loadOptions = async () => {
    if (!provedorId) return;
    const planos = await carregarPlanos(provedorId);
    const adicionais = await carregarAdicionais(provedorId);
    const cidades = await carregarCidades(provedorId);
    const representantes = await carregarRepresentantes(provedorId);
    const origens = await carregarOrigens(provedorId);
    setPlanosData(planos);
    setAdicionaisData(adicionais);
    setPlanosOptions(planos.map(formatarItemCatalogo));
    setAdicionaisOptions(adicionais.map(formatarItemCatalogo));
    setCidadesOptions(cidades);
    setRepresentantesOptions(representantes);
    setOrigensOptions(origens);
  };

  useEffect(() => {
    loadOptions();
  }, [provedorId]);

  // Limpar campos condicionais quando o tipo de cliente muda
  useEffect(() => {
    if (tipoCliente === 'F') {
      // Se mudou para Pessoa Física, limpar campos de Pessoa Jurídica
      form.setValue('cnpj', undefined);
      form.setValue('razaoSocial', undefined);
      form.setValue('inscricaoEstadual', undefined);
    } else if (tipoCliente === 'J') {
      // Se mudou para Pessoa Jurídica, não limpar campos compartilhados (CPF, RG, Órgão, Data Nascimento)
    } else if (tipoCliente === 'E') {
      // Se mudou para Estrangeiro, limpar campos de Física/Jurídica
      form.setValue('cpf', undefined);
      form.setValue('rg', undefined);
      form.setValue('orgaoExpedicao', undefined);
      form.setValue('cnpj', undefined);
      form.setValue('razaoSocial', undefined);
      form.setValue('inscricaoEstadual', undefined);
    } else if (tipoCliente === 'F' || tipoCliente === 'J') {
      // Se mudou para Física ou Jurídica, limpar documento estrangeiro
      form.setValue('documentoEstrangeiro', undefined);
    }
  }, [tipoCliente, form]);

  const handleSlotSelect = (date: string, slot: number) => {
    setSelectedDate(date);
    setSelectedSlot(slot);
    form.setValue('dataAgendamento', date);
    form.setValue('slotAgendamento', slot);
  };

  const onSubmit = async (data: FormularioSchema) => {
    setIsSubmitting(true);
    
    try {
      // Calcular valor da taxa de instalação
      const calcularTaxaInstalacao = (): number => {
        switch (data.taxaInstalacao) {
          case 'gratis': return 0;
          case '150': return 150;
          case '100': return 100;
          case 'outro': return parseFloat(data.taxaInstalacaoOutro || '0');
          default: return 0;
        }
      };

      // 1. Criar contrato no Supabase
      console.log('Criando contrato via manage-contracts...');
      const { data: contractResult, error: contractError } = await supabase.functions.invoke('manage-contracts', {
        body: {
          action: 'createContract',
          provedorId,
          ...data,
          taxaInstalacao: calcularTaxaInstalacao()
        }
      });

      if (contractError) {
        throw new Error(`Erro ao criar contrato: ${contractError.message}`);
      }

      if (!contractResult?.success) {
        throw new Error(contractResult?.error || 'Erro ao criar contrato');
      }

      const { contratoId, numeroContrato } = contractResult;

      // 2. (Opcional) Enviar para webhook externo
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...data,
              contratoId,
              numeroContrato
            }),
          });
        } catch (webhookError) {
          console.warn('Webhook falhou, mas contrato foi criado:', webhookError);
        }
      }

      toast({
        title: "Contrato criado com sucesso!",
        description: `Número do contrato: ${numeroContrato}`,
      });

      // Reset form
      form.reset({
        tipoCliente: 'F',
        instalacaoMesmoEndereco: 'S',
      });
      setSelectedDate('');
      setSelectedSlot(0);
      
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro ao criar contrato",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Formulário de Contratação</h1>
        <p className="text-muted-foreground">Preencha todos os dados para finalizar sua contratação</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          {/* Informações Básicas da Venda */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas da Venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="origem"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Origem</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem da venda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {origensOptions.length === 0 ? (
                          <SelectItem value="sem-origens" disabled>
                            Nenhuma origem cadastrada
                          </SelectItem>
                        ) : (
                          origensOptions.map((origem) => (
                            <SelectItem key={origem.id} value={origem.nome}>
                              {origem.nome}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipoVenda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Venda</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de venda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Adicional Avulso">Adicional Avulso</SelectItem>
                        <SelectItem value="Contrato Ordinário">Contrato Ordinário</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="representanteVendas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Representante de Vendas</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o representante" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="tipoCliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Cliente</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="F" id="fisica" />
                          <Label htmlFor="fisica">Pessoa Física</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="J" id="juridica" />
                          <Label htmlFor="juridica">Pessoa Jurídica</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="E" id="estrangeiro" />
                          <Label htmlFor="estrangeiro">Estrangeiro</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Informações Básicas do Cliente */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nomeCompleto"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(tipoCliente === 'F' || tipoCliente === 'J') && (
                <>
                  <FormField
                    control={form.control}
                    name="cpf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CPF</FormLabel>
                        <FormControl>
                          <Input placeholder="000.000.000-00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="rg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>RG</FormLabel>
                        <FormControl>
                          <Input placeholder="RG" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="orgaoExpedicao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Órgão de Expedição</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: SSP/SP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dataNascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {tipoCliente === 'E' && (
                <>
                  <FormField
                    control={form.control}
                    name="dataNascimento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="documentoEstrangeiro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNRM ou RNE</FormLabel>
                        <FormControl>
                          <Input placeholder="Número do documento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 1234-5678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="celular"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Celular</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Dados de Endereço Residencial */}
          <Card>
            <CardHeader>
              <CardTitle>Dados de Endereço Residencial</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rua */}
              <FormField
                control={form.control}
                name="residenciaRua"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Rua/Avenida</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da rua" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Número */}
              <FormField
                control={form.control}
                name="residenciaNumero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="Nº" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Complemento */}
              <FormField
                control={form.control}
                name="residenciaComplemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento (Opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Apto, Bloco, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Bairro */}
              <FormField
                control={form.control}
                name="residenciaBairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Cidade (Select com catálogo) */}
              <FormField
                control={form.control}
                name="residenciaCidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a cidade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cidadesOptions.length === 0 ? (
                          <SelectItem value="sem-cidades" disabled>
                            Nenhuma cidade cadastrada
                          </SelectItem>
                        ) : (
                          cidadesOptions
                            .filter(c => !form.watch('residenciaUf') || c.uf === form.watch('residenciaUf'))
                            .map((cidade) => (
                              <SelectItem key={cidade.id} value={cidade.nome}>
                                {cidade.nome}
                              </SelectItem>
                            ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* UF */}
              <FormField
                control={form.control}
                name="residenciaUf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UFS.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* CEP */}
              <FormField
                control={form.control}
                name="residenciaCep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input placeholder="00000-000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Endereço de Instalação */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço de Instalação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="instalacaoMesmoEndereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>O endereço de instalação é o mesmo endereço residencial?</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="S" id="sim" />
                          <Label htmlFor="sim">Sim</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="N" id="nao" />
                          <Label htmlFor="nao">Não</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {instalacaoMesmoEndereco === 'N' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  {/* Rua */}
                  <FormField
                    control={form.control}
                    name="instalacaoRua"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Rua/Avenida</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome da rua" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Número */}
                  <FormField
                    control={form.control}
                    name="instalacaoNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="Nº" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Complemento */}
                  <FormField
                    control={form.control}
                    name="instalacaoComplemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento (Opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto, Bloco, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Bairro */}
                  <FormField
                    control={form.control}
                    name="instalacaoBairro"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bairro</FormLabel>
                        <FormControl>
                          <Input placeholder="Bairro" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Cidade (Select com catálogo) */}
                  <FormField
                    control={form.control}
                    name="instalacaoCidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a cidade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cidadesOptions.length === 0 ? (
                              <SelectItem value="sem-cidades" disabled>
                                Nenhuma cidade cadastrada
                              </SelectItem>
                            ) : (
                              cidadesOptions
                                .filter(c => !form.watch('instalacaoUf') || c.uf === form.watch('instalacaoUf'))
                                .map((cidade) => (
                                  <SelectItem key={cidade.id} value={cidade.nome}>
                                    {cidade.nome}
                                  </SelectItem>
                                ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* UF */}
                  <FormField
                    control={form.control}
                    name="instalacaoUf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="UF" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UFS.map((uf) => (
                              <SelectItem key={uf} value={uf}>
                                {uf}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* CEP */}
                  <FormField
                    control={form.control}
                    name="instalacaoCep"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CEP</FormLabel>
                        <FormControl>
                          <Input placeholder="00000-000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Empresa (apenas para Pessoa Jurídica) */}
          {tipoCliente === 'J' && (
            <Card>
              <CardHeader>
                <CardTitle>Identificação da Empresa Contratante</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CNPJ</FormLabel>
                      <FormControl>
                        <Input placeholder="00.000.000/0000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="razaoSocial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Razão Social</FormLabel>
                      <FormControl>
                        <Input placeholder="Razão social da empresa" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="inscricaoEstadual"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Inscrição Estadual</FormLabel>
                      <FormControl>
                        <Input placeholder="Inscrição estadual" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {/* Informações do Contrato */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Contrato</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="planoContratado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plano Contratado</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione um plano" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {planosOptions.length === 0 ? (
                            <SelectItem value="sem-planos" disabled>
                              Nenhum plano cadastrado
                            </SelectItem>
                          ) : (
                            planosOptions.map((plano) => (
                              <SelectItem key={plano} value={plano}>
                                {plano}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => field.onChange("")}
                          title="Limpar seleção"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="adicionaisContratados"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adicionais Contratados</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                          >
                            {field.value && field.value.length > 0
                              ? `${field.value.length} adicional(is) selecionado(s)`
                              : "Selecione adicionais (opcional)"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <div className="max-h-64 overflow-auto p-4 space-y-2">
                          {adicionaisOptions.map((adicional) => (
                            <div
                              key={adicional}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                checked={field.value?.includes(adicional) || false}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentValue, adicional]);
                                  } else {
                                    field.onChange(
                                      currentValue.filter((val) => val !== adicional)
                                    );
                                  }
                                }}
                              />
                              <label className="text-sm cursor-pointer flex-1">
                                {adicional}
                              </label>
                            </div>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {field.value && field.value.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {field.value.map((adicional) => (
                          <Badge
                            key={adicional}
                            variant="secondary"
                            className="gap-1"
                          >
                            {adicional.split(' - ')[1] || adicional}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => {
                                field.onChange(
                                  field.value?.filter((val) => val !== adicional) || []
                                );
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="diaVencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dia de Vencimento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o dia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DIAS_VENCIMENTO.map((dia) => (
                          <SelectItem key={dia} value={dia}>Dia {dia}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="taxaInstalacao"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Taxa de Instalação</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-wrap gap-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="gratis" id="taxa-gratis" />
                          <Label htmlFor="taxa-gratis">GRÁTIS (R$ 0,00)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="150" id="taxa-150" />
                          <Label htmlFor="taxa-150">R$ 150,00</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="100" id="taxa-100" />
                          <Label htmlFor="taxa-100">R$ 100,00</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="outro" id="taxa-outro" />
                          <Label htmlFor="taxa-outro">Outro</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {taxaInstalacao === 'outro' && (
                <FormField
                  control={form.control}
                  name="taxaInstalacaoOutro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor da Taxa (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          inputMode="decimal"
                          placeholder="0,00" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Observação</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais (opcional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Resumo do Contrato */}
          {(resumoContrato.planoInfo || resumoContrato.adicionaisInfo.length > 0) && (
            <Card className="bg-muted/50 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Resumo do Contrato
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {resumoContrato.planoInfo && (
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">Plano</p>
                      <p className="font-medium">{resumoContrato.planoInfo.nome}</p>
                    </div>
                    <p className="font-semibold text-primary">
                      R$ {resumoContrato.planoInfo.valor.toFixed(2)}
                    </p>
                  </div>
                )}
                
                {resumoContrato.adicionaisInfo.length > 0 && (
                  <div className="py-2 border-b border-border">
                    <p className="text-sm text-muted-foreground mb-2">Adicionais</p>
                    {resumoContrato.adicionaisInfo.map((adicional, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <p className="font-medium">{adicional.nome}</p>
                        <p className="text-primary">R$ {adicional.valor.toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between items-center pt-2">
                  <p className="text-lg font-bold">Total Mensal</p>
                  <p className="text-xl font-bold text-primary">
                    R$ {resumoContrato.totalMensal.toFixed(2)}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground text-right">
                  Pagando até o dia do vencimento
                </p>

                {taxaInstalacao && (
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">Taxa de Instalação</p>
                    <p className="font-medium">
                      {taxaInstalacao === 'gratis' && 'GRÁTIS'}
                      {taxaInstalacao === '150' && 'R$ 150,00'}
                      {taxaInstalacao === '100' && 'R$ 100,00'}
                      {taxaInstalacao === 'outro' && taxaInstalacaoOutro && `R$ ${parseFloat(taxaInstalacaoOutro).toFixed(2)}`}
                    </p>
                  </div>
                )}
                
                {diaVencimento && (
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">Data de Vencimento</p>
                    <p className="font-medium">Todo dia {diaVencimento}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Agendamento */}
          <Card className={!agendamentoObrigatorio ? 'border-dashed' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Agendamento {agendamentoObrigatorio ? '(Obrigatório)' : '(Opcional)'}
              </CardTitle>
              <CardDescription>
                {agendamentoObrigatorio 
                  ? 'Selecione uma data e horário disponível para o agendamento'
                  : 'Nenhum adicional selecionado requer agendamento. Preencha apenas se desejar agendar.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CalendarSlotPicker
                onSlotSelect={handleSlotSelect}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
              />
              
              {agendamentoObrigatorio && (form.formState.errors.dataAgendamento || form.formState.errors.slotAgendamento) && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive">
                  <span className="text-sm font-medium">
                    É necessário selecionar uma data e uma vaga de agendamento
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botão de Envio */}
          <div className="flex justify-center">
            <Button 
              type="submit" 
              size="lg" 
              disabled={isSubmitting}
              className="w-full md:w-auto min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Formulário'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};