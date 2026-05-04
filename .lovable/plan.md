## Central do Super Admin (área externa aos provedores)

Criar uma nova área de navegação acessível **apenas a `super_admin`**, totalmente separada do contexto de provedor ativo. Servirá como hub para múltiplos módulos operacionais e relatórios, começando pelo controle de **recebimento e reembolso** de contratos com filtro por provedor.

### 1. Estrutura de navegação

- Nova rota raiz: `/central` (com sub-rotas), protegida por `requiredRole="super_admin"` e `requireProvedor={false}` — não depende de provedor ativo.
- Novo layout `CentralLayout` (separado do `AppLayout` dos provedores) com sidebar própria contendo:
  - **Operacional**
    - Recebimentos
    - Reembolsos
  - **Relatórios** (placeholder, vazio por enquanto)
  - Botão "Voltar para área do provedor" (volta ao `AppLayout` normal)
- No `AppSidebar` atual (área dos provedores), adicionar para super_admin um item "Central de Controle" que leva a `/central`.

### 2. Módulo: Controle Operacional de Planos

Duas telas irmãs:

**`/central/operacional/recebimentos`**
- Lista contratos **elegíveis para recebimento** (ainda sem `recebimento_efetivado = true`) que satisfazem a regra do provedor.
- Colunas: Provedor · Código contrato · Cliente · Plano · Valor · Data ativação · Datas de pagamento (1ª/2ª/3ª) · Status · Ação.
- Ação principal: **Confirmar recebimento** → abre dialog para escolher `data_recebimento` (default hoje) e marca `recebimento_efetivado = true`.
- Aba/secção secundária: "Já recebidos" (histórico) com filtro de período.

**`/central/operacional/reembolsos`**
- Lista contratos **elegíveis para reembolso** (`reembolsavel = true` e `reembolso_efetivado != true`) conforme regra.
- Ação principal: **Confirmar reembolso** → escolher `data_reembolso` e marca `reembolso_efetivado = true`.
- Secção "Já reembolsados".

**Filtros comuns nas duas telas:**
- Multi-select de **Provedor** (default: todos)
- Período (data ativação ou cancelamento)
- Busca por nome / CPF / código contrato
- Status do contrato

### 3. Regras de elegibilidade por provedor

Como as regras variam por provedor e ainda serão definidas, vamos preparar a infraestrutura agora e deixar as regras configuráveis:

- Nova tabela `regras_operacionais_provedor`:
  - `id uuid pk`
  - `provedor_id uuid not null`
  - `tipo text not null` — `'recebimento'` | `'reembolso'`
  - `regra jsonb not null` — descrição declarativa da regra (ex.: `{ "exige_pagamentos": 3, "dias_apos_ativacao": 90, "status_contrato_in": ["ativo"] }`)
  - `ativo boolean default true`
  - `created_at`, `updated_at`
  - RLS: leitura por usuários do provedor + super_admin; escrita só via edge function.
- Avaliação no backend: edge function aplica a regra (jsonb) sobre cada contrato e devolve apenas os elegíveis. Por enquanto, default fallback se não houver regra cadastrada (ex.: recebimento ⇒ tem `data_pgto_primeira_mensalidade` preenchida e `recebimento_efetivado != true`; reembolso ⇒ `reembolsavel = true` e `data_cancelamento` preenchida e `reembolso_efetivado != true`).
- (Opcional, fase 2) Tela `/central/operacional/regras` para editar regras por provedor via UI — fora do escopo inicial.

### 4. Backend: nova edge function `central-operacional`

Ações:
- `listElegiveisRecebimento({ provedorIds?, periodo?, busca? })`
- `listElegiveisReembolso({ provedorIds?, periodo?, busca? })`
- `listJaRecebidos(...)` / `listJaReembolsados(...)`
- `confirmarRecebimento({ contratoId, dataRecebimento })`
- `confirmarReembolso({ contratoId, dataReembolso })`

Implementação:
- Validar JWT no código e exigir role `super_admin` (consultando `user_roles`). Rejeitar com 403 caso contrário.
- Usar `SUPABASE_SERVICE_ROLE_KEY` para escrever em `contratos` (RLS bloqueia anon).
- Toda mutação grava entrada em `historico_contratos` (tipo_acao `'recebimento_confirmado'` / `'reembolso_confirmado'`) com `usuario_id` e `provedor_id` do contrato.
- CORS conforme padrão do projeto.

### 5. Frontend

Arquivos novos:
- `src/components/CentralLayout.tsx` — layout com sidebar própria para a central.
- `src/components/CentralSidebar.tsx`
- `src/pages/central/Recebimentos.tsx`
- `src/pages/central/Reembolsos.tsx`
- (placeholder) `src/pages/central/CentralHome.tsx`
- `src/hooks/useCentralOperacional.ts` — wrappers React Query para a edge function.

Alterações:
- `src/App.tsx`: adicionar bloco de rotas `/central/*` protegido por `super_admin` e `requireProvedor={false}`.
- `src/components/AppSidebar.tsx`: adicionar atalho "Central de Controle" no grupo Super Admin.
- `src/components/ProtectedRoute.tsx`: já suporta `requireProvedor={false}` + `requiredRole`, sem mudanças.

### 6. Migrações de banco

1. `create table regras_operacionais_provedor` com RLS (SELECT por usuário do provedor ou super_admin; INSERT/UPDATE/DELETE bloqueado para anon — apenas via service role nas edge functions).
2. (Sem mudanças nos contratos — campos `recebimento_efetivado`, `data_recebimento`, `reembolso_efetivado`, `data_reembolso`, `reembolsavel` já existem.)

### Detalhes técnicos resumidos

- Roteamento: `/central` fora do `AppLayout`; usa `CentralLayout` próprio. Não exige `provedorAtivo`.
- Permissão dupla: rota protegida + edge function valida `super_admin`.
- Filtro de provedor é client-side (multi-select), enviado ao backend que filtra a query.
- Regras inicialmente "default" no código; quando o usuário definir as regras finais por provedor, basta inserir linhas em `regras_operacionais_provedor` sem mudar código.

### Próximas iterações (fora do escopo agora)

- UI para CRUD das regras por provedor.
- Relatórios consolidados (faturamento, churn, etc.) sob `/central/relatorios`.
- Exportação CSV.
