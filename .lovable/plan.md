# Adicionar `created_at` e `updated_at` ao builder de regras

## Mudanças

### 1. `src/lib/regras/fields.ts`
Adicionar dois campos na seção "Datas":

```ts
{ key: 'created_at', label: 'Data de criação do contrato', type: 'date', isDate: true },
{ key: 'updated_at', label: 'Última atualização do contrato', type: 'date', isDate: true },
```

Eles automaticamente aparecem:
- no select de campos do `ConditionRow`
- na lista de campos de data disponíveis para `lte_date_offset`/`gte_date_offset` (via `ALL_FIELDS_INCLUDING_TODAY.filter(f => f.isDate)`)

### 2. `supabase/functions/central-operacional/index.ts`
No avaliador, garantir que `created_at`/`updated_at` (que vêm como timestamps ISO completos) sejam tratados como datas. O parser de datas já existente precisa aceitar tanto `YYYY-MM-DD` quanto `YYYY-MM-DDTHH:mm:ss...` — verificar e ajustar a função de leitura de campo de data se necessário (truncar para os 10 primeiros caracteres antes de comparar).

Sem alterações de banco. Sem alterações de UI além das acima.

## Validação
- Abrir editor de regra → campo "Data de criação do contrato" disponível.
- Operador "em ou antes de (campo + offset)" lista `created_at`/`updated_at` como referência.
- Testar regra com contrato real retorna resultado correto (sem erro de parsing de data).
