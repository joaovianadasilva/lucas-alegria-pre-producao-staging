
## Plano: Reestruturar Sistema de Permissoes (Atualizado)

### Resumo das Alteracoes

O sistema atual possui 6 roles: `admin`, `provedor`, `supervisor`, `tecnico`, `vendedor`, `atendente`.

O novo sistema tera **4 roles** com permissoes simplificadas:

| Role | Cadastro de Venda | Registro de Agendamentos | Gerenciar Agenda | Historico | Contratos | Configurar Vagas | Configs Admin |
|------|:-----------------:|:------------------------:|:----------------:|:---------:|:---------:|:----------------:|:-------------:|
| **Admin** | Sim | Sim | Sim | Sim | Sim | Sim | Sim |
| **Supervisor** | Sim | Sim | Sim | Sim | Sim | Sim | Nao |
| **Vendedor Clique** | Sim | Sim | Sim | Sim | Sim | Nao | Nao |
| **Vendedor Provedor** | Nao | Sim | Sim | Sim | Sim | Nao | Nao |

---

### Parte 1: Alteracoes no Banco de Dados

Adicionar as novas roles ao enum `app_role`:

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor_clique';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor_provedor';
```

**Nota**: As roles existentes (`provedor`, `tecnico`, `vendedor`, `atendente`) serao mantidas no banco para compatibilidade com usuarios ja cadastrados, mas serao **removidas da interface de gerenciamento**.

---

### Parte 2: Alteracoes no Frontend

#### 2.1 Arquivo `src/pages/GerenciarUsuarios.tsx`

**Linha 25-31** - Atualizar a lista de roles disponiveis:

```typescript
const availableRoles = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'vendedor_clique', label: 'Vendedor Clique' },
  { value: 'vendedor_provedor', label: 'Vendedor Provedor' },
];
```

**Linha 42** - Alterar o valor padrao de `role` no formulario:

```typescript
role: 'vendedor_clique', // era 'vendedor'
```

**Linha 84** - Atualizar reset do formulario:

```typescript
role: 'vendedor_clique',
```

---

#### 2.2 Arquivo `src/components/AppSidebar.tsx`

Refatorar a logica de permissoes (linhas ~43-50):

```typescript
const { hasRole } = useAuth();
const isAdmin = hasRole('admin');
const isSupervisor = hasRole('supervisor');
const isVendedorClique = hasRole('vendedor_clique');
const isVendedorProvedor = hasRole('vendedor_provedor');

// Quem pode ver Cadastro de Venda (todos menos vendedor_provedor)
const canAccessCadastroVenda = isAdmin || isSupervisor || isVendedorClique;

// Quem pode ver Contratos (todas as 4 roles)
const canAccessContratos = isAdmin || isSupervisor || isVendedorClique || isVendedorProvedor;

// Quem pode ver Configurar Vagas (admin e supervisor apenas)
const canAccessSlots = isAdmin || isSupervisor;
```

Atualizar o menu principal para filtrar "Cadastro de Venda" baseado na permissao:

```typescript
const mainMenuItems = [
  { title: 'Cadastro de Venda', url: '/cadastro-venda', icon: FileText, requiresCadastroVenda: true },
  { title: 'Registro de Agendamentos', url: '/agendamentos/novo', icon: Calendar },
  { title: 'Gerenciar Agenda', url: '/agendamentos/gerenciar', icon: ListChecks },
  { title: 'Historico', url: '/historico', icon: Clock },
];
```

---

#### 2.3 Arquivo `src/App.tsx`

Atualizar as rotas protegidas:

```typescript
{/* Cadastro de Venda - todos exceto vendedor_provedor */}
<Route element={<ProtectedRoute requiredRoles={["admin", "supervisor", "vendedor_clique"]} />}>
  <Route path="/cadastro-venda" element={<CadastroVenda />} />
</Route>

{/* Paginas acessiveis a todos os usuarios autenticados */}
<Route path="/agendamentos/novo" element={<NovoAgendamento />} />
<Route path="/agendamentos/gerenciar" element={<GerenciarAgendamentos />} />
<Route path="/historico" element={<Historico />} />

{/* Contratos - todas as 4 roles */}
<Route element={<ProtectedRoute requiredRoles={["admin", "supervisor", "vendedor_clique", "vendedor_provedor"]} />}>
  <Route path="/contratos" element={<Contratos />} />
</Route>

{/* Configurar Vagas - admin e supervisor */}
<Route element={<ProtectedRoute requiredRoles={["admin", "supervisor"]} />}>
  <Route path="/configuracoes/slots" element={<ConfigurarSlots />} />
</Route>

{/* Configuracoes admin-only - sem alteracao */}
<Route element={<ProtectedRoute requiredRole="admin" />}>
  <Route path="/configuracoes/planos" element={<ConfigurarPlanos />} />
  <Route path="/configuracoes/adicionais" element={<ConfigurarAdicionais />} />
  <Route path="/configuracoes/usuarios" element={<GerenciarUsuarios />} />
</Route>
```

Atualizar o redirecionamento padrao (linha 33):

```typescript
<Route path="/" element={<Navigate to="/agendamentos/novo" replace />} />
```

---

### Resumo dos Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar `vendedor_clique` e `vendedor_provedor` ao enum |
| `src/pages/GerenciarUsuarios.tsx` | Atualizar lista de roles (remover provedor, tecnico, vendedor; adicionar novas) |
| `src/components/AppSidebar.tsx` | Atualizar logica de visibilidade do menu |
| `src/App.tsx` | Atualizar rotas protegidas e redirecionamento padrao |

---

### Observacoes

1. As roles antigas (`provedor`, `tecnico`, `vendedor`, `atendente`) permanecerao no banco de dados para compatibilidade
2. Usuarios com roles antigas continuarao com acesso basico (paginas sem restricao de role)
3. Recomenda-se migrar usuarios existentes para as novas roles via painel admin ou SQL
