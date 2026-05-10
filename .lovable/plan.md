## Mecanismo de regras configuráveis (recebimento / reembolso)

Substituir o atual formato fixo do JSON `regra` por um **builder de condições aninhadas (AND/OR)**, com **múltiplas regras por tipo+provedor** (OR entre regras), e regras que podem ser aplicadas a uma **lista de provedores alvo**. UI de gestão na Central de Controle (super_admin).

### 1. Banco — `regras_operacionais_provedor`

Manter a tabela, mas relaxar e ampliar:

- Tornar `provedor_id` **nullable** (regra global = `null` aplicada via `provedor_ids`).
- Adicionar `provedor_ids uuid[] NOT NULL DEFAULT '{}'` — lista de provedores alvo. `'{}' + aplica_todos=true` = todos.
- Adicionar `aplica_todos boolean NOT NULL DEFAULT false`.
- Adicionar `nome text NOT NULL` (descrição amigável p/ UI).
- Adicionar `prioridade int DEFAULT 0` (ordenação).
- Manter `tipo` (`'recebimento' | 'reembolso'`), `ativo`, `regra jsonb`.
- Index: `(tipo, ativo)`, GIN em `provedor_ids`.

**Formato do `regra` (JSONB) — árvore de condições:**

```json
{
  "op": "AND",
  "children": [
    { "field": "status_contrato", "operator": "eq", "value": "cancelado" },
    {
      "op": "OR",
      "children": [
        { "field": "motivo_cancelamento", "operator": "in", "value": ["6","12"] }
      ]
    },
    {
      "field": "data_cancelamento",
      "operator": "lte_date_offset",
      "ref": "data_ativacao",
      "offset": { "months": 2 }
    }
  ]
}
```

Tipos de nó:
- **Grupo**: `{ op: 'AND'|'OR', children: Node[] }`
- **Condição simples**: `{ field, operator, value }`
- **Condição comparando campos/datas**: `{ field, operator, ref, offset? }`

Operadores suportados (v1):
- Genéricos: `eq`, `neq`, `in`, `not_in`, `is_null`, `is_not_null`, `is_true`, `is_false`
- Numéricos: `gt`, `gte`, `lt`, `lte`
- Datas: `gt`, `gte`, `lt`, `lte` (vs valor literal `YYYY-MM-DD` ou `today`), `between`, e `lte_date_offset`/`gte_date_offset` (vs outro campo + offset em `days`/`months`)
- Texto: `contains`, `starts_with`

Campos disponíveis (v1) — derivados de `contratos`:
`status_contrato, status, tipo_cliente, plano_codigo, plano_valor, dia_vencimento, taxa_instalacao, valor_total, reembolsavel, motivo_cancelamento, data_ativacao, data_cancelamento, data_pgto_primeira_mensalidade, data_pgto_segunda_mensalidade, data_pgto_terceira_mensalidade, qtd_pagamentos_efetuados (computado), origem, representante_vendas, codigo_cliente, codigo_contrato`.

RLS: continua "only functions can modify"; SELECT só super_admin (já não há leitura por admins comuns hoje).

### 2. Backend — `supabase/functions/central-operacional`

- Substituir a função `contratoElegivel` por um **avaliador genérico** `evaluateNode(node, contrato)` que percorre a árvore.
- Para cada contrato + tipo: pegar todas as regras `ativo=true` do tipo cuja `aplica_todos=true` OU `provedor_id = c.provedor_id` OU `c.provedor_id = ANY(provedor_ids)`. Contrato é elegível se **qualquer regra** avalia para `true` (OR entre regras). Mantém os pre-checks fixos: `recebimento_efetivado=false` para recebimento e `reembolso_efetivado=false` para reembolso.
- Novas actions (apenas super_admin, igual o resto do arquivo):
  - `listarRegras({ tipo? })`
  - `criarRegra({ nome, tipo, provedor_ids, aplica_todos, regra, ativo, prioridade })`
  - `atualizarRegra({ id, ... })`
  - `excluirRegra({ id })` (soft via `ativo=false` ou hard delete)
  - `testarRegra({ regra, contratoId })` → retorna `{ resultado, trace }` para depuração.
- Validar a árvore (schema Zod) antes de salvar.

### 3. Frontend — Central de Controle

**Sidebar (`CentralSidebar.tsx`)**: novo grupo "Configurações" → item **"Regras Operacionais"** → rota `/central/regras`.

**Nova página `src/pages/central/RegrasOperacionais.tsx`**:
- Tabs: `Recebimento` | `Reembolso`.
- Lista de regras (nome, escopo — "Todos provedores" ou chips de provedores, status ativo, ações editar/duplicar/excluir).
- Botão "Nova regra" → abre modal `RegraEditorDialog`.

**`src/components/RegraEditorDialog.tsx`** (componente novo, reutilizável):
- Campos topo: `nome`, `tipo` (read-only no contexto), `ativo`, `aplica_todos` + multiselect de provedores quando `aplica_todos=false`.
- **Builder visual recursivo** (`ConditionGroup` + `ConditionRow`):
  - Cabeçalho do grupo com toggle AND/OR.
  - Botões "+ Condição", "+ Grupo", "Remover".
  - `ConditionRow`: select de campo → select de operador (filtrado pelo tipo do campo) → input de valor (texto/número/select para campos enumerados como `status_contrato`, `tipo_cliente`, `motivo_cancelamento`; date picker para datas; multi-select para `in/not_in`; "outro campo + offset" para `*_date_offset`).
  - Catálogo de campos centralizado em `src/lib/regras/fields.ts` com `{ key, label, type, options? }`; operadores em `src/lib/regras/operators.ts`.
- **Painel "Testar regra"**: input de `código_contrato` ou `id` → chama `testarRegra` → mostra `true/false` + trace por nó (✓/✗) para diagnóstico.

### 4. Compatibilidade / migração de dados

- Hoje o JSON `regra` usa o formato antigo (`exige_pagamentos`, `dias_apos_ativacao` etc.). Manter um **adapter** no edge function: se a regra não tiver `op`/`children`, traduz on-the-fly para a árvore equivalente (sem migração destrutiva). Usuário pode reeditar pela nova UI quando quiser.

### Detalhes técnicos

- Cálculo de offsets de data feito no servidor com `Date` UTC + ajuste; nunca confiar em fuso do navegador (consistente com `formatLocalDate`).
- `qtd_pagamentos_efetuados` é computado a partir das três colunas `data_pgto_*_mensalidade`.
- Zod schema da árvore previne payloads inválidos; `testarRegra` é seguro (read-only).
- Sem mudanças em telas existentes de Recebimentos/Reembolsos — elas continuam consumindo `listElegiveis` e passam a refletir as novas regras automaticamente.
- Logs de auditoria em `historico_contratos` permanecem inalterados.

### Exemplos cobrindo os casos da W2A

1. *"Plano com data_ativacao é elegível para recebimento"*:
   ```json
   { "op":"AND", "children":[{"field":"data_ativacao","operator":"is_not_null"}] }
   ```
2. *"Cancelado em até 2 meses após ativação com motivo 6 ou 12 → elegível para reembolso"*:
   ```json
   { "op":"AND", "children":[
     { "field":"status_contrato","operator":"eq","value":"cancelado" },
     { "field":"motivo_cancelamento","operator":"in","value":["6","12"] },
     { "field":"data_cancelamento","operator":"lte_date_offset","ref":"data_ativacao","offset":{"months":2} }
   ]}
   ```
