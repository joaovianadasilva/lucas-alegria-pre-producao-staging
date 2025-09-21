import React, { useState } from 'react';
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
import { Loader2, Upload, Calendar, Clock } from 'lucide-react';
import { FormularioCompleto as IFormularioCompleto, UFS, DIAS_VENCIMENTO } from '@/types/formulario';
import { DateSlotSelector } from './DateSlotSelector';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const formularioSchema = z.object({
  origem: z.string().min(1, 'Origem é obrigatória'),
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

  planoContratado: z.string().min(1, 'Plano contratado é obrigatório'),
  adicionaisContratados: z.string().optional(),
  diaVencimento: z.string().min(1, 'Dia de vencimento é obrigatório'),
  previsaoInstalacao: z.string().min(1, 'Previsão de instalação é obrigatória'),
  observacao: z.string().optional(),

  dataAgendamento: z.string().min(1, 'Agendamento é obrigatório'),
  slotAgendamento: z.number().min(1, 'Slot de agendamento é obrigatório'),

  fotoDocumentoFrente: z.instanceof(File).optional(),
  fotoDocumentoVerso: z.instanceof(File).optional(),
  fotoSelfieDocumento: z.instanceof(File).optional(),
  fotoComprovanteEndereco: z.instanceof(File).optional(),
}).refine((data) => {
  if (data.tipoCliente === 'F') {
    return data.cpf && data.rg && data.dataNascimento;
  }
  if (data.tipoCliente === 'J') {
    return data.cnpj && data.razaoSocial;
  }
  return true;
}, {
  message: 'Campos obrigatórios para o tipo de cliente selecionado',
  path: ['tipoCliente']
}).refine((data) => {
  if (data.instalacaoMesmoEndereco === 'N') {
    return data.instalacaoRua && data.instalacaoUf && data.instalacaoNumero && 
           data.instalacaoBairro && data.instalacaoCep && data.instalacaoCidade;
  }
  return true;
}, {
  message: 'Dados de instalação obrigatórios quando não é o mesmo endereço',
  path: ['instalacaoMesmoEndereco']
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

  const handleSlotSelect = (date: string, slot: number) => {
    setSelectedDate(date);
    setSelectedSlot(slot);
    form.setValue('dataAgendamento', date);
    form.setValue('slotAgendamento', slot);
  };

  const handleFileChange = (fieldName: keyof FormularioSchema, file: File | undefined) => {
    if (file && file.size > MAX_FILE_SIZE) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 15MB",
        variant: "destructive",
      });
      return;
    }
    form.setValue(fieldName, file as any);
  };

  const onSubmit = async (data: FormularioSchema) => {
    setIsSubmitting(true);
    
    try {
      // Preparar FormData para envio com arquivos
      const formData = new FormData();
      
      // Adicionar todos os campos do formulário
      Object.entries(data).forEach(([key, value]) => {
        if (value instanceof File) {
          formData.append(key, value);
        } else if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      // Enviar para webhook se fornecido
      if (webhookUrl) {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          body: formData,
        });

        if (!webhookResponse.ok) {
          throw new Error(`Erro no webhook: ${webhookResponse.status}`);
        }
      }

      toast({
        title: "Sucesso!",
        description: "Formulário enviado com sucesso",
      });

      // Reset form
      form.reset();
      setSelectedDate('');
      setSelectedSlot(0);
      
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o formulário. Tente novamente.",
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

              {tipoCliente === 'F' && (
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
              <FormField
                control={form.control}
                name="residenciaRua"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Rua/Avenida</FormLabel>
                    <FormControl>
                      <Input placeholder="Rua/Avenida" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="residenciaUf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UF</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {UFS.map((uf) => (
                          <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="residenciaNumero"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl>
                      <Input placeholder="123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <FormField
                control={form.control}
                name="residenciaComplemento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input placeholder="Apto, casa, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <FormField
                control={form.control}
                name="residenciaCidade"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input placeholder="Cidade" {...field} />
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
                  <FormField
                    control={form.control}
                    name="instalacaoRua"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Rua/Avenida</FormLabel>
                        <FormControl>
                          <Input placeholder="Rua/Avenida" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="instalacaoUf"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {UFS.map((uf) => (
                              <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="instalacaoNumero"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                  
                  <FormField
                    control={form.control}
                    name="instalacaoComplemento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Complemento</FormLabel>
                        <FormControl>
                          <Input placeholder="Apto, casa, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
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
                  
                  <FormField
                    control={form.control}
                    name="instalacaoCidade"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="Cidade" {...field} />
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
                    <FormControl>
                      <Input placeholder="Nome do plano" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input placeholder="Adicionais (opcional)" {...field} />
                    </FormControl>
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
                name="previsaoInstalacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previsão de Instalação</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
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

          {/* Documentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Documentos do Contratante
              </CardTitle>
              <CardDescription>
                Envie os documentos solicitados (máximo 15MB por arquivo)
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fotoDocumentoFrente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto - FRENTE do Documento</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange('fotoDocumentoFrente', e.target.files?.[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fotoDocumentoVerso"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foto - VERSO do Documento</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange('fotoDocumentoVerso', e.target.files?.[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fotoSelfieDocumento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selfie com Documento</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange('fotoSelfieDocumento', e.target.files?.[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="fotoComprovanteEndereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comprovante de Endereço</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange('fotoComprovanteEndereco', e.target.files?.[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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