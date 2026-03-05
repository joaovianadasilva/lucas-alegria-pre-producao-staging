

## Corrigir constraints UNIQUE em `slots` e `agendamentos` para multi-provedor

### Problema

Duas tabelas possuem constraints/indices UNIQUE que nao incluem `provedor_id`, impedindo que provedores diferentes usem os mesmos numeros de slot ou agendem na mesma data/slot:

| Tabela | Index atual | Deveria ser |
|---|---|---|
| `slots` | `UNIQUE(data_disponivel, slot_numero)` | `UNIQUE(data_disponivel, slot_numero, provedor_id)` |
| `agendamentos` | `UNIQUE(data_agendamento, slot_numero) WHERE status != 'cancelado'` | `UNIQUE(data_agendamento, slot_numero, provedor_id) WHERE status != 'cancelado'` |

A constraint `agendamentos_contrato_id_key` em `UNIQUE(contrato_id)` nao precisa de alteracao pois `contrato_id` ja e UUID globalmente unico.

### Solucao

Uma migration SQL que:

1. Remove o indice `unique_slot_per_date` da tabela `slots`
2. Recria incluindo `provedor_id`
3. Remove o indice parcial `agendamentos_data_slot_unique_active` da tabela `agendamentos`
4. Recria incluindo `provedor_id`

```sql
-- slots
DROP INDEX IF EXISTS unique_slot_per_date;
CREATE UNIQUE INDEX unique_slot_per_date ON slots (data_disponivel, slot_numero, provedor_id);

-- agendamentos
DROP INDEX IF EXISTS agendamentos_data_slot_unique_active;
CREATE UNIQUE INDEX agendamentos_data_slot_unique_active
  ON agendamentos (data_agendamento, slot_numero, provedor_id)
  WHERE (status <> 'cancelado');
```

### Resumo

- 1 migration com 4 statements (2 DROP + 2 CREATE)
- Nenhuma alteracao em edge functions ou frontend
- Corrige o isolamento multi-tenant para slots e agendamentos

