Add two new ranking tables to the **Visão Geral de Vendas** report, positioned between the existing Planos/Adicionais rankings and the "Cancelamentos por motivo" chart.

## Backend — `supabase/functions/central-operacional/index.ts`

In the `relatorioVisaoGeralVendas` action:

1. Include `origem` and `representante_vendas` in the SELECT for both the `cadastrados` and `instalados` queries.
2. Build two new aggregation maps similar to `planosMap`, grouping by `origem` and `representante_vendas`:
   - Each entry: `{ chave, cadastrados, instalados }`
   - Increment `cadastrados` for each contract in the cadastrados set; `instalados` for each in the instalados set.
   - Treat empty/null as `"Não informado"`.
   - Sort by `(cadastrados + instalados)` desc. No top-N cap (origens/representantes are usually a small set; if it grows, we can revisit).
3. Add to response payload:
   ```ts
   rankings: {
     planos: ...,
     adicionais: ...,
     origens: [{ chave, cadastrados, instalados }],
     representantes: [{ chave, cadastrados, instalados }],
   }
   ```

## Frontend — `src/pages/central/RelatorioVisaoGeralVendas.tsx`

1. Extend the `Relatorio` interface `rankings` with `origens` and `representantes` arrays.
2. Insert a new grid row (just before the "Cancelamentos por motivo" Card) with two cards side-by-side:
   - **Vendas por origem** — columns: Origem | Cadastrados | Instalados
   - **Vendas por representante** — columns: Representante | Cadastrados | Instalados
   - Same Table styling as the existing Planos ranking, with empty-state row when zero.

No DB migration required.