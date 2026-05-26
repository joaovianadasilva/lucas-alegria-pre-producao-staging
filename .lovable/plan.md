## Por que está dando R$ 40

A régua "Comissão w2a" está configurada assim:

- `tipo_regua`: `faixa_volume`
- `base_faixa`: `planos_vendidos`
- `base_calculo`: `planos_vendidos`
- Faixas: 1-65 → 100%, 66-79 → 120%, 80-100 → 150%, 101-130 → 170%, 131+ → 200%
- Fator: percentual

O edge function (`relatorioReceita`, linhas 1044-1090) processa **contrato por contrato**:

1. Para cada contrato, `baseFaixaValor = planos_vendidos = 1` (cada contrato vale 1 plano).
2. Com volume = 1, sempre cai na faixa **1-65 → 100%**.
3. `baseCalcValor = planos_vendidos = 1`. Como o fator é percentual, `comissao = 1 × (100/100) = R$ 1,00` por contrato.
4. Foram 40 contratos no período → **40 × R$ 1 = R$ 40**.

Há **dois bugs conceituais** sobrepostos:

**Bug 1 — Faixa por volume avaliada por contrato, não pelo ciclo.**
Régua de faixa de volume só faz sentido se o volume for **acumulado no ciclo/período** (ex.: "se vendeu mais de 80 planos no mês, paga 150%"). Hoje a faixa é resolvida individualmente para cada contrato, então toda venda isolada cai na primeira faixa.

**Bug 2 — Percentual aplicado sobre uma contagem (planos_vendidos = 1).**
Quando `base_calculo` é de volume e `tipo_fator` é percentual, a conta vira "100% de 1 unidade = R$ 1", o que é financeiramente sem sentido. Para faixa por volume com fator percentual, a base de cálculo deveria ser **um valor monetário** (`valor_plano`, `valor_total_venda`, etc.) — o "100%" significa "paga 100% do valor do plano vendido".

## Correções propostas

### 1. Agregar volume por ciclo no cálculo da faixa

Em `supabase/functions/central-operacional/index.ts`, dentro de `relatorioReceita`:

- Antes do loop de contratos, para cada régua de volume/híbrida, calcular o **volume acumulado por ciclo** (`evento` / `semanal` / `quinzenal` / `mensal` / `personalizado`), agrupado pelo provedor do contrato.
- Para cada contrato, identificar a janela do ciclo correspondente, somar todos os contratos elegíveis daquela janela para obter `volumeCiclo`, e usar esse valor para selecionar a faixa.
- Manter `tipo_regua: faixa_valor` e `hibrida` com a mesma lógica de acumulação por ciclo (para faixa_valor, acumulando o valor monetário definido em `base_faixa`).
- Implementar utilitário `cicloDe(data, cicloConfig)` que devolve `{inicio, fim}` no edge.

### 2. Defaults inteligentes para `base_calculo`

Quando `tipo_regua ∈ {faixa_volume, faixa_valor, hibrida}` e `base_calculo` é uma base de volume **com fator percentual nas faixas**, fazer fallback automático para uma base de valor da regra de receita vinculada (`base_valor` preferida; senão `valor_plano`). Isso impede o cenário "% sobre 1 unidade = R$ 1".

Alternativamente, deixar o cálculo intacto mas exibir um **alerta amarelo** na tela do relatório quando detectar essa combinação inconsistente, para o usuário entender que precisa ajustar a régua.

### 3. Validador no editor de régua (`src/lib/regras/comissao.ts`)

Adicionar regras em `validateReguaComissao`:

- Se `tipo_regua ∈ {faixa_volume, faixa_valor, hibrida}` e qualquer faixa tem `tipo_fator = percentual`, então `base_calculo` **deve** ser uma base de valor (`isBaseValor`). Caso contrário, retornar mensagem: *"Faixas com fator percentual exigem base de cálculo monetária (ex.: valor do plano)."*
- Mensagem explícita no editor lembrando que faixas por volume são avaliadas pelo total acumulado no ciclo, não por contrato individual.

### 4. Detalhamento no relatório

Na tabela detalhada e na quebra "Por Régua de Comissão", incluir a coluna `Faixa acionada` (já existe no payload mas não é exibida) para tornar visível qual faixa foi aplicada — útil para o usuário entender o resultado.

## Fora de escopo

- Mudar UI da régua para tornar `base_calculo` automático/dependente do tipo (apenas validação por enquanto).
- Persistir resultados de comissão (segue on-the-fly).
- Tratar cancelamento/reembolso (módulo separado, princípio forward-looking mantido).

## Resultado esperado para o caso atual

Após corrigir, com os 40 contratos do período 01-15/05/2026 do provedor w2a:

- O volume acumulado no ciclo (quinzenal) seria 40 planos → faixa **1-65 → 100%**.
- Se a régua for ajustada para `base_calculo = valor_plano` (ou validação obrigatória disso), a comissão passa a ser **100% × soma do valor dos planos vendidos** no ciclo, e não R$ 40.
- Se o usuário quiser manter "R$ X por plano vendido", deve trocar `tipo_fator` para `valor_fixo` nas faixas.
