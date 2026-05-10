## Objetivo

Reformular o filtro de datas em **Recebimentos** e **Reembolsos** para um query builder visual no estilo "campo + condição + valor", combinável com **E/OU**, com presets rápidos e UX moderna.

## UX proposta

Substituir o popover "Filtros de data" por um **construtor de condições** dentro do card "Filtros":

```text
[ Data de criação ▾ ]  [ está entre ▾ ]  [ 01/05/2026 → 10/05/2026 ]  [ Hoje | 7d | 30d | Mês ]  [ x ]
   E   ─────────────────────────────────────────────────────────────────────────────────────────────
[ Data de ativação ▾ ] [ é maior que ▾ ] [ 01/04/2026 ]                                            [ x ]
   OU  ─────────────────────────────────────────────────────────────────────────────────────────────
[ Data de cancelamento ▾ ] [ está vazio ▾ ]                                                        [ x ]

[ + Adicionar condição ]   [ Limpar tudo ]
```

### Componentes de cada linha

1. **Campo** (Select com ícone de calendário): created_at, data_ativacao, data_cancelamento, data_recebimento, data_reembolso, data_pgto_1ª/2ª/3ª mensalidade.
2. **Condição** (Select):
   - está entre
   - é igual a
   - é maior que (depois de)
   - é menor que (antes de)
   - está preenchido
   - está vazio
3. **Valor**: muda conforme a condição
   - "está entre" → range picker visual (Calendar `mode="range"` em Popover) com chips de preset ao lado: **Hoje**, **Ontem**, **Últimos 7d**, **Últimos 30d**, **Últimos 90d**, **Este mês**, **Mês passado**.
   - "é igual / maior / menor" → date picker único (Calendar `mode="single"`).
   - "preenchido / vazio" → sem campo de valor.
4. **Conector** entre linhas: chip clicável que alterna entre **E** / **OU** (padrão E).
5. **Remover linha** (ícone X).

### Estado vazio

Quando não há condições, o card mostra um CTA discreto: `+ Adicionar filtro de data` com ícone de calendário e dica "Combine condições com E/OU".

### Resumo ativo

Acima da tabela, exibir uma linha de chips resumindo as condições ativas (ex: "Criação entre 01/05–10/05  E  Ativação > 01/04"), com X individual em cada chip — espelha o estado do builder e permite remoção rápida sem reabrir o painel.

### Comportamento de avaliação

- Avaliação client-side sobre `contratos`. Cada condição gera um predicado; combinam-se com **E**/**OU** seguindo a ordem do builder, com **E** tendo precedência maior que **OU** (agrupamento padrão de SQL). Sem parênteses na v1 — se ficar limitado, evoluímos depois.
- Datas comparadas usando os primeiros 10 chars (`YYYY-MM-DD`) para evitar problemas de timezone (consistente com `formatLocalDate`).
- Filtros aplicam-se nas duas abas e o **Exportar CSV** respeita o resultado filtrado.

## Detalhes técnicos

### Novos arquivos

- `src/components/filters/DateConditionBuilder.tsx` — componente reutilizável que recebe `value: Condition[]` e `onChange`. Encapsula linhas, conectores E/OU, presets e popovers.
- `src/components/filters/dateConditionUtils.ts` — tipos (`Condition`, `Operator`, `Connector`), função `evaluateConditions(row, conditions, fields)` e helpers de preset (`getPresetRange('last7d')` etc.).

### Tipos

```ts
type Operator = 'between' | 'eq' | 'gt' | 'lt' | 'is_set' | 'is_empty';
type Connector = 'AND' | 'OR';
interface Condition {
  id: string;
  field: string;          // 'created_at' | 'data_ativacao' | ...
  operator: Operator;
  from?: string;          // YYYY-MM-DD
  to?: string;            // YYYY-MM-DD (apenas para 'between')
  value?: string;         // YYYY-MM-DD (para eq/gt/lt)
  connector: Connector;   // como liga com a condição anterior; ignorado na primeira
}
```

### Componentes shadcn usados

- `Calendar` (mode `range` e `single`) dentro de `Popover` para os pickers visuais — com `className="p-3 pointer-events-auto"`.
- `Select` para campo e operador.
- `Badge` clicável para conector E/OU e para os chips de presets/resumo.
- `Button` ghost com ícone `Plus` para adicionar condição.

### Arquivos modificados

- `src/pages/central/OperacionalContratos.tsx`:
  - Substituir o popover atual de "Filtros de data" pelo `<DateConditionBuilder>` no card Filtros.
  - Trocar o estado `dateRanges` por `conditions: Condition[]`.
  - Trocar a lógica do `useMemo filteredContratos` para usar `evaluateConditions`.
  - Adicionar a barra de chips de resumo acima da tabela.

Sem alterações de backend nem de banco.
