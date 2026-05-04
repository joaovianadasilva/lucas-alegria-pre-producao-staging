## Melhorias em Reembolsos/Recebimentos e sinalização em Contratos

### A) Páginas Reembolsos e Recebimentos (`OperacionalContratos.tsx`)

1. **Filtro de provedor à esquerda**
   - Reordenar o `CardContent` de filtros: o popover "Provedores" passa a ser o primeiro item (à esquerda), seguido pelo input "Buscar".

2. **Clicar no contrato exibe detalhes**
   - Reaproveitar `ContractDetailsDialog` (já usado em `ContratosCentral`).
   - Estado local: `detailsOpen`, `contractDetails`, `loadingDetails`.
   - Adicionar botão "Ver" (ícone Eye) na coluna Ações (ao lado de "Confirmar"/data) e tornar a linha clicável (cursor-pointer + onClick) que dispara `openDetails(c.id, c.provedor_id)`.
   - `openDetails` chama `manage-contracts:getContract` com `provedorId` da própria linha (super_admin já tem acesso cross-provedor via service role).
   - Após edição, invalidar query `central-contratos`.

3. **Exportar CSV (elegíveis e processados)**
   - Adicionar botão "Exportar CSV" no header da página, ao lado do título; exporta a lista da aba ativa, respeitando filtros aplicados (provedores + busca).
   - Como `listElegiveis`/`listProcessados` já retornam todas as linhas filtradas (sem paginação no backend), gerar CSV client-side a partir do `contratos` carregado.
   - Colunas: provedor, codigo_contrato, codigo_cliente, nome_completo, cpf, plano_nome, plano_valor, status_contrato, data_ativacao/data_cancelamento (conforme tipo), e — na aba processados — data_recebimento ou data_reembolso.
   - Nome do arquivo: `recebimentos_elegiveis_YYYY-MM-DD.csv`, etc.

### B) Página Contratos (`src/pages/Contratos.tsx`) — sinalização de elegibilidade

**Backend (`supabase/functions/manage-contracts/index.ts`, action `listContractsWithFilter`)**
- Selecionar campos extras: `recebimento_efetivado, reembolso_efetivado, reembolsavel, status_contrato, data_ativacao, data_cancelamento, data_pgto_primeira_mensalidade, data_pgto_segunda_mensalidade, data_pgto_terceira_mensalidade`.
- Carregar regras ativas do provedor (`regras_operacionais_provedor`, tipos `recebimento` e `reembolso`).
- Para cada linha calcular dois booleans:
  - `elegivel_recebimento`: mesma regra do `contratoElegivel('recebimento')` em `central-operacional`.
  - `elegivel_reembolso`: idem para reembolso.
- Retornar essas flags junto com cada contrato. Manter contagem `total` válida (a lógica é só um `map` após o `select`).

**Frontend (`Contratos.tsx`)**
- Estender interface `Contrato` com as duas flags e os novos campos retornados.
- Adicionar coluna "Status financeiro" exibindo dois `Badge`s pequenos:
  - "Elegível recebimento" (variant default verde via classe `bg-emerald-600`) quando `elegivel_recebimento`.
  - "Elegível reembolso" (variant warning amber `bg-amber-600`) quando `elegivel_reembolso`.
  - "Recebido" / "Reembolsado" (cinza/outline) quando já efetivado.
  - Nada quando nenhum aplicável.
- Tooltip simples explicando o motivo (ex.: "Pagamentos ≥ X confirmados").

### Arquivos afetados
- `src/pages/central/OperacionalContratos.tsx` (layout de filtros, clique em linha, export CSV, ContractDetailsDialog)
- `supabase/functions/manage-contracts/index.ts` (campos extras + flags de elegibilidade no `listContractsWithFilter`)
- `src/pages/Contratos.tsx` (nova coluna com badges de elegibilidade)
