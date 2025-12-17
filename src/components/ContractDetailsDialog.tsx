import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Pencil } from 'lucide-react';
import { ContractEditDialog } from './ContractEditDialog';

interface Adicional {
  id: string;
  adicional_codigo: string;
  adicional_nome: string;
  adicional_valor: number;
}

export interface ContratoCompleto {
  id: string;
  nome_completo: string;
  tipo_cliente: string;
  cpf: string | null;
  cnpj: string | null;
  rg: string | null;
  orgao_expedicao: string | null;
  razao_social: string | null;
  inscricao_estadual: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  celular: string;
  email: string;
  residencia_rua: string;
  residencia_numero: string;
  residencia_bairro: string;
  residencia_complemento: string | null;
  residencia_cep: string;
  residencia_cidade: string;
  residencia_uf: string;
  instalacao_mesmo_endereco: boolean;
  instalacao_rua: string | null;
  instalacao_numero: string | null;
  instalacao_bairro: string | null;
  instalacao_complemento: string | null;
  instalacao_cep: string | null;
  instalacao_cidade: string | null;
  instalacao_uf: string | null;
  plano_nome: string;
  plano_codigo: string;
  plano_valor: number;
  taxa_instalacao: number | null;
  valor_total: number;
  dia_vencimento: string;
  origem: string;
  representante_vendas: string | null;
  tipo_venda: string | null;
  status: string | null;
  status_contrato: string | null;
  codigo_contrato: string | null;
  codigo_cliente: string | null;
  observacao: string | null;
  created_at: string;
  adicionais: Adicional[];
}

interface ContractDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: ContratoCompleto | null;
  loading: boolean;
  onContractUpdated?: () => void;
}

const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between py-1.5">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium">{value || '-'}</span>
  </div>
);

export function ContractDetailsDialog({ 
  open, 
  onOpenChange, 
  contract, 
  loading,
  onContractUpdated 
}: ContractDetailsDialogProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!contract) return null;

  const tipoClienteLabel = {
    'pf': 'Pessoa Física',
    'pj': 'Pessoa Jurídica',
    'estrangeiro': 'Estrangeiro'
  }[contract.tipo_cliente] || contract.tipo_cliente;

  const totalAdicionais = contract.adicionais?.reduce((sum, a) => sum + a.adicional_valor, 0) || 0;

  const handleEditSaved = () => {
    setEditDialogOpen(false);
    onContractUpdated?.();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Resumo do Contrato</DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Seção 1: Plano e Adicionais */}
              <section>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  Plano e Adicionais
                </h3>
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{contract.plano_nome}</p>
                      <p className="text-xs text-muted-foreground">Código: {contract.plano_codigo}</p>
                    </div>
                    <span className="font-semibold text-primary">{formatCurrency(contract.plano_valor)}</span>
                  </div>
                  
                  {contract.adicionais && contract.adicionais.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Adicionais:</p>
                        {contract.adicionais.map((adicional) => (
                          <div key={adicional.id} className="flex justify-between text-sm">
                            <span>{adicional.adicional_nome}</span>
                            <span>{formatCurrency(adicional.adicional_valor)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  
                  {(contract.taxa_instalacao !== null && contract.taxa_instalacao > 0) && (
                    <>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span>Taxa de Instalação</span>
                        <span>{formatCurrency(contract.taxa_instalacao)}</span>
                      </div>
                    </>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-semibold">Valor Total Mensal</span>
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(contract.plano_valor + totalAdicionais)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground text-right">
                    Vencimento dia {contract.dia_vencimento}
                  </p>
                </div>
              </section>

              <Separator />

              {/* Seção 2: Informações Pessoais */}
              <section>
                <h3 className="font-semibold text-lg mb-3">Informações Pessoais</h3>
                <div className="space-y-1">
                  <InfoRow label="Nome Completo" value={contract.nome_completo} />
                  <InfoRow 
                    label="Tipo de Cliente" 
                    value={<Badge variant="secondary">{tipoClienteLabel}</Badge>} 
                  />
                  
                  {contract.tipo_cliente === 'pf' && (
                    <>
                      <InfoRow label="CPF" value={contract.cpf} />
                      <InfoRow label="RG" value={contract.rg} />
                      <InfoRow label="Órgão Expedidor" value={contract.orgao_expedicao} />
                    </>
                  )}
                  
                  {contract.tipo_cliente === 'pj' && (
                    <>
                      <InfoRow label="CNPJ" value={contract.cnpj} />
                      <InfoRow label="Razão Social" value={contract.razao_social} />
                      <InfoRow label="Inscrição Estadual" value={contract.inscricao_estadual} />
                    </>
                  )}
                  
                  {contract.tipo_cliente === 'estrangeiro' && (
                    <>
                      <InfoRow label="Documento" value={contract.cpf} />
                      <InfoRow label="Data de Nascimento" value={formatDate(contract.data_nascimento)} />
                    </>
                  )}
                  
                  <InfoRow label="Telefone" value={contract.telefone} />
                  <InfoRow label="Celular" value={contract.celular} />
                  <InfoRow label="Email" value={contract.email} />
                </div>
              </section>

              <Separator />

              {/* Seção 3: Endereço */}
              <section>
                <h3 className="font-semibold text-lg mb-3">Endereço</h3>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Endereço de Residência</p>
                    <div className="bg-muted/30 rounded-md p-3 text-sm">
                      <p>{contract.residencia_rua}, {contract.residencia_numero}</p>
                      {contract.residencia_complemento && <p>{contract.residencia_complemento}</p>}
                      <p>{contract.residencia_bairro} - CEP: {contract.residencia_cep}</p>
                      <p>{contract.residencia_cidade}/{contract.residencia_uf}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Endereço de Instalação</p>
                    {contract.instalacao_mesmo_endereco ? (
                      <p className="text-sm italic text-muted-foreground">Mesmo endereço de residência</p>
                    ) : (
                      <div className="bg-muted/30 rounded-md p-3 text-sm">
                        <p>{contract.instalacao_rua}, {contract.instalacao_numero}</p>
                        {contract.instalacao_complemento && <p>{contract.instalacao_complemento}</p>}
                        <p>{contract.instalacao_bairro} - CEP: {contract.instalacao_cep}</p>
                        <p>{contract.instalacao_cidade}/{contract.instalacao_uf}</p>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <Separator />

              {/* Seção 4: Outras Informações */}
              <section>
                <h3 className="font-semibold text-lg mb-3">Outras Informações</h3>
                <div className="space-y-1">
                  <InfoRow label="Origem da Venda" value={contract.origem} />
                  <InfoRow label="Representante de Vendas" value={contract.representante_vendas} />
                  <InfoRow label="Tipo de Venda" value={contract.tipo_venda} />
                  <InfoRow label="Código do Contrato" value={contract.codigo_contrato} />
                  <InfoRow label="Código do Cliente" value={contract.codigo_cliente} />
                  <InfoRow 
                    label="Status" 
                    value={contract.status ? <Badge variant="outline">{contract.status}</Badge> : '-'} 
                  />
                  <InfoRow label="Data de Criação" value={formatDate(contract.created_at)} />
                  {contract.observacao && (
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground mb-1">Observações:</p>
                      <p className="text-sm bg-muted/30 rounded-md p-2">{contract.observacao}</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button onClick={() => setEditDialogOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {contract && (
        <ContractEditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          contract={contract}
          onSaved={handleEditSaved}
        />
      )}
    </>
  );
}
