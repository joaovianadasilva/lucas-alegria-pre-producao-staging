## Seleção em massa para confirmar recebimentos/reembolsos

Adicionar a capacidade de selecionar múltiplos contratos na aba **Elegíveis** (de Recebimentos e Reembolsos) e confirmá-los em massa com uma data única.

### UX

1. **Coluna de seleção** na tabela:
   - Checkbox no `TableHead` para selecionar/desmarcar todos os contratos visíveis (após filtros).
   - Checkbox em cada linha (clique não propaga para abrir detalhes).
   - Estado indeterminado quando há seleção parcial.
   - Aparece somente na aba **Elegíveis** (não faz sentido em "Já recebidos/reembolsados").

2. **Barra de ações em massa** acima da tabela (visível apenas com seleção > 0):
   - Texto: `N contrato(s) selecionado(s)` + soma do valor (`fmtBRL`).
   - Botão `Confirmar em massa` (abre dialog).
   - Botão `Limpar seleção`.

3. **Dialog "Confirmar em massa"**:
   - Mostra resumo: `N contratos · Total: R$ X`.
   - Lista compacta dos primeiros nomes (ex.: "Fulano, Beltrano e mais N").
   - Campo `Data do recebimento/reembolso` (input date, default hoje).
   - Botões `Cancelar` / `Confirmar N contratos`.
   - Durante envio: botão em loading; ao fim, toast com sucessos/erros e fecha o dialog.

4. **Limpeza automática** da seleção:
   - Ao trocar de aba, mudar provedores, busca, condições de data, ou após confirmar.

### Backend

Nova ação `confirmarLote` em `supabase/functions/central-operacional/index.ts`:

```ts
// params: { tipo: 'recebimento' | 'reembolso', contratoIds: string[], data: string (YYYY-MM-DD) }
```

- Valida `tipo` e `contratoIds` (array não vazio, máx 500).
- Faz `select('id, provedor_id, nome_completo')` filtrando `.in('id', contratoIds)`.
- Faz `update` em massa: `.update(updates).in('id', contratoIds)` com os mesmos campos do fluxo atual (`recebimento_efetivado`/`data_recebimento` ou `reembolso_efetivado`/`data_reembolso`).
- Insere uma linha em `historico_contratos` por contrato (mesmo formato da ação singular), em uma única chamada `.insert([...])`.
- Resposta: `{ success: true, count: N }`. Em erro parcial, retorna `{ success: false, error }`.

Sem mudança de schema — todos os campos já existem em `contratos`.

### Arquivos modificados

- `src/pages/central/OperacionalContratos.tsx`
  - Novo state `selectedIds: Set<string>`.
  - Coluna checkbox + barra de ações em massa + dialog de bulk.
  - `useEffect` para limpar seleção quando filtros/aba mudam.
  - Mutation `confirmarLote` chamando a nova action.
- `supabase/functions/central-operacional/index.ts`
  - Novo `case 'confirmarLote'` reaproveitando lógica do singular.

Sem migrations.
