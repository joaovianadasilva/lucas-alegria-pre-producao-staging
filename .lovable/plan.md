

# Plano Consolidado: Migracao Multi-Provedor

## Resumo Executivo

Transformar o sistema de single-tenant (apenas W2A) para multi-tenant, onde cada "Provedor" tem seus dados isolados. Usuarios e roles permanecem globais, e o acesso a provedores e controlado por uma tabela de vinculo (N:N).

---

## Modelo de Dados

### Estrutura de Relacionamento

```text
profiles (GLOBAL)          user_roles (GLOBAL)
    |                           |
    +--- usuario_provedores ----+--- (roles sao globais,
    |    (N:N - controla           nao mudam por provedor)
    |     acesso)
    |
provedores
    |
    +--- contratos (provedor_id)
    +--- agendamentos (provedor_id)
    +--- slots (provedor_id)
    +--- catalogo_planos (provedor_id)
    +--- catalogo_adicionais (provedor_id)
    +--- catalogo_cidades (provedor_id)
    +--- ... (15 tabelas no total)
```

### Regras Fundamentais

- **Roles sao globais**: um `admin` e admin em qualquer provedor que tenha acesso
- **Dados sao isolados por provedor**: cada provedor tem seus proprios contratos, agendamentos, catalogos, etc.
- **Super admin**: acessa todos os provedores sem precisar de vinculo na tabela `usuario_provedores`
- **Usuarios podem acessar multiplos provedores**: a tabela `usuario_provedores` permite vinculos N:N
- **Admin local gerencia usuarios do seu provedor**: cria usuarios ja vinculados ao provedor ativo
- **Super admin escolhe o provedor ao criar usuario**: ve um seletor de provedor no formulario

---

## FASE 1: Fundacao do Banco de Dados

### 1.1 Adicionar `super_admin` ao enum `app_role`

O enum atual tem: `admin`, `tecnico`, `vendedor`, `atendente`, `supervisor`, `provedor`, `vendedor_clique`, `vendedor_provedor`.

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
```

### 1.2 Criar tabela `provedores`

```sql
CREATE TABLE public.provedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.provedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active provedores"
  ON public.provedores FOR SELECT TO authenticated
  USING (ativo = true OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Only super_admin can manage provedores"
  ON public.provedores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));
```

### 1.3 Criar tabela `usuario_provedores`

```sql
CREATE TABLE public.usuario_provedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provedor_id uuid REFERENCES public.provedores(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, provedor_id)
);

CREATE INDEX idx_usuario_provedores_user ON usuario_provedores(user_id);
CREATE INDEX idx_usuario_provedores_provedor ON usuario_provedores(provedor_id);

ALTER TABLE public.usuario_provedores ENABLE ROW LEVEL SECURITY;
```

### 1.4 Criar funcao auxiliar `get_user_provedor_ids`

```sql
CREATE OR REPLACE FUNCTION public.get_user_provedor_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'super_admin'
    )
    THEN (SELECT COALESCE(array_agg(id), '{}') FROM provedores WHERE ativo = true)
    ELSE (SELECT COALESCE(array_agg(provedor_id), '{}') FROM usuario_provedores WHERE user_id = _user_id)
  END
$$;
```

### 1.5 Adicionar `provedor_id` em 15 tabelas

Adicionar coluna (nullable primeiro) com indice em cada uma das 15 tabelas:

- `contratos`
- `agendamentos`
- `adicionais_contrato`
- `slots`
- `catalogo_planos`
- `catalogo_adicionais`
- `catalogo_cidades`
- `catalogo_origem_vendas`
- `catalogo_representantes`
- `catalogo_tipos_agendamento`
- `catalogo_grupos_mensagem`
- `historico_contratos`
- `historico_adicionais_contrato`
- `historico_edicoes_agendamentos`
- `historico_reagendamentos`

```sql
-- Exemplo para cada tabela:
ALTER TABLE contratos ADD COLUMN provedor_id uuid REFERENCES provedores(id);
CREATE INDEX idx_contratos_provedor ON contratos(provedor_id);
-- (repetir para as 14 restantes)
```

### 1.6 Migrar dados existentes para provedor W2A

```sql
-- Criar provedor W2A
INSERT INTO provedores (nome, slug) VALUES ('W2A Telecomunicacoes', 'w2a');

-- Vincular todos os usuarios existentes
INSERT INTO usuario_provedores (user_id, provedor_id)
SELECT p.id, (SELECT id FROM provedores WHERE slug = 'w2a')
FROM profiles p;

-- Popular provedor_id em todas as 15 tabelas
UPDATE contratos SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE agendamentos SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE adicionais_contrato SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE slots SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE catalogo_planos SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE catalogo_adicionais SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE catalogo_cidades SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE catalogo_origem_vendas SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE catalogo_representantes SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE catalogo_tipos_agendamento SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE catalogo_grupos_mensagem SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE historico_contratos SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE historico_adicionais_contrato SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE historico_edicoes_agendamentos SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');
UPDATE historico_reagendamentos SET provedor_id = (SELECT id FROM provedores WHERE slug = 'w2a');

-- Tornar NOT NULL apos popular
ALTER TABLE contratos ALTER COLUMN provedor_id SET NOT NULL;
-- (repetir para as 14 restantes)
```

### 1.7 Criar bucket de Storage

Criar bucket `provedor-logos` para upload de logos dos provedores.

---

## FASE 2: Seguranca (RLS e Edge Functions)

### 2.1 Reescrever RLS Policies (15 tabelas de dados)

Padrao para todas as tabelas com `provedor_id`:

```sql
-- Remover policies antigas
-- Criar nova policy:
CREATE POLICY "Users access data of their provedor"
  ON [tabela] FOR ALL TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
```

Tabelas que mantêm policies restritivas para escrita (apenas via edge functions) terao a policy de SELECT atualizada para filtrar por provedor_id.

### 2.2 RLS para `usuario_provedores`

```sql
-- Usuarios podem ver vinculos do seu provedor
CREATE POLICY "Users can read their own provedor links"
  ON usuario_provedores FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR provedor_id = ANY(public.get_user_provedor_ids(auth.uid()))
  );

-- Apenas edge functions gerenciam vinculos
CREATE POLICY "Only functions can manage provedor links"
  ON usuario_provedores FOR ALL
  USING (false);
```

### 2.3 Atualizar Edge Functions (6 funcoes)

Cada edge function precisa:

1. **Extrair `provedorId`** do body da requisicao
2. **Validar** que o usuario tem acesso ao provedor
3. **Incluir `provedor_id`** em todos os INSERTs
4. **Filtrar por `provedor_id`** em todos os SELECTs/UPDATEs

**Funcoes afetadas e tamanho atual:**

| Funcao | Linhas | Acoes principais |
|--------|--------|-----------------|
| `manage-contracts` | 761 | createContract, listContracts, updateContract |
| `manage-appointments` | 594 | createAppointment, listAppointments, updateAppointment |
| `manage-catalog` | 615 | CRUD de planos, adicionais, cidades, representantes, origens |
| `manage-slots` | ~300 | CRUD de slots |
| `manage-users` | 200 | CRUD de usuarios + logica especial para provedor |
| `google-sheets-integration` | ~200 | Integracao com planilha |

**Mudanca especial em `manage-users`:**
- Acao `createUser`: recebe `provedorId` (obrigatorio) e cria vinculo em `usuario_provedores`
- Acao `listUsers`: filtra por `provedor_id` via join com `usuario_provedores`
- Acao `assignProvedor` (nova): vincula usuario existente a um provedor
- Acao `removeProvedor` (nova): desvincula usuario de um provedor

**Nova Edge Function: `manage-provedores`**
- `listProvedores`: lista provedores (filtrado por acesso)
- `createProvedor`: cria novo provedor (super_admin)
- `updateProvedor`: edita nome/logo (super_admin)
- `toggleProvedorStatus`: ativa/desativa (super_admin)

---

## FASE 3: Frontend

### 3.1 Atualizar `AuthContext.tsx`

Adicionar ao contexto:
- `provedorAtivo: Provedor | null` - provedor selecionado
- `provedoresDisponiveis: Provedor[]` - lista de provedores do usuario
- `selecionarProvedor(id: string): void` - define provedor ativo (persiste em localStorage)
- `isSuperAdmin(): boolean` - verifica se tem role super_admin

Apos login, carregar provedores do usuario via `usuario_provedores`.

### 3.2 Nova pagina: `/selecionar-provedor`

- Grid de cards com logo e nome de cada provedor
- Se usuario tem apenas 1 provedor, redireciona automaticamente
- Super admin ve todos os provedores + botao "Gerenciar Provedores"
- Acessada apos login (antes de qualquer outra pagina)

### 3.3 Nova pagina: `/gerenciar-provedores` (super_admin)

- Tabela de provedores com nome, logo, status
- Dialog para criar/editar provedor (nome + upload de logo)
- Botao ativar/desativar
- Secao para vincular/desvincular usuarios

### 3.4 Atualizar `ProtectedRoute.tsx`

- Verificar se `provedorAtivo` esta definido
- Se nao, redirecionar para `/selecionar-provedor`
- Excecao: rotas de super_admin (gerenciamento de provedores)

### 3.5 Atualizar `AppLayout.tsx` (Header)

- Mostrar nome/logo do provedor ativo no header (no lugar do logo W2A fixo, ou ao lado)
- Botao para trocar de provedor (redireciona para `/selecionar-provedor`)

### 3.6 Atualizar `AppSidebar.tsx`

- Adicionar item "Gerenciar Provedores" visivel apenas para super_admin

### 3.7 Atualizar `App.tsx` (Rotas)

- Adicionar `/selecionar-provedor` (protegida, sem exigir provedor)
- Adicionar `/gerenciar-provedores` (protegida, requiredRole super_admin)

### 3.8 Refatorar `GerenciarUsuarios.tsx`

- Se super_admin: mostrar seletor de provedor no formulario de criacao
- Se admin local: provedor e automatico (provedorAtivo)
- Listar apenas usuarios do provedor ativo (via `usuario_provedores`)

### 3.9 Atualizar todas as chamadas de API

Adicionar `provedorId` em todas as chamadas a edge functions:

**Arquivos afetados:**
- `src/lib/catalogoSupabase.ts` - todas as 12 funcoes (carregarPlanos, salvarPlanos, etc.)
- `src/pages/CadastroVenda.tsx` - chamada a manage-contracts
- `src/pages/NovoAgendamento.tsx` - chamada a manage-appointments
- `src/pages/GerenciarAgendamentos.tsx` - chamada a manage-appointments
- `src/pages/ConfigurarSlots.tsx` - chamada a manage-slots
- `src/pages/ConfigurarPlanos.tsx` - chamada a manage-catalog
- `src/pages/ConfigurarAdicionais.tsx` - chamada a manage-catalog
- `src/pages/Contratos.tsx` - chamada a manage-contracts
- `src/pages/Historico.tsx` - consultas de historico
- `src/hooks/useAgendamentos.ts` - consultas de agendamentos
- `src/hooks/useTecnicos.ts` - filtrar tecnicos por provedor (via `usuario_provedores`)
- `src/components/AgendamentoForm.tsx` - formulario de agendamento
- `src/components/FormularioCompleto.tsx` - formulario de venda

---

## FASE 4: Validacao

### Testes de Isolamento
- Usuario do provedor A nao ve dados do provedor B
- Super admin ve dados de todos os provedores
- Admin local so gerencia usuarios do seu provedor

### Testes de Fluxo
- Login -> Selecao de Provedor -> Novo Agendamento -> dados salvos com provedor_id correto
- Troca de provedor -> dados alternam corretamente
- Super admin cria provedor -> vincula usuario -> usuario acessa

### Testes de Dados Historicos
- Todos os dados W2A existentes continuam acessiveis
- Historico e auditoria preservados

---

## Resumo de Arquivos Impactados

| Categoria | Quantidade | Arquivos |
|-----------|-----------|----------|
| Migracao SQL | 1 | Migracao grande (schema + dados) |
| Nova Edge Function | 1 | `manage-provedores` |
| Edge Functions atualizadas | 6 | manage-contracts, manage-appointments, manage-catalog, manage-slots, manage-users, google-sheets-integration |
| Frontend - novos | 2 | SelecionarProvedor.tsx, GerenciarProvedores.tsx |
| Frontend - atualizados | 15+ | AuthContext, ProtectedRoute, AppLayout, AppSidebar, App.tsx, GerenciarUsuarios, catalogoSupabase, todas as paginas e hooks |

**Total: ~25-30 arquivos**

---

## Ordem de Execucao

```text
Fase 1 (DB)  ──►  Fase 2 (Backend)  ──►  Fase 3 (Frontend)  ──►  Fase 4 (QA)

Cada fase so inicia apos a anterior estar testada e funcional.
Dentro de cada fase, a ordem dos itens e sequencial (de cima para baixo).
```

