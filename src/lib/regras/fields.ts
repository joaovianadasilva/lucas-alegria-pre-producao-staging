// Catálogo de campos disponíveis para o builder de regras (contratos)

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'enum';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: { value: string; label: string }[];
  isDate?: boolean;
}

export const STATUS_CONTRATO_OPTIONS = [
  { value: 'P', label: 'Pendente (P)' },
  { value: 'A', label: 'Ativo (A)' },
  { value: 'I', label: 'Instalado (I)' },
  { value: 'D', label: 'Cancelado/Desativado (D)' },
];

export const TIPO_CLIENTE_OPTIONS = [
  { value: 'pf', label: 'Pessoa Física' },
  { value: 'pj', label: 'Pessoa Jurídica' },
  { value: 'estrangeiro', label: 'Estrangeiro' },
];

export const STATUS_OPTIONS = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'cancelado', label: 'Cancelado' },
];

export const TIPO_VENDA_OPTIONS = [
  { value: 'Contrato Ordinário', label: 'Contrato Ordinário' },
  { value: 'Adicional Avulso', label: 'Adicional Avulso' },
];

export const FIELDS: FieldDef[] = [
  // Identificação
  { key: 'codigo_contrato', label: 'Código do contrato', type: 'text' },
  { key: 'codigo_cliente', label: 'Código do cliente', type: 'text' },
  // Status
  { key: 'status', label: 'Status (cadastro)', type: 'enum', options: STATUS_OPTIONS },
  { key: 'status_contrato', label: 'Status do contrato', type: 'enum', options: STATUS_CONTRATO_OPTIONS },
  { key: 'tipo_cliente', label: 'Tipo de cliente', type: 'enum', options: TIPO_CLIENTE_OPTIONS },
  { key: 'tipo_venda', label: 'Tipo de venda', type: 'enum', options: TIPO_VENDA_OPTIONS },
  { key: 'reembolsavel', label: 'Marcado como reembolsável', type: 'boolean' },
  // Plano
  { key: 'plano_codigo', label: 'Código do plano', type: 'text' },
  { key: 'plano_valor', label: 'Valor do plano', type: 'number' },
  { key: 'taxa_instalacao', label: 'Taxa de instalação', type: 'number' },
  { key: 'valor_total', label: 'Valor total do contrato', type: 'number' },
  { key: 'dia_vencimento', label: 'Dia de vencimento', type: 'text' },
  // Datas
  { key: 'data_ativacao', label: 'Data de ativação', type: 'date', isDate: true },
  { key: 'data_cancelamento', label: 'Data de cancelamento', type: 'date', isDate: true },
  { key: 'data_pgto_primeira_mensalidade', label: 'Pgto 1ª mensalidade', type: 'date', isDate: true },
  { key: 'data_pgto_segunda_mensalidade', label: 'Pgto 2ª mensalidade', type: 'date', isDate: true },
  { key: 'data_pgto_terceira_mensalidade', label: 'Pgto 3ª mensalidade', type: 'date', isDate: true },
  { key: 'data_recebimento', label: 'Data do recebimento', type: 'date', isDate: true },
  { key: 'data_reembolso', label: 'Data do reembolso', type: 'date', isDate: true },
  { key: 'created_at', label: 'Data de criação do contrato', type: 'date', isDate: true },
  { key: 'updated_at', label: 'Última atualização do contrato', type: 'date', isDate: true },
  // Computado
  { key: 'qtd_pagamentos_efetuados', label: 'Qtd. mensalidades pagas (computado)', type: 'number' },
  // Cancelamento
  { key: 'motivo_cancelamento', label: 'Motivo de cancelamento', type: 'text' },
  // Origem / equipe
  { key: 'origem', label: 'Origem da venda', type: 'text' },
  { key: 'representante_vendas', label: 'Representante de vendas', type: 'text' },
];

export function findField(key: string): FieldDef | undefined {
  return FIELDS.find(f => f.key === key);
}

// Pseudo-campo "today" usado em comparações relativas
export const TODAY_FIELD: FieldDef = { key: 'today', label: 'Hoje', type: 'date', isDate: true };

export const ALL_FIELDS_INCLUDING_TODAY = [TODAY_FIELD, ...FIELDS];
