## Mudanças no modal "Nova/Editar regra — Receita"

### 1. Bloco dedicado para Provedor alvo
Hoje o seletor de provedores está enfiado dentro de "1. Identificação", misturado com nome/ativa/aplica-todos. Vou separar em um **novo Card "2. Provedor alvo"** com escolha explícita por RadioGroup:

- **Aplicar a todos os provedores** (uma linha, descrição curta: "A regra vale para qualquer provedor da plataforma")
- **Selecionar provedores específicos** (mostra abaixo o popover multi-select + chips dos selecionados)

O Card de Identificação (passa a ser "1.") fica só com: Nome, Ativa, Descrição, Vigência inicial/final. O switch "Aplica a todos" sai dali. Os demais cards são renumerados (3. Evento/data/entidades, 4. Condições, 5. Bases, 6. Base de comissão).

### 2. Remover placeholder do Nome da regra
No input de "Nome da regra", retirar `placeholder="Ex.: Receita comissionável W2A"`. Fica sem placeholder (ou um neutro tipo "Nome da regra"). A confusão com a aba 5 (Base de comissão) some.

### 3. Remover "Entidades incluídas / excluídas" da Base de comissão
São redundantes e confusas:
- O escopo de entidades já é definido no topo pela **Entidades elegíveis** da regra.
- A **Base de valor da comissão** já decide qual fatia entra no cálculo (plano, adicionais ou total).
- Só existem 2 entidades hoje (plano_principal e adicionais), o que torna o include/exclude duplicado e gera regras contraditórias.

Vou remover os dois grupos de checkbox do Card "Base de comissão" e tirar `entidades_incluidas` / `entidades_excluidas` da validação e do payload enviado. Mantenho os campos opcionais no type por compatibilidade com regras já salvas, mas o editor não escreve mais neles (e a edge function ignora; verifico se há leitura — se houver, passa a usar `entidades_elegiveis` da raiz).

### Arquivos afetados
- `src/components/RegraReceitaEditorDialog.tsx` — reorganização visual (novo Card de Provedor alvo, RadioGroup, remoção do placeholder e dos blocos de entidades em Base de comissão).
- `src/lib/regras/receita.ts` — remover a checagem de conflito incluídas×excluídas em `validateRegraReceita`; manter campos no type como opcionais (legado).
- `supabase/functions/central-operacional/index.ts` — só se houver uso ativo desses campos no cálculo; confirmo durante a build e ajusto para cair em `entidades_elegiveis`.

### Fora de escopo
Lógica de eventos geradores, cálculo de receita e base de comissão em si não mudam — só UX do modal e limpeza dos campos redundantes.