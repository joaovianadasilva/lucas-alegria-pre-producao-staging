export type Operator = 'between' | 'eq' | 'gt' | 'lt' | 'is_set' | 'is_empty';
export type Connector = 'AND' | 'OR';

export interface Condition {
  id: string;
  field: string;
  operator: Operator;
  from?: string;
  to?: string;
  value?: string;
  connector: Connector;
}

export interface FieldDef {
  key: string;
  label: string;
}

export const OPERATORS: { value: Operator; label: string }[] = [
  { value: 'between', label: 'está entre' },
  { value: 'eq', label: 'é igual a' },
  { value: 'gt', label: 'é depois de' },
  { value: 'lt', label: 'é antes de' },
  { value: 'is_set', label: 'está preenchido' },
  { value: 'is_empty', label: 'está vazio' },
];

export const operatorLabel = (op: Operator) =>
  OPERATORS.find(o => o.value === op)?.label || op;

const toISO = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export type PresetKey =
  | 'today' | 'yesterday'
  | 'last7' | 'last30' | 'last90'
  | 'thisMonth' | 'lastMonth';

export const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: 'yesterday', label: 'Ontem' },
  { key: 'last7', label: 'Últimos 7d' },
  { key: 'last30', label: 'Últimos 30d' },
  { key: 'last90', label: 'Últimos 90d' },
  { key: 'thisMonth', label: 'Este mês' },
  { key: 'lastMonth', label: 'Mês passado' },
];

export function getPresetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (key) {
    case 'today':
      return { from: toISO(today), to: toISO(today) };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { from: toISO(y), to: toISO(y) };
    }
    case 'last7': {
      const f = new Date(today); f.setDate(f.getDate() - 6);
      return { from: toISO(f), to: toISO(today) };
    }
    case 'last30': {
      const f = new Date(today); f.setDate(f.getDate() - 29);
      return { from: toISO(f), to: toISO(today) };
    }
    case 'last90': {
      const f = new Date(today); f.setDate(f.getDate() - 89);
      return { from: toISO(f), to: toISO(today) };
    }
    case 'thisMonth': {
      const f = new Date(today.getFullYear(), today.getMonth(), 1);
      const t = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return { from: toISO(f), to: toISO(t) };
    }
    case 'lastMonth': {
      const f = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const t = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toISO(f), to: toISO(t) };
    }
  }
}

function evalCondition(row: any, c: Condition): boolean {
  const raw = row?.[c.field];
  const v = raw ? String(raw).slice(0, 10) : '';
  switch (c.operator) {
    case 'is_set': return !!v;
    case 'is_empty': return !v;
    case 'eq': return !!c.value && v === c.value;
    case 'gt': return !!c.value && !!v && v > c.value;
    case 'lt': return !!c.value && !!v && v < c.value;
    case 'between': {
      if (!v) return false;
      if (c.from && v < c.from) return false;
      if (c.to && v > c.to) return false;
      return !!(c.from || c.to);
    }
  }
}

export function isConditionComplete(c: Condition): boolean {
  switch (c.operator) {
    case 'is_set':
    case 'is_empty': return true;
    case 'between': return !!(c.from || c.to);
    default: return !!c.value;
  }
}

/**
 * Evaluates conditions left-to-right with AND having higher precedence than OR
 * (standard SQL semantics). Incomplete conditions are skipped.
 */
export function evaluateConditions(row: any, conditions: Condition[]): boolean {
  const active = conditions.filter(isConditionComplete);
  if (active.length === 0) return true;

  // Group by OR boundaries: each group is AND-ed, groups are OR-ed.
  const groups: Condition[][] = [[]];
  active.forEach((c, i) => {
    if (i === 0 || c.connector === 'AND') {
      groups[groups.length - 1].push(c);
    } else {
      groups.push([c]);
    }
  });

  return groups.some(g => g.every(c => evalCondition(row, c)));
}

export function summarizeCondition(c: Condition, fields: FieldDef[]): string {
  const f = fields.find(x => x.key === c.field)?.label || c.field;
  const fmt = (s?: string) => {
    if (!s) return '';
    const [y, m, d] = s.split('-');
    return `${d}/${m}/${y}`;
  };
  switch (c.operator) {
    case 'is_set': return `${f} preenchido`;
    case 'is_empty': return `${f} vazio`;
    case 'eq': return `${f} = ${fmt(c.value)}`;
    case 'gt': return `${f} > ${fmt(c.value)}`;
    case 'lt': return `${f} < ${fmt(c.value)}`;
    case 'between':
      return `${f} ${fmt(c.from) || '…'} → ${fmt(c.to) || '…'}`;
  }
}
