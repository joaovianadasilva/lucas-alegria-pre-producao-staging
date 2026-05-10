import { FieldType } from './fields';

export interface OperatorDef {
  key: string;
  label: string;
  // forma de input do valor: 'none' | 'text' | 'number' | 'date' | 'enum' | 'multi' | 'date_range' | 'field_offset'
  valueShape: 'none' | 'text' | 'number' | 'date' | 'enum' | 'multi' | 'date_range' | 'field_offset';
}

export const OPERATORS_BY_TYPE: Record<FieldType, OperatorDef[]> = {
  text: [
    { key: 'eq', label: 'igual a', valueShape: 'text' },
    { key: 'neq', label: 'diferente de', valueShape: 'text' },
    { key: 'in', label: 'está em (lista)', valueShape: 'multi' },
    { key: 'not_in', label: 'não está em (lista)', valueShape: 'multi' },
    { key: 'contains', label: 'contém', valueShape: 'text' },
    { key: 'starts_with', label: 'começa com', valueShape: 'text' },
    { key: 'is_null', label: 'está vazio', valueShape: 'none' },
    { key: 'is_not_null', label: 'não está vazio', valueShape: 'none' },
  ],
  enum: [
    { key: 'eq', label: 'igual a', valueShape: 'enum' },
    { key: 'neq', label: 'diferente de', valueShape: 'enum' },
    { key: 'in', label: 'está em (lista)', valueShape: 'multi' },
    { key: 'not_in', label: 'não está em (lista)', valueShape: 'multi' },
    { key: 'is_null', label: 'está vazio', valueShape: 'none' },
    { key: 'is_not_null', label: 'não está vazio', valueShape: 'none' },
  ],
  number: [
    { key: 'eq', label: 'igual a', valueShape: 'number' },
    { key: 'neq', label: 'diferente de', valueShape: 'number' },
    { key: 'gt', label: 'maior que', valueShape: 'number' },
    { key: 'gte', label: 'maior ou igual a', valueShape: 'number' },
    { key: 'lt', label: 'menor que', valueShape: 'number' },
    { key: 'lte', label: 'menor ou igual a', valueShape: 'number' },
    { key: 'is_null', label: 'está vazio', valueShape: 'none' },
    { key: 'is_not_null', label: 'não está vazio', valueShape: 'none' },
  ],
  boolean: [
    { key: 'is_true', label: 'é verdadeiro', valueShape: 'none' },
    { key: 'is_false', label: 'é falso', valueShape: 'none' },
  ],
  date: [
    { key: 'eq', label: 'igual a (data)', valueShape: 'date' },
    { key: 'gt', label: 'depois de', valueShape: 'date' },
    { key: 'gte', label: 'em ou depois de', valueShape: 'date' },
    { key: 'lt', label: 'antes de', valueShape: 'date' },
    { key: 'lte', label: 'em ou antes de', valueShape: 'date' },
    { key: 'between', label: 'entre (datas)', valueShape: 'date_range' },
    { key: 'lte_date_offset', label: 'em ou antes de (campo + offset)', valueShape: 'field_offset' },
    { key: 'gte_date_offset', label: 'em ou depois de (campo + offset)', valueShape: 'field_offset' },
    { key: 'lt_date_offset', label: 'antes de (campo + offset)', valueShape: 'field_offset' },
    { key: 'gt_date_offset', label: 'depois de (campo + offset)', valueShape: 'field_offset' },
    { key: 'is_null', label: 'está vazio', valueShape: 'none' },
    { key: 'is_not_null', label: 'não está vazio', valueShape: 'none' },
  ],
};

export function operatorsForType(t: FieldType): OperatorDef[] {
  return OPERATORS_BY_TYPE[t] || [];
}

export function findOperator(t: FieldType, key: string): OperatorDef | undefined {
  return operatorsForType(t).find(o => o.key === key);
}
