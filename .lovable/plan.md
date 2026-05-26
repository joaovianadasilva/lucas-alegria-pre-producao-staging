
# Relatório de Receita

Novo relatório em `/central/relatorios/visao-geral-receita`, no padrão visual de `RelatorioVisaoGeralVendas`.

## Princípios

- **Faturamento** = soma das bases produzidas pelas **Regras de Receita** aplicadas aos contratos do período.
- **Comissão** = aplicação das **Réguas de Comissão ativas** sobre as bases geradas pelas regras de receita vinculadas.
- **Forward-looking**: ignora cancelamentos, reembolsos e estornos (alinhado à régua de comissão).
- **Filtros**: período (presets + custom) e provedor (multi-select). Sem outros filtros.

## Filtros (topo)

- Provedores (multi-select, igual ao relatório de vendas)
- Presets: Hoje, 7 dias, Mês atual, Mês anterior, Ano, Customizado
- Datas início/fim + botão "Aplicar filtros"

## Visão consolidada

**Linha 1 — KPIs de percepção (contexto de vendas):**
- Contratos vendidos (cadastrados no período) — qtd + valor_total somado
- Contratos instalados no período — qtd + valor_total somado

**Linha 2 — KPIs de receita e comissão:**
- Faturamento total no período (soma das bases produzidas por todas as regras de receita aplicáveis)
- Comissão total no período (soma da comissão calculada por todas as réguas ativas)
- Ticket médio (faturamento / nº de contratos com base gerada)
- % comissão sobre faturamento

**Linha 3 — Gráfico temporal:** barras por dia mostrando Faturamento × Comissão.

**Linha 4 — Quebra por Regra de Receita:** tabela com nome da regra · contratos atingidos · base gerada (R$) · % do total.

**Linha 5 — Quebra por Régua de Comissão:** tabela com nome da régua · regra de receita vinculada · base de cálculo (R$) · comissão (R$) · faixa(s) acionada(s).

## Visão detalhada

Tabela linha-a-linha (paginada 20/pág), exportável CSV:

| Contrato | Cliente | Provedor | Data evento | Plano | Valor contrato | Regra de receita | Base gerada | Régua aplicada | Comissão |

Filtro extra local na tabela: busca por código/cliente.

## Backend — edge function `central-operacional`

Nova action `relatorioReceita({ provedorIds?, dataInicio, dataFim })`:

1. Buscar contratos do(s) provedor(es) com `data_ativacao` (preferência) ou `created_at` no período — define o "evento" usado pela régua.
2. Buscar `regras_operacionais_provedor` ativas tipo `receita` e tipo `comissao` aplicáveis (provedor específico ou `aplica_todos`), respeitando `vigencia_inicio/fim` quando existir.
3. Para cada contrato:
   - Avaliar **cada Regra de Receita** aplicável → gera 0..n bases (`{ regra_id, regra_nome, valor, tipo_base }`). Reutilizar `src/lib/regras/receita.ts` (engine de avaliação) — portar funções puras para o edge.
   - Para cada base, encontrar Réguas de Comissão ativas que tenham `regra_receita_id` = regra → aplicar `tipo_regua` + faixas para obter `comissao`. Reutilizar lógica de `src/lib/regras/comissao.ts`.
4. Agregar:
   - KPIs (vendas, instalações, faturamento, comissão, ticket, %)
   - Série temporal por `data_ativacao` (fallback `created_at`)
   - Breakdown por regra de receita e por régua de comissão
   - Linhas detalhadas

Resposta:
```json
{
  "kpis": { ... },
  "serieTemporal": [{ "data", "faturamento", "comissao" }],
  "porRegraReceita": [...],
  "porReguaComissao": [...],
  "detalhado": [...]
}
```

## Frontend

- `src/pages/central/RelatorioVisaoGeralReceita.tsx` — novo, espelhando o padrão de Vendas.
- Rota em `App.tsx`: `/central/relatorios/visao-geral-receita`.
- Item de menu em `CentralSidebar.tsx` na seção Relatórios.
- Exportar CSV do detalhado (client-side).

## Fora de escopo

- Edição/criação de regras (já existe).
- Persistir cálculos (tudo on-the-fly).
- Tratamento de cancelamento/reembolso (módulos próprios).
- Filtro por representante/origem/régua específica.

## Premissas

- "Data do evento" para faturamento/comissão = `data_ativacao`; quando ausente, `created_at`. (Confirmar se prefere apenas `data_ativacao`.)
- Engines de regra (`receita.ts`, `comissao.ts`) são portáveis para Deno — caso usem libs incompatíveis, será criada cópia minimalista no edge.
- Quando contrato cair em múltiplas regras de receita, todas geram base (somadas no faturamento total).
