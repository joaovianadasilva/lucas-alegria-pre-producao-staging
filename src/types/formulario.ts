export interface FormularioCompleto {
  // Informações Básicas da Venda
  codigoCliente?: string;
  origem: string;
  tipoVenda: 'Adicional Avulso' | 'Contrato Ordinário';
  representanteVendas: string;
  tipoCliente: 'F' | 'J' | 'E';

  // Informações Básicas do Cliente
  nomeCompleto: string;
  cpf?: string;
  rg?: string;
  orgaoExpedicao?: string;
  dataNascimento?: string;
  telefone: string;
  celular: string;
  email: string;

  // Dados de Endereço
  residenciaRua: string;
  residenciaUf: string;
  residenciaNumero: string;
  residenciaBairro: string;
  residenciaComplemento?: string;
  residenciaCep: string;
  residenciaCidade: string;

  // Instalação
  instalacaoMesmoEndereco: 'S' | 'N';
  instalacaoRua?: string;
  instalacaoUf?: string;
  instalacaoNumero?: string;
  instalacaoBairro?: string;
  instalacaoComplemento?: string;
  instalacaoCep?: string;
  instalacaoCidade?: string;

  // Empresa (se Jurídica)
  cnpj?: string;
  razaoSocial?: string;
  inscricaoEstadual?: string;

  // Informações do Contrato
  planoContratado: string;
  adicionaisContratados?: string[];
  diaVencimento: string;
  observacao?: string;

  // Agendamento
  dataAgendamento: string;
  slotAgendamento: number;
}

export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const DIAS_VENCIMENTO = [
  '05', '10', '15', '20', '25'
];