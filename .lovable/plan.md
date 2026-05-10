## Objetivo

Adicionar filtros por intervalo de datas (de/até) nas páginas de **Recebimentos** e **Reembolsos** (que compartilham o componente `OperacionalContratos.tsx`).

> Observação: hoje não existe uma página chamada "Cancelamentos" — os contratos cancelados aparecem na página de **Reembolsos** (já que o reembolso depende do cancelamento). O filtro será aplicado nessa página. Se preferir uma página dedicada de Cancelamentos, é só avisar.

## O que será adicionado

No card "Filtros", incluir uma seção de filtros de data com **de/até** para os seguintes campos do contrato:

- Data de criação (`created_at`)
- Data de ativação (`data_ativacao`)
- Data de cancelamento (`data_cancelamento`)
- Data de recebimento (`data_recebimento`)
- Data de reembolso (`data_reembolso`)
- Data pgto. 1ª/2ª/3ª mensalidade (`data_pgto_primeira/segunda/terceira_mensalidade`)

UI: um Popover "Filtros de data" que abre um painel com cada campo + dois inputs `type="date"` (de/até) + botão "Limpar". Um badge mostra quantos filtros de data estão ativos.

## Comportamento

- Filtragem **client-side** sobre a lista já retornada (o edge function `central-operacional` já devolve `select('*')`, todos os campos de data estão disponíveis).
- Cada intervalo é independente; vazio = sem restrição naquele lado.
- Contratos sem valor no campo são excluídos quando há qualquer filtro ativo nesse campo.
- Filtros aplicam-se nas duas abas (Elegíveis e Já recebidos/reembolsados).
- Exportar CSV respeita os filtros (já usa o array `contratos` filtrado).

## Arquivos afetados

- `src/pages/central/OperacionalContratos.tsx` — adicionar estado dos filtros, UI do popover, e `useMemo` que filtra `contratos` antes de renderizar/exportar.
- Adicionar `created_at` ao tipo `Contrato`.

Sem alterações no backend nem no banco.
