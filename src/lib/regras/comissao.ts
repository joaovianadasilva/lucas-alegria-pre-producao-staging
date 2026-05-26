// Catálogos e tipos para RÉGUAS DE COMISSÃO
// Forward-looking: só processa eventos positivos. Cancelamento/reembolso/estorno
// NÃO são tratados aqui — ficam no módulo financeiro existente.

export const TIPOS_REGUA = [
  { value: 'percentual_fixo', label: 'Percentual fixo', desc: 'Comissão = base × percentual único.' },
  { value: 'faixa_volume', label: 'Faixa por volume', desc: 'Faixa definida por quantidade; comissão sobre a mesma base.' },
  { value: 'faixa_valor', label: 'Faixa por valor', desc: 'Faixa definida por valor; comissão sobre a mesma base.' },
  { value: 'valor_fixo_unidade', label: 'Valor fixo por unidade', desc: 'Comissão = quantidade × valor fixo.' },
  { value: 'hibrida', label: 'Híbrida', desc: 'Faixa por uma base (volume ou valor) e cálculo sobre outra base.' },
] as const;

export const BASES_VOLUME = [
  { value: 'planos_vendidos', label: 'Quantidade de planos vendidos' },
  { value: 'adicionais_vendidos', label: 'Quantidade de adicionais' },
  { value: 'contratos', label: 'Quantidade de contratos' },
] as const;

export const BASES_VALOR = [
  { value: 'valor_plano', label: 'Valor do plano' },
  { value: 'valor_adicionais', label: 'Valor dos adicionais' },
  { value: 'valor_total_venda', label: 'Valor total da venda' },
] as const;

export const TODAS_BASES = [...BASES_VOLUME, ...BASES_VALOR] as const;

export const CICLOS = [
  { value: 'evento', label: 'Por evento' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'quinzenal', label: 'Quinzenal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'personalizado', label: 'Personalizado' },
] as const;

export type TipoRegua = typeof TIPOS_REGUA[number]['value'];
export type BaseVolume = typeof BASES_VOLUME[number]['value'];
export type BaseValor = typeof BASES_VALOR[number]['value'];
export type BaseAny = BaseVolume | BaseValor;
export type CicloTipo = typeof CICLOS[number]['value'];

export interface Faixa {
  min: number;
  max: number | null;
  fator: number;
  tipo_fator: 'percentual' | 'valor_fixo';
  descricao?: string;
}

export interface ReguaComissaoJSON {
  descricao?: string;
  vigencia_inicio: string;
  vigencia_fim?: string | null;
  regra_receita_id: string | null;
  tipo_regua: TipoRegua;
  base_faixa?: BaseAny;
  base_calculo: BaseAny;
  faixas: Faixa[];
  percentual_fixo?: number;
  valor_fixo_unidade?: number;
  ciclo: {
    tipo: CicloTipo;
    dia_pagamento?: number;
    intervalo_dias?: number;
    ancora?: string;
  };
}

export function emptyReguaComissao(): ReguaComissaoJSON {
  return {
    descricao: '',
    vigencia_inicio: new Date().toISOString().slice(0, 10),
    vigencia_fim: null,
    regra_receita_id: null,
    tipo_regua: 'percentual_fixo',
    base_calculo: 'valor_total_venda',
    faixas: [],
    percentual_fixo: 100,
    ciclo: { tipo: 'mensal' },
  };
}

export function isBaseVolume(b: string | undefined): b is BaseVolume {
  return !!b && (BASES_VOLUME as readonly { value: string }[]).some(x => x.value === b);
}
export function isBaseValor(b: string | undefined): b is BaseValor {
  return !!b && (BASES_VALOR as readonly { value: string }[]).some(x => x.value === b);
}

export function labelBase(v: string | undefined): string {
  return TODAS_BASES.find(x => x.value === v)?.label || v || '—';
}
export function labelCiclo(v: string | undefined): string {
  return CICLOS.find(x => x.value === v)?.label || v || '—';
}
export function labelTipo(v: string | undefined): string {
  return TIPOS_REGUA.find(x => x.value === v)?.label || v || '—';
}

export function validateReguaComissao(
  nome: string,
  aplicaTodos: boolean,
  provedorIds: string[],
  r: ReguaComissaoJSON,
): string | null {
  if (!nome.trim()) return 'Informe o nome da régua';
  if (!aplicaTodos && provedorIds.length === 0) return 'Selecione provedores ou marque "aplica a todos"';
  if (!r.vigencia_inicio) return 'Informe a vigência inicial';
  if (r.vigencia_fim && r.vigencia_fim < r.vigencia_inicio) return 'Vigência final não pode ser anterior à inicial';
  if (!r.regra_receita_id) return 'Vincule uma Regra de Receita';
  if (!r.tipo_regua) return 'Selecione o tipo da régua';
  if (!r.base_calculo) return 'Selecione a base para cálculo da comissão';

  switch (r.tipo_regua) {
    case 'percentual_fixo':
      if (typeof r.percentual_fixo !== 'number' || r.percentual_fixo <= 0) return 'Informe o percentual fixo';
      break;
    case 'valor_fixo_unidade':
      if (typeof r.valor_fixo_unidade !== 'number' || r.valor_fixo_unidade <= 0) return 'Informe o valor fixo por unidade';
      if (!isBaseVolume(r.base_calculo)) return 'Valor fixo por unidade exige base de volume';
      break;
    case 'faixa_volume':
      if (!isBaseVolume(r.base_faixa)) return 'Faixa por volume exige base de faixa de volume';
      if (!r.faixas.length) return 'Adicione ao menos uma faixa';
      break;
    case 'faixa_valor':
      if (!isBaseValor(r.base_faixa)) return 'Faixa por valor exige base de faixa de valor';
      if (!r.faixas.length) return 'Adicione ao menos uma faixa';
      break;
    case 'hibrida':
      if (!r.base_faixa) return 'Selecione a base para definir a faixa';
      if (r.base_faixa === r.base_calculo) return 'Na régua híbrida, base de faixa e base de cálculo devem ser diferentes';
      if (!r.faixas.length) return 'Adicione ao menos uma faixa';
      break;
  }

  if (['faixa_volume', 'faixa_valor', 'hibrida'].includes(r.tipo_regua)) {
    const ordered = [...r.faixas].sort((a, b) => a.min - b.min);
    for (let i = 0; i < ordered.length; i++) {
      const f = ordered[i];
      if (!(f.min >= 0)) return `Faixa ${i + 1}: limite mínimo inválido`;
      if (f.max != null && f.max < f.min) return `Faixa ${i + 1}: máximo menor que mínimo`;
      if (!(f.fator > 0)) return `Faixa ${i + 1}: fator inválido`;
      if (i > 0) {
        const prev = ordered[i - 1];
        if (prev.max == null) return `Faixa ${i}: só a última faixa pode ter máximo aberto`;
        if (f.min <= prev.max) return `Faixas ${i} e ${i + 1} se sobrepõem`;
      }
    }
    // Faixa com fator percentual aplicada sobre base de contagem é financeiramente inconsistente
    const temFatorPercentual = r.faixas.some(f => f.tipo_fator === 'percentual');
    if (temFatorPercentual && isBaseVolume(r.base_calculo)) {
      return 'Faixas com fator percentual exigem base de cálculo monetária (ex.: valor do plano). Para "R$ por unidade", use fator do tipo "valor fixo".';
    }
  }

  if (!r.ciclo?.tipo) return 'Selecione o ciclo de apuração';
  if (r.ciclo.tipo === 'personalizado' && !(r.ciclo.intervalo_dias && r.ciclo.intervalo_dias > 0)) {
    return 'Ciclo personalizado exige intervalo em dias';
  }
  return null;
}

export interface RegraReceitaResumo {
  id: string;
  nome: string;
  ativo: boolean;
  aplica_todos: boolean;
  provedor_ids: string[];
  base_valor?: string;
  base_volume?: string;
  base_comissao_ativa?: boolean;
}

// Dado uma regra de receita selecionada, devolve as bases que ela disponibiliza
export function basesDisponiveis(receita: RegraReceitaResumo | null | undefined): {
  volumes: BaseVolume[]; valores: BaseValor[];
} {
  if (!receita) return { volumes: [...BASES_VOLUME.map(b => b.value)] as BaseVolume[], valores: [...BASES_VALOR.map(b => b.value)] as BaseValor[] };
  const volumes = receita.base_volume && isBaseVolume(receita.base_volume) ? [receita.base_volume] : [];
  const valores = receita.base_valor && isBaseValor(receita.base_valor) ? [receita.base_valor] : [];
  return { volumes, valores };
}

export function previewRegua(
  r: ReguaComissaoJSON,
  receitaNome: string | undefined,
): string {
  const ciclo = labelCiclo(r.ciclo.tipo).toLowerCase();
  const calc = labelBase(r.base_calculo).toLowerCase();
  const faixa = r.base_faixa ? labelBase(r.base_faixa).toLowerCase() : '';
  const receita = receitaNome ? `Regra: ${receitaNome}` : 'a regra de receita vinculada';
  switch (r.tipo_regua) {
    case 'percentual_fixo':
      return `A cada ${ciclo}, aplica ${r.percentual_fixo ?? 0}% sobre ${calc} (base de ${receita}).`;
    case 'valor_fixo_unidade':
      return `A cada ${ciclo}, multiplica ${calc} por R$ ${r.valor_fixo_unidade ?? 0} por unidade (base de ${receita}).`;
    case 'faixa_volume':
    case 'faixa_valor':
      return `A cada ${ciclo}, define a faixa por ${faixa} e aplica o fator da faixa sobre o mesmo (base de ${receita}).`;
    case 'hibrida':
      return `A cada ${ciclo}, define a faixa por ${faixa} e aplica o fator da faixa sobre ${calc} (base de ${receita}).`;
  }
}
