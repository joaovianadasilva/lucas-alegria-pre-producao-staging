import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContratoCompleto } from './ContractDetailsDialog';

interface Plano {
  id: string;
  codigo: string;
  nome: string;
  valor: number;
}

interface Adicional {
  id: string;
  codigo: string;
  nome: string;
  valor: number;
}

interface Origem {
  id: string;
  nome: string;
}

interface Representante {
  id: string;
  nome: string;
}

interface ContractEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContratoCompleto;
  onSaved: () => void;
}

const DIAS_VENCIMENTO = ['05', '07', '10', '12', '20'];

export function ContractEditDialog({ open, onOpenChange, contract, onSaved }: ContractEditDialogProps) {
  const [saving, setSaving] = useState(false);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  
  // Catálogos
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<Adicional[]>([]);
  const [origens, setOrigens] = useState<Origem[]>([]);
  const [representantes, setRepresentantes] = useState<Representante[]>([]);
  
  // Form state - Plano e Adicionais
  const [planoCodigo, setPlanoCodigo] = useState('');
  const [adicionaisSelecionados, setAdicionaisSelecionados] = useState<string[]>([]);
  const [taxaInstalacao, setTaxaInstalacao] = useState('0');
  const [diaVencimento, setDiaVencimento] = useState('');
  
  // Form state - Informações Pessoais
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [tipoCliente, setTipoCliente] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [rg, setRg] = useState('');
  const [orgaoExpedicao, setOrgaoExpedicao] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [inscricaoEstadual, setInscricaoEstadual] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [telefone, setTelefone] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  
  // Form state - Endereço
  const [residenciaRua, setResidenciaRua] = useState('');
  const [residenciaNumero, setResidenciaNumero] = useState('');
  const [residenciaBairro, setResidenciaBairro] = useState('');
  const [residenciaComplemento, setResidenciaComplemento] = useState('');
  const [residenciaCep, setResidenciaCep] = useState('');
  const [residenciaCidade, setResidenciaCidade] = useState('');
  const [residenciaUf, setResidenciaUf] = useState('');
  const [instalacaoMesmoEndereco, setInstalacaoMesmoEndereco] = useState(true);
  const [instalacaoRua, setInstalacaoRua] = useState('');
  const [instalacaoNumero, setInstalacaoNumero] = useState('');
  const [instalacaoBairro, setInstalacaoBairro] = useState('');
  const [instalacaoComplemento, setInstalacaoComplemento] = useState('');
  const [instalacaoCep, setInstalacaoCep] = useState('');
  const [instalacaoCidade, setInstalacaoCidade] = useState('');
  const [instalacaoUf, setInstalacaoUf] = useState('');
  
  // Form state - Outras informações
  const [origem, setOrigem] = useState('');
  const [representanteVendas, setRepresentanteVendas] = useState('');
  const [tipoVenda, setTipoVenda] = useState('');
  const [observacao, setObservacao] = useState('');

  // Carregar catálogos ao abrir
  useEffect(() => {
    if (open) {
      loadCatalogs();
      populateForm();
    }
  }, [open, contract]);

  const loadCatalogs = async () => {
    setLoadingCatalogs(true);
    try {
      const [planosRes, adicionaisRes, origensRes, representantesRes] = await Promise.all([
        supabase.from('catalogo_planos').select('id, codigo, nome, valor').eq('ativo', true),
        supabase.from('catalogo_adicionais').select('id, codigo, nome, valor').eq('ativo', true),
        supabase.from('catalogo_origem_vendas').select('id, nome').eq('ativo', true),
        supabase.from('catalogo_representantes').select('id, nome').eq('ativo', true),
      ]);

      setPlanos(planosRes.data || []);
      setAdicionaisDisponiveis(adicionaisRes.data || []);
      setOrigens(origensRes.data || []);
      setRepresentantes(representantesRes.data || []);
    } catch (error) {
      console.error('Error loading catalogs:', error);
      toast.error('Erro ao carregar catálogos');
    } finally {
      setLoadingCatalogs(false);
    }
  };

  const populateForm = () => {
    // Plano e adicionais
    setPlanoCodigo(contract.plano_codigo || '');
    setAdicionaisSelecionados(
      contract.adicionais?.map(a => a.adicional_codigo) || []
    );
    setTaxaInstalacao(String(contract.taxa_instalacao || 0));
    setDiaVencimento(contract.dia_vencimento || '');
    
    // Informações pessoais
    setNomeCompleto(contract.nome_completo || '');
    setTipoCliente(contract.tipo_cliente || '');
    setCpf(contract.cpf || '');
    setCnpj(contract.cnpj || '');
    setRg(contract.rg || '');
    setOrgaoExpedicao(contract.orgao_expedicao || '');
    setRazaoSocial(contract.razao_social || '');
    setInscricaoEstadual(contract.inscricao_estadual || '');
    setDataNascimento(contract.data_nascimento || '');
    setTelefone(contract.telefone || '');
    setCelular(contract.celular || '');
    setEmail(contract.email || '');
    
    // Endereço
    setResidenciaRua(contract.residencia_rua || '');
    setResidenciaNumero(contract.residencia_numero || '');
    setResidenciaBairro(contract.residencia_bairro || '');
    setResidenciaComplemento(contract.residencia_complemento || '');
    setResidenciaCep(contract.residencia_cep || '');
    setResidenciaCidade(contract.residencia_cidade || '');
    setResidenciaUf(contract.residencia_uf || '');
    setInstalacaoMesmoEndereco(contract.instalacao_mesmo_endereco);
    setInstalacaoRua(contract.instalacao_rua || '');
    setInstalacaoNumero(contract.instalacao_numero || '');
    setInstalacaoBairro(contract.instalacao_bairro || '');
    setInstalacaoComplemento(contract.instalacao_complemento || '');
    setInstalacaoCep(contract.instalacao_cep || '');
    setInstalacaoCidade(contract.instalacao_cidade || '');
    setInstalacaoUf(contract.instalacao_uf || '');
    
    // Outras informações
    setOrigem(contract.origem || '');
    setRepresentanteVendas(contract.representante_vendas || '');
    setTipoVenda(contract.tipo_venda || '');
    setObservacao(contract.observacao || '');
  };

  const handleAdicionaiToggle = (codigo: string) => {
    setAdicionaisSelecionados(prev => 
      prev.includes(codigo) 
        ? prev.filter(c => c !== codigo)
        : [...prev, codigo]
    );
  };

  const planoSelecionado = planos.find(p => p.codigo === planoCodigo);
  const adicionaisValores = adicionaisSelecionados.map(codigo => 
    adicionaisDisponiveis.find(a => a.codigo === codigo)
  ).filter(Boolean) as Adicional[];
  
  const valorPlano = planoSelecionado?.valor || 0;
  const valorAdicionais = adicionaisValores.reduce((sum, a) => sum + a.valor, 0);
  const valorTotal = valorPlano + valorAdicionais;

  const handleSave = async () => {
    if (!nomeCompleto || !celular || !email) {
      toast.error('Nome, celular e email são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const adicionaisPayload = adicionaisValores.map(a => ({
        codigo: a.codigo,
        nome: a.nome,
        valor: a.valor
      }));

      const { data, error } = await supabase.functions.invoke('manage-contracts', {
        body: {
          action: 'updateContractFull',
          contratoId: contract.id,
          usuarioId: user?.id,
          // Plano
          planoCodigo,
          planoNome: planoSelecionado?.nome || 'Sem plano base',
          planoValor: valorPlano,
          adicionais: adicionaisPayload,
          taxaInstalacao: parseFloat(taxaInstalacao) || 0,
          diaVencimento,
          // Pessoal
          nomeCompleto,
          tipoCliente,
          cpf: cpf || null,
          cnpj: cnpj || null,
          rg: rg || null,
          orgaoExpedicao: orgaoExpedicao || null,
          razaoSocial: razaoSocial || null,
          inscricaoEstadual: inscricaoEstadual || null,
          dataNascimento: dataNascimento || null,
          telefone: telefone || null,
          celular,
          email,
          // Endereço residência
          residenciaRua,
          residenciaNumero,
          residenciaBairro,
          residenciaComplemento: residenciaComplemento || null,
          residenciaCep,
          residenciaCidade,
          residenciaUf,
          // Endereço instalação
          instalacaoMesmoEndereco,
          instalacaoRua: instalacaoRua || null,
          instalacaoNumero: instalacaoNumero || null,
          instalacaoBairro: instalacaoBairro || null,
          instalacaoComplemento: instalacaoComplemento || null,
          instalacaoCep: instalacaoCep || null,
          instalacaoCidade: instalacaoCidade || null,
          instalacaoUf: instalacaoUf || null,
          // Outras
          origem,
          representanteVendas: representanteVendas || null,
          tipoVenda: tipoVenda || null,
          observacao: observacao || null
        }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro ao atualizar contrato');

      toast.success('Contrato atualizado com sucesso!');
      onSaved();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving contract:', error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loadingCatalogs) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Editar Contrato</DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="plano" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="plano">Plano</TabsTrigger>
            <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
            <TabsTrigger value="endereco">Endereço</TabsTrigger>
            <TabsTrigger value="outras">Outras</TabsTrigger>
          </TabsList>
          
          <ScrollArea className="h-[50vh] mt-4 pr-4">
            {/* Tab: Plano e Adicionais */}
            <TabsContent value="plano" className="space-y-4">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={planoCodigo} onValueChange={setPlanoCodigo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem plano base</SelectItem>
                    {planos.map(plano => (
                      <SelectItem key={plano.id} value={plano.codigo}>
                        {plano.nome} - {formatCurrency(plano.valor)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Adicionais</Label>
                <div className="grid grid-cols-1 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                  {adicionaisDisponiveis.map(adicional => (
                    <div key={adicional.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`adicional-${adicional.codigo}`}
                        checked={adicionaisSelecionados.includes(adicional.codigo)}
                        onCheckedChange={() => handleAdicionaiToggle(adicional.codigo)}
                      />
                      <label 
                        htmlFor={`adicional-${adicional.codigo}`}
                        className="text-sm flex-1 cursor-pointer"
                      >
                        {adicional.nome} - {formatCurrency(adicional.valor)}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Taxa de Instalação</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxaInstalacao}
                    onChange={(e) => setTaxaInstalacao(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dia de Vencimento</Label>
                  <Select value={diaVencimento} onValueChange={setDiaVencimento}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS_VENCIMENTO.map(dia => (
                        <SelectItem key={dia} value={dia}>Dia {dia}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />
              
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between text-sm">
                  <span>Valor do Plano:</span>
                  <span>{formatCurrency(valorPlano)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Adicionais:</span>
                  <span>{formatCurrency(valorAdicionais)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Valor Total Mensal:</span>
                  <span className="text-primary">{formatCurrency(valorTotal)}</span>
                </div>
              </div>
            </TabsContent>

            {/* Tab: Informações Pessoais */}
            <TabsContent value="pessoal" className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Cliente</Label>
                <Select value={tipoCliente} onValueChange={setTipoCliente}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pf">Pessoa Física</SelectItem>
                    <SelectItem value="pj">Pessoa Jurídica</SelectItem>
                    <SelectItem value="estrangeiro">Estrangeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipoCliente === 'pf' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>RG</Label>
                      <Input value={rg} onChange={(e) => setRg(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Órgão Expedidor</Label>
                    <Input value={orgaoExpedicao} onChange={(e) => setOrgaoExpedicao(e.target.value)} />
                  </div>
                </>
              )}

              {tipoCliente === 'pj' && (
                <>
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Razão Social</Label>
                    <Input value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Inscrição Estadual</Label>
                    <Input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} />
                  </div>
                </>
              )}

              {tipoCliente === 'estrangeiro' && (
                <>
                  <div className="space-y-2">
                    <Label>Documento (CNRM/RNE)</Label>
                    <Input value={cpf} onChange={(e) => setCpf(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Nascimento</Label>
                    <Input type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Celular *</Label>
                  <Input value={celular} onChange={(e) => setCelular(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </TabsContent>

            {/* Tab: Endereço */}
            <TabsContent value="endereco" className="space-y-4">
              <h4 className="font-medium">Endereço de Residência</h4>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Rua</Label>
                  <Input value={residenciaRua} onChange={(e) => setResidenciaRua(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={residenciaNumero} onChange={(e) => setResidenciaNumero(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={residenciaBairro} onChange={(e) => setResidenciaBairro(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={residenciaComplemento} onChange={(e) => setResidenciaComplemento(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input value={residenciaCep} onChange={(e) => setResidenciaCep(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={residenciaCidade} onChange={(e) => setResidenciaCidade(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={residenciaUf} onChange={(e) => setResidenciaUf(e.target.value)} maxLength={2} />
                </div>
              </div>

              <Separator />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="mesmo-endereco"
                  checked={instalacaoMesmoEndereco}
                  onCheckedChange={(checked) => setInstalacaoMesmoEndereco(checked === true)}
                />
                <label htmlFor="mesmo-endereco" className="text-sm cursor-pointer">
                  Endereço de instalação é o mesmo de residência
                </label>
              </div>

              {!instalacaoMesmoEndereco && (
                <>
                  <h4 className="font-medium pt-2">Endereço de Instalação</h4>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label>Rua</Label>
                      <Input value={instalacaoRua} onChange={(e) => setInstalacaoRua(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input value={instalacaoNumero} onChange={(e) => setInstalacaoNumero(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Bairro</Label>
                      <Input value={instalacaoBairro} onChange={(e) => setInstalacaoBairro(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Complemento</Label>
                      <Input value={instalacaoComplemento} onChange={(e) => setInstalacaoComplemento(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>CEP</Label>
                      <Input value={instalacaoCep} onChange={(e) => setInstalacaoCep(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input value={instalacaoCidade} onChange={(e) => setInstalacaoCidade(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>UF</Label>
                      <Input value={instalacaoUf} onChange={(e) => setInstalacaoUf(e.target.value)} maxLength={2} />
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Tab: Outras Informações */}
            <TabsContent value="outras" className="space-y-4">
              <div className="space-y-2">
                <Label>Origem da Venda</Label>
                <Select value={origem} onValueChange={setOrigem}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {origens.map(o => (
                      <SelectItem key={o.id} value={o.nome}>{o.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Representante de Vendas</Label>
                <Select value={representanteVendas} onValueChange={setRepresentanteVendas}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {representantes.map(r => (
                      <SelectItem key={r.id} value={r.nome}>{r.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Venda</Label>
                <Select value={tipoVenda} onValueChange={setTipoVenda}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    <SelectItem value="Contrato Ordinário">Contrato Ordinário</SelectItem>
                    <SelectItem value="Adicional Avulso">Adicional Avulso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea 
                  value={observacao} 
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={4}
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Alterações'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}