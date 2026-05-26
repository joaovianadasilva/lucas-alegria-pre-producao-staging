## Regras de Receita — CRUD na aba "Receita"

Adiciona uma terceira classe de regra operacional ("receita") ao lado de Recebimento e Reembolso. Esta entrega é **somente cadastro**: estrutura de dados, editor visual e listagem. Cálculos agregados, dashboards e integrações com relatórios ficam para uma entrega futura.

### Onde aparece

- Tela existente `/central/regras-operacionais` ganha uma terceira aba: **Receita**.
- Mesma listagem (nome, escopo, ativa/inativa, ações ativar/editar/excluir) que hoje existe para Recebimento/Reembolso.
- Botão **Nova regra** abre um editor próprio (separado do `RegraEditorDialog` atual, porque os campos são muito diferentes).

### O que o usuário cadastra

Editor `RegraReceitaEditorDialog` com as seções:

1. **Identificação**
   - Nome
   - Descrição (textarea opcional)
   - Provedores alvo (multi-select) ou "aplica a todos"
   - Status ativo/inativo
   - Vigência inicial (date)
   - Vigência final (date, opcional)

2. **Evento gerador** (radio): `venda` | `ativacao` | `instalacao` | `cancelamento` | `reembolso`

3. **Data de referência** (select): `created_at`, `data_ativacao`, `data_pgto_primeira_mensalidade`, `data_cancelamento`, `data_reembolso`, `data_recebimento` — controla em que data o valor é posicionado no tempo.

4. **Entidades elegíveis** (checkbox group): `plano_principal`, `adicionais`. Pelo menos uma obrigatória.

5. **Condições de elegibilidade** — reaproveita o `GroupEditor` AND/OR do editor atual sobre os campos de contrato (status_contrato, tipo_venda, motivo_cancelamento, etc.). É o que decide quais contratos entram.

6. **Base de valor** (radio): `valor_plano` | `valor_adicionais` | `valor_total_venda`.

7. **Base de volume** (radio): `contratos` | `planos_vendidos` | `adicionais_vendidos`. Texto explicativo deixando claro que volume ≠ valor.

8. **Base de comissão** (collapsible, embutida na mesma regra)
   - Toggle "Esta regra gera base de comissão?"
   - Quando ligado, mostra:
     - Nome da base de comissão
     - Base de valor da comissão (mesmas opções da seção 6, pode divergir)
     - Evento de referência da comissão (mesmas opções da seção 2)
     - Data de referência da comissão (mesmas opções da seção 3)
     - Entidades incluídas (checkbox: plano, adicionais)
     - Entidades excluídas (checkbox: plano, adicionais) — UI valida que não há sobreposição

9. **Validação** antes de salvar: nome preenchido, ao menos um provedor (ou aplica_todos), vigência_inicial preenchida, ao menos uma entidade elegível, base de valor e volume escolhidas, e se a base de comissão estiver ligada, nome e evento/data/base preenchidos.

### Persistência

Não precisa migration nova: usa a tabela existente `regras_operacionais_provedor`. Apenas amplia o domínio do campo `tipo` para aceitar `'receita'` além de `'recebimento'` e `'reembolso'`. O objeto inteiro (vigência, evento, entidades, condições, valor/volume, base_comissao) vai no campo `regra` (JSONB).

Formato do JSON `regra` para o tipo receita:
```json
{
  "descricao": "...",
  "vigencia_inicio": "2026-01-01",
  "vigencia_fim": null,
  "evento_gerador": "venda",
  "data_referencia": "created_at",
  "entidades_elegiveis": ["plano_principal", "adicionais"],
  "condicoes": { "op": "AND", "children": [ ... ] },
  "base_valor": "valor_plano",
  "base_volume": "planos_vendidos",
  "base_comissao": {
    "ativa": true,
    "nome": "Comissão venda W2A",
    "base_valor": "valor_plano",
    "evento_gerador": "venda",
    "data_referencia": "created_at",
    "entidades_incluidas": ["plano_principal"],
    "entidades_excluidas": ["adicionais"]
  }
}
```

### Edge function

`supabase/functions/central-operacional/index.ts`:
- Expandir as validações em `criarRegra` e `atualizarRegra` para aceitar `tipo === 'receita'`.
- Manter `listarRegras` retornando todas; o frontend filtra por aba.
- Não tocar nas actions de elegibilidade de contratos (`listElegiveis`, `confirmar*`) — receita não interfere com recebimento/reembolso nesta entrega.

### Arquivos a alterar

- `supabase/functions/central-operacional/index.ts` — liberar `tipo: 'receita'` em criar/atualizar.
- `src/pages/central/RegrasOperacionais.tsx` — terceira aba "Receita" reutilizando o componente de listagem, mas roteando para o novo editor quando `tipo === 'receita'`.
- `src/components/RegraReceitaEditorDialog.tsx` — **novo**, editor específico de receita.
- `src/lib/regras/receita.ts` — **novo**, tipos TS + catálogos (`EVENTOS_GERADORES`, `DATAS_REFERENCIA`, `ENTIDADES`, `BASES_VALOR`, `BASES_VOLUME`) e função `validateRegraReceita`.

### Fora do escopo desta entrega

- Cálculo agregado por período / dashboard.
- Eventos negativos (cancelamentos como estornos).
- Integração nos relatórios de Visão Geral de Vendas.
- Base de comissão como tabela separada (fica embutida no JSON da regra).
