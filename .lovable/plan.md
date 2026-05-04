## Ajustes no relatório Visão Geral de Vendas

### 1. Gráfico de Cadastros vs Instalações por dia
Trocar `LineChart` por `BarChart` vertical agrupado (recharts), em `src/pages/central/RelatorioVisaoGeralVendas.tsx`:
- Duas barras lado a lado por dia: "Cadastrados" (cor primária) e "Instalados" (verde).
- `XAxis` com data formatada (`dd/MM`), `YAxis` inteiro, tooltip e legenda mantidos.
- Mantém comportamento responsivo e altura atual (320px).

### 2. Renomear "MRR" → "Valor" + separar Cadastrados vs Instalados

**Backend (`supabase/functions/central-operacional/index.ts`, action `relatorioVisaoGeralVendas`)**

Hoje a composição só calcula valores em cima dos instalados. Adicionar também a soma do valor para os cadastrados em cada grupo (com/sem adicionais), ficando:

```ts
composicao: {
  semAdicionais: {
    cadastrados: number,
    instalados: number,
    valorPlanoCadastrados: number,   // Σ plano_valor dos cadastrados sem adicionais
    valorPlanoInstalados: number,    // Σ plano_valor dos instalados sem adicionais
  },
  comAdicionais: {
    cadastrados: number,
    instalados: number,
    valorPlanoCadastrados: number,
    valorAdicionaisCadastrados: number,
    valorPlanoInstalados: number,
    valorAdicionaisInstalados: number,
  }
}
```

Cálculo: ao iterar `cadastrados`, somar `plano_valor` no grupo correspondente (com/sem adicionais) e somar `adicional_valor` das linhas de `adicionais_contrato` ligadas a esses contratos. O cálculo dos instalados continua igual, só renomeado.

**Frontend (cards "Sem adicionais" / "Com adicionais")**

Substituir todas as labels "MRR" por "Valor" e exibir as duas vertentes claramente separadas:

- **Sem adicionais**
  - Cadastrados: `N` — Valor planos: `R$ X`
  - Instalados: `N` — Valor planos: `R$ X` (destacado)

- **Com adicionais**
  - Cadastrados: `N` — Valor planos: `R$ X` — Valor adicionais: `R$ Y` — Valor total: `R$ X+Y`
  - Instalados: `N` — Valor planos: `R$ X` — Valor adicionais: `R$ Y` — Valor total: `R$ X+Y` (destacado)

Layout sugerido em cada card: dois sub-blocos com título ("Cadastrados" / "Instalados"), cada um listando contagem e valores correspondentes, separados por uma linha divisória sutil.

### Arquivos
- `supabase/functions/central-operacional/index.ts`
- `src/pages/central/RelatorioVisaoGeralVendas.tsx`
