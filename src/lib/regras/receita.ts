// Catálogos e tipos para regras de RECEITA

export const EVENTOS_GERADORES = [
  { value: 'venda', label: 'Venda (cadastro do contrato)' },
  { value: 'ativacao', label: 'Ativação' },
] as const;

export const EVENTOS_GERADORES_VALIDOS = ['venda', 'ativacao'] as const;

// Default de data de referência sugerido para cada evento gerador
export const DATA_REFERENCIA_PADRAO: Record<string, string> = {
  venda: 'created_at',
  ativacao: 'data_ativacao',
};

export const DATAS_REFERENCIA = [
  { value: 'created_at', label: 'Data da venda (created_at)' },
  { value: 'data_ativacao', label: 'Data de ativação' },
  { value: 'data_pgto_primeira_mensalidade', label: 'Pgto 1ª mensalidade' },
  { value: 'data_recebimento', label: 'Data de recebimento' },
] as const;

export const ENTIDADES = [
  { value: 'plano_principal', label: 'Plano principal' },
  { value: 'adicionais', label: 'Adicionais' },
] as const;

export const BASES_VALOR = [
  { value: 'valor_plano', label: 'Valor do plano' },
  { value: 'valor_adicionais', label: 'Valor dos adicionais' },
  { value: 'valor_total_venda', label: 'Valor total da venda' },
] as const;

export const BASES_VOLUME = [
  { value: 'contratos', label: 'Quantidade de contratos' },
  { value: 'planos_vendidos', label: 'Quantidade de planos vendidos' },
  { value: 'adicionais_vendidos', label: 'Quantidade de adicionais' },
] as const;

export type EventoGerador = typeof EVENTOS_GERADORES[number]['value'];
export type DataReferencia = typeof DATAS_REFERENCIA[number]['value'];
export type Entidade = typeof ENTIDADES[number]['value'];
export type BaseValor = typeof BASES_VALOR[number]['value'];
export type BaseVolume = typeof BASES_VOLUME[number]['value'];

export interface BaseComissao {
  ativa: boolean;
  nome?: string;
  base_valor?: BaseValor;
  evento_gerador?: EventoGerador;
  data_referencia?: DataReferencia;
  entidades_incluidas?: Entidade[];
  entidades_excluidas?: Entidade[];
}

export interface RegraReceitaJSON {
  descricao?: string;
  vigencia_inicio: string;
  vigencia_fim?: string | null;
  evento_gerador: EventoGerador;
  data_referencia: DataReferencia;
  entidades_elegiveis: Entidade[];
  condicoes: { op: 'AND' | 'OR'; children: any[] };
  base_valor: BaseValor;
  base_volume: BaseVolume;
  base_comissao: BaseComissao;
}

export function emptyRegraReceita(): RegraReceitaJSON {
  return {
    descricao: '',
    vigencia_inicio: new Date().toISOString().slice(0, 10),
    vigencia_fim: null,
    evento_gerador: 'venda',
    data_referencia: 'created_at',
    entidades_elegiveis: ['plano_principal'],
    condicoes: { op: 'AND', children: [] },
    base_valor: 'valor_plano',
    base_volume: 'planos_vendidos',
    base_comissao: { ativa: false },
  };
}

export function validateRegraReceita(nome: string, aplicaTodos: boolean, provedorIds: string[], r: RegraReceitaJSON): string | null {
  if (!nome.trim()) return 'Informe o nome da regra';
  if (!aplicaTodos && provedorIds.length === 0) return 'Selecione provedores ou marque "aplica a todos"';
  if (!r.vigencia_inicio) return 'Informe a vigência inicial';
  if (r.vigencia_fim && r.vigencia_fim < r.vigencia_inicio) return 'Vigência final não pode ser anterior à inicial';
  if (!(EVENTOS_GERADORES_VALIDOS as readonly string[]).includes(r.evento_gerador)) {
    return 'Evento gerador inválido: selecione Venda ou Ativação';
  }
  if (!r.entidades_elegiveis || r.entidades_elegiveis.length === 0) return 'Selecione ao menos uma entidade elegível';
  if (!r.base_valor) return 'Selecione a base de valor';
  if (!r.base_volume) return 'Selecione a base de volume';
  if (r.base_comissao.ativa) {
    const bc = r.base_comissao;
    if (!bc.nome?.trim()) return 'Informe o nome da base de comissão';
    if (!bc.base_valor) return 'Selecione a base de valor da comissão';
    if (!bc.evento_gerador) return 'Selecione o evento de referência da comissão';
    if (!bc.data_referencia) return 'Selecione a data de referência da comissão';
    const inc = new Set(bc.entidades_incluidas || []);
    const exc = new Set(bc.entidades_excluidas || []);
    for (const e of inc) if (exc.has(e)) return 'Uma entidade não pode estar incluída e excluída ao mesmo tempo na base de comissão';
  }
  return null;
}
