## Correções no módulo "Todos os Contratos" (Central)

### 1. Exportação CSV exporta apenas a página atual
**Causa:** `exportCSV()` usa `result?.contratos`, que vem paginado (20 por vez) do edge function.

**Correção:**
- Adicionar action `exportContratos` em `supabase/functions/central-operacional/index.ts`, reaproveitando a mesma lógica de filtros do `listContratos`, porém **sem `.range()`** (busca todas as linhas) e selecionando apenas as colunas necessárias para o CSV.
- Limite defensivo de segurança (ex.: 50.000 linhas) para evitar payloads gigantes; se exceder, retorna erro pedindo refinar filtros.
- Em `ContratosCentral.tsx`, transformar `exportCSV` em async: invocar `central-operacional` com `action: 'exportContratos'` + filtros atuais, gerar CSV a partir do retorno completo, mostrar toast de progresso/sucesso.

### 2. Coluna "Criado" exibe "Invalid Date"
**Causa:** `created_at` é um timestamp ISO completo (`2026-05-04T22:40:16.000Z`). `formatLocalDate` faz `split('-')` esperando `YYYY-MM-DD`, então o "day" vira `04T22:40:16...` e o `Date` resulta inválido.

**Correção:**
- Atualizar `src/lib/dateUtils.ts` → `parseLocalDate` para aceitar tanto `YYYY-MM-DD` quanto timestamps ISO completos: detectar `T` e usar somente os 10 primeiros caracteres antes do split (preservando comportamento atual e a regra de timezone-safe).
- Nenhuma mudança necessária nos pontos de uso; isso conserta a coluna "Criado" e qualquer outro lugar que passe timestamp completo para `formatLocalDate`.

### Arquivos afetados
- `supabase/functions/central-operacional/index.ts` (nova action `exportContratos`)
- `src/pages/central/ContratosCentral.tsx` (`exportCSV` async chamando a nova action)
- `src/lib/dateUtils.ts` (`parseLocalDate` aceitando ISO completo)
