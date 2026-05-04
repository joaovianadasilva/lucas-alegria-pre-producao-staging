## Módulo "Todos os Contratos" na Central

Nova área `/central/contratos` (super_admin) com filtro base por **provedor** e visão consolidada cross-provedor.

### Backend — `supabase/functions/central-operacional/index.ts`

Adicionar action **`listContratos`** com paginação server-side:

Parâmetros: `provedorIds?`, `status?`, `statusContrato?`, `tipoVenda?`, `dataInicio?`, `dataFim?`, `busca?`, `page` (default 1), `pageSize` (default 20).

Implementação:
- Query `from('contratos').select('*', { count: 'exact' })`
- Aplica filtros: `.in('provedor_id', ...)`, `.eq(...)` para status/status_contrato/tipo_venda, range em `created_at`
- Busca: `.or('nome_completo.ilike.%s%,cpf.ilike.%s%,codigo_contrato.ilike.%s%,codigo_cliente.ilike.%s%,email.ilike.%s%,celular.ilike.%s%')`
- `.order('created_at', { ascending: false }).range(from, to)`
- Retorna `{ contratos, total }`
- Auth: super_admin (já validado no início da função)

### Frontend — nova página `src/pages/central/ContratosCentral.tsx`

- Filtros (com botão "Aplicar Filtros" — sem auto-apply, conforme padrão do projeto):
  - **Provedores** — multi-select (popover com checkboxes), reutilizando a UX já usada em Recebimentos/Reembolsos.
  - Status, Status contrato, Tipo de venda — selects
  - Data início / Data fim (created_at)
  - Busca livre (nome, CPF, código contrato/cliente, e-mail, celular)
- Tabela paginada (20 por página): Provedor · Contrato · Cliente (nome + CPF/celular) · Plano · Valor · Status · Status contrato · Criado · Ativação · Ações
- Botão **Exportar CSV** dos resultados filtrados (lado direito do título)
- Ação por linha: **Ver detalhes** → reaproveita `ContractDetailsDialog` chamando `manage-contracts:getContract` com `provedorId` da linha (super_admin tem acesso via RLS).
- Datas via `formatLocalDate` (timezone safety).

### Roteamento e navegação

- `src/App.tsx`: adicionar `<Route path="contratos" element={<ContratosCentral />} />` dentro do bloco `/central` já protegido por `super_admin`.
- `src/components/CentralSidebar.tsx`: novo grupo **"Dados"** com item "Contratos" (ícone `FileText`) → `/central/contratos`.
- `src/pages/central/CentralHome.tsx`: adicionar card "Todos os Contratos".

### Arquivos afetados
- `supabase/functions/central-operacional/index.ts` — nova action `listContratos`
- `src/pages/central/ContratosCentral.tsx` — novo
- `src/pages/central/CentralHome.tsx` — card adicional
- `src/components/CentralSidebar.tsx` — item de menu
- `src/App.tsx` — rota
