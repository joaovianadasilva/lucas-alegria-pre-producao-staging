## Relatório de Caixa

Nova tela em **Central → Relatórios → Caixa** (`/central/relatorios/caixa`), seguindo o padrão visual do Relatório de Receita (filtros de provedores + período preset/custom + botão Aplicar).

### KPIs (cards no topo)

| Indicador | Definição |
|---|---|
| Contas a Receber | Faturamento gerado pelas Regras de Receita no período (mesma base do Relatório de Receita) |
| Receita Recebida | Soma de `valor_total` dos contratos com `recebimento_efetivado = true` e `data_recebimento` dentro do período |
| Reembolsos a Pagar | Soma de `valor_total` dos contratos com `reembolsavel = true` e `reembolso_efetivado = false`, considerando `data_cancelamento` dentro do período (fallback `created_at` quando não houver) |
| Reembolsos Pagos | Soma de `valor_total` dos contratos com `reembolso_efetivado = true` e `data_reembolso` dentro do período |
| Despesas Pagas | Placeholder = R$ 0 (campo preparado para futuro) |
| Fluxo de Caixa Líquido | Receita Recebida − Reembolsos Pagos − Despesas Pagas |

### Tabela: KPIs por provedor

Linhas = provedores selecionados (ou todos). Colunas = Contas a Receber, Receita Recebida, Reembolsos a Pagar, Reembolsos Pagos, Fluxo Líquido. (Despesas omitida.)

### Listas detalhadas

**Bloco 1 — duas tabelas lado a lado:**

1. **Contratos vendidos no período** (filtrados por `created_at`), com coluna "Status de recebimento":
   - `Recebido` quando `recebimento_efetivado = true`
   - `Elegível` quando `reembolsavel = false` e ainda não recebido
   - `Pendente` quando `reembolsavel = true` e ainda não recebido/reembolsado
2. **Contratos reembolsáveis no período** (`reembolsavel = true`, por `data_cancelamento`/`created_at`), com status do reembolso (Pendente / Pago) e botão de exportação CSV (compatível com Google Sheets).

**Bloco 2 — duas tabelas lado a lado:**

3. **Contratos Recebidos** no período (`recebimento_efetivado=true`, `data_recebimento` ∈ período).
4. **Contratos Reembolsados** no período (`reembolso_efetivado=true`, `data_reembolso` ∈ período).

Todas as linhas das 4 tabelas são clicáveis e abrem o `ContractDetailsDialog` (mesmo padrão do Relatório de Receita), permitindo editar inclusive recebimento/reembolso. Ao fechar, o relatório é invalidado e recarregado.

### Detalhes técnicos

- **Edge function**: adicionar `action: 'relatorioCaixa'` em `supabase/functions/central-operacional/index.ts`. Reaproveita a lógica de "faturamento por regras de receita" do `relatorioReceita` para Contas a Receber, e busca contratos por três janelas (`created_at`, `data_recebimento`, `data_reembolso`, `data_cancelamento`) para os demais indicadores. Retorna KPIs globais, breakdown por provedor e as 4 listas detalhadas.
- **Frontend**: novo arquivo `src/pages/central/RelatorioCaixa.tsx` espelhando o layout de `RelatorioVisaoGeralReceita.tsx` (filtros, presets, KPI cards, tabelas, paginação 20/pg, busca, export CSV nas listas).
- **Rota**: adicionar `/central/relatorios/caixa` em `src/App.tsx`.
- **Sidebar**: adicionar item "Caixa" em `src/components/CentralSidebar.tsx` no grupo Relatórios.
- Sem mudanças de schema.
