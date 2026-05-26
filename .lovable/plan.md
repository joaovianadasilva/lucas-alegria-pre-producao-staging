## Objetivo

Permitir clicar nos contratos da lista detalhada do **Relatório de Receita** (`/central/relatorios/visao-geral-receita`) para abrir o mesmo modal de detalhes/edição usado na tela **Contratos (Central > Dados)**, com acesso a edição do contrato, recebimento e reembolso.

## Abordagem

Reaproveitar exatamente o padrão já em produção em `src/pages/central/ContratosCentral.tsx`: o componente `ContractDetailsDialog` (que já cobre detalhes, edição de campos, recebimento e reembolso) carregado via `manage-contracts → getContract`.

A linha da tabela detalhada já carrega `contrato_id` e `provedor_id`, então não é preciso mudar o backend nem o payload.

## Alterações

**Arquivo único:** `src/pages/central/RelatorioVisaoGeralReceita.tsx`

1. Importar `ContractDetailsDialog`, `ContratoCompleto` e o ícone `Eye`.
2. Adicionar estados: `detailsOpen`, `loadingDetails`, `contractDetails`.
3. Adicionar função `openDetails(contratoId, provedorId)` idêntica à de `ContratosCentral` (invoca `manage-contracts` com `getContract`).
4. Na tabela detalhada (linhas ~358-392):
   - Acrescentar uma `TableHead` "Ações" à direita.
   - Em cada linha, adicionar uma célula com botão `Eye` que chama `openDetails(r.contrato_id, r.provedor_id)`.
   - Tornar a linha visualmente clicável (`cursor-pointer hover:bg-muted/40`) acionando a mesma função, para usabilidade.
   - Ajustar `colSpan` do estado vazio de 10 → 11.
5. Renderizar `<ContractDetailsDialog ... onContractUpdated={() => refetch()}>` no final do componente, invalidando/refazendo a query do relatório quando o contrato for atualizado (para que valores de comissão/faturamento reflitam mudanças, como marcação de recebimento).

## Fora de escopo

- Mudanças no edge function `central-operacional` (o payload já traz `contrato_id` + `provedor_id`).
- Alterações no `ContractDetailsDialog` em si — ele já suporta edição completa incluindo recebimento/reembolso.
- Mesma ação na tabela "Por Regra de Receita" (essa é agregada por regra, não tem contrato unitário).