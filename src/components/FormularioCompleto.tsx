import React, { useState, useEffect } from 'react';
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
import { Loader2, Calendar, Clock, Settings, ChevronsUpDown, X } from 'lucide-react';
import { FormularioCompleto as IFormularioCompleto, UFS, DIAS_VENCIMENTO } from '@/types/formulario';
import { DateSlotSelector } from './DateSlotSelector';
import { ConfiguracaoPlanosSupabase as ConfiguracaoPlanos } from './ConfiguracaoPlanosSupabase';
import { carregarPlanos, carregarAdicionais, formatarItemCatalogo, carregarCidades, carregarRepresentantes, ItemCidade, ItemRepresentante } from '@/lib/catalogoSupabase';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

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
  telefone: z.string().min(1, 'Telefone é obrigatório'),
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

  planoContratado: z.string().optional(),
  adicionaisContratados: z.array(z.string()).optional(),
  diaVencimento: z.string().min(1, 'Dia de vencimento é obrigatório'),
  observacao: z.string().optional(),

  dataAgendamento: z.string().min(1, 'Agendamento é obrigatório'),
  slotAgendamento: z.number().min(1, 'Slot de agendamento é obrigatório'),
}).superRefine((data, ctx) => {
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
  } else if (data.tipoVenda === 'Adicional Avulso') {
    // Para Adicional Avulso, adicionais são obrigatórios
    if (!data.adicionaisContratados || data.adicionaisContratados.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pelo menos um adicional deve ser selecionado para Adicional Avulso',
        path: ['adicionaisContratados']
      });
    }
  }
});

type FormularioSchema = z.infer<typeof formularioSchema>;

interface Props {
  webhookUrl?: string;
  spreadsheetId: string;
}

export const FormularioCompleto: React.FC<Props> = ({ webhookUrl, spreadsheetId }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<number>(0);
  const [configOpen, setConfigOpen] = useState(false);
  const [planosOptions, setPlanosOptions] = useState<string[]>([]);
  const [adicionaisOptions, setAdicionaisOptions] = useState<string[]>([]);
  const [cidadesOptions, setCidadesOptions] = useState<ItemCidade[]>([]);
  const [representantesOptions, setRepresentantesOptions] = useState<ItemRepresentante[]>([]);
  const { toast } = useToast();

  const form = useForm<FormularioSchema>({
    resolver: zodResolver(formularioSchema),
    defaultValues: {
      tipoCliente: 'F',
      instalacaoMesmoEndereco: 'S',
    }
  });

  const tipoCliente = form.watch('tipoCliente');
  const instalacaoMesmoEndereco = form.watch('instalacaoMesmoEndereco');

  const loadOptions = async () => {
    const planos = await carregarPlanos();
    const adicionais = await carregarAdicionais();
    const cidades = await carregarCidades();
    const representantes = await carregarRepresentantes();
    setPlanosOptions(planos.map(formatarItemCatalogo));
    setAdicionaisOptions(adicionais.map(formatarItemCatalogo));
    setCidadesOptions(cidades);
    setRepresentantesOptions(representantes);
  };

  useEffect(() => {
    loadOptions();
  }, []);

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
      // Se mudou para Estrangeiro, limpar ambos
      form.setValue('cpf', undefined);
      form.setValue('rg', undefined);
      form.setValue('orgaoExpedicao', undefined);
      form.setValue('dataNascimento', undefined);
      form.setValue('cnpj', undefined);
      form.setValue('razaoSocial', undefined);
      form.setValue('inscricaoEstadual', undefined);
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
      // 1. Criar contrato no Supabase
      console.log('Criando contrato via manage-contracts...');
      const { data: contractResult, error: contractError } = await supabase.functions.invoke('manage-contracts', {
        body: {
          action: 'createContract',
          ...data
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
        <div className="flex justify-center gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfigOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurar Planos
          </Button>
        </div>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a origem da venda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Informações do Contrato</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setConfigOpen(true)}
              >
                <Settings className="h-5 w-5" />
              </Button>
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

          {/* Agendamento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Agendamento (Obrigatório)
              </CardTitle>
              <CardDescription>
                Selecione uma data e horário disponível para o agendamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DateSlotSelector
                spreadsheetId={spreadsheetId}
                onSlotSelect={handleSlotSelect}
              />
              
              {selectedDate && selectedSlot > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    Data selecionada: {selectedDate}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium mt-1">
                    <Clock className="w-4 h-4" />
                    Horário: Slot {selectedSlot}
                  </div>
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

      <ConfiguracaoPlanos
        open={configOpen}
        onOpenChange={setConfigOpen}
        onUpdate={loadOptions}
      />
    </div>
  );
};