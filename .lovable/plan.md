
## Plano: Reestruturar Sistema de Permissões

### Resumo das Alterações

O sistema atual possui 6 roles: `admin`, `provedor`, `supervisor`, `tecnico`, `vendedor`, `atendente`.

O novo sistema terá 5 roles com permissões redefinidas:

| Role | Cadastro de Venda | Registro de Agendamentos | Gerenciar Agenda | Histórico | Contratos | Configurar Vagas |
|------|:-----------------:|:------------------------:|:----------------:|:---------:|:---------:|:----------------:|
| **Admin** | Sim | Sim | Sim | Sim | Sim | Sim + configs |
| **Provedor** | Sim | Sim | Sim | Sim | Sim | Sim |
| **Supervisor** | Sim | Sim | Sim | Sim | Sim | Sim |
| **Vendedor Clique** | Sim | Sim | Sim | Sim | Sim | Nao |
| **Vendedor Provedor** | Nao | Sim | Sim | Sim | Sim | Nao |

---

### Parte 1: Alteracoes no Banco de Dados

Adicionar as novas roles ao enum `app_role`:

```sql
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor_clique';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor_provedor';
```

Nota: As roles existentes (`tecnico`, `vendedor`, `atendente`) serao mantidas no banco para compatibilidade com usuarios ja cadastrados, mas serao removidas da interface de gerenciamento.

---

### Parte 2: Alteracoes no Frontend

#### 2.1 Arquivo `src/pages/GerenciarUsuarios.tsx`

Atualizar a lista de roles disponiveis:

```typescript
const availableRoles = [
  { value: 'admin', label: 'Administrador' },
  { value: 'provedor', label: 'Provedor' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'vendedor_clique', label: 'Vendedor Clique' },
  { value: 'vendedor_provedor', label: 'Vendedor Provedor' },
];
```

Alterar o valor padrao de `role` no formulario:

```typescript
role: 'vendedor_clique', // era 'vendedor'
```

---

#### 2.2 Arquivo `src/components/AppSidebar.tsx`

Refatorar a logica de permissoes:

```typescript
const { hasRole } = useAuth();
const isAdmin = hasRole('admin');
const isProvedor = hasRole('provedor');
const isSupervisor = hasRole('supervisor');
const isVendedorClique = hasRole('vendedor_clique');
const isVendedorProvedor = hasRole('vendedor_provedor');

// Quem pode ver Cadastro de Venda (todos menos vendedor_provedor)
const canAccessCadastroVenda = isAdmin || isProvedor || isSupervisor || isVendedorClique;

// Quem pode ver Contratos (todos as novas roles)
const canAccessContratos = isAdmin || isProvedor || isSupervisor || isVendedorClique || isVendedorProvedor;

// Quem pode ver Configurar Vagas (admin, provedor, supervisor)
const canAccessSlots = isAdmin || isProvedor || isSupervisor;
```

Atualizar o menu principal para filtrar "Cadastro de Venda" baseado na permissao:

```typescript
const mainMenuItems = [
  { title: 'Cadastro de Venda', url: '/cadastro-venda', icon: FileText, requiresCadastroVenda: true },
  { title: 'Registro de Agendamentos', url: '/agendamentos/novo', icon: Calendar },
  { title: 'Gerenciar Agenda', url: '/agendamentos/gerenciar', icon: ListChecks },
  { title: 'Historico', url: '/historico', icon: Clock },
];

// No render, filtrar baseado nas permissoes
{mainMenuItems
  .filter(item => !item.requiresCadastroVenda || canAccessCadastroVenda)
  .map((item) => (
    // ... render menu item
  ))}
```

---

#### 2.3 Arquivo `src/App.tsx`

Atualizar as rotas protegidas:

```typescript
{/* Cadastro de Venda - todos exceto vendedor_provedor */}
<Route element={<ProtectedRoute requiredRoles={["admin", "provedor", "supervisor", "vendedor_clique"]} />}>
  <Route path="/cadastro-venda" element={<CadastroVenda />} />
</Route>

{/* Paginas acessiveis a todos os usuarios autenticados */}
<Route path="/agendamentos/novo" element={<NovoAgendamento />} />
<Route path="/agendamentos/gerenciar" element={<GerenciarAgendamentos />} />
<Route path="/historico" element={<Historico />} />

{/* Contratos - todos as novas roles */}
<Route element={<ProtectedRoute requiredRoles={["admin", "provedor", "supervisor", "vendedor_clique", "vendedor_provedor"]} />}>
  <Route path="/contratos" element={<Contratos />} />
</Route>

{/* Configurar Vagas - admin, provedor, supervisor */}
<Route element={<ProtectedRoute requiredRoles={["admin", "provedor", "supervisor"]} />}>
  <Route path="/configuracoes/slots" element={<ConfigurarSlots />} />
</Route>

{/* Configuracoes admin-only - sem alteracao */}
<Route element={<ProtectedRoute requiredRole="admin" />}>
  <Route path="/configuracoes/planos" element={<ConfigurarPlanos />} />
  <Route path="/configuracoes/adicionais" element={<ConfigurarAdicionais />} />
  <Route path="/configuracoes/usuarios" element={<GerenciarUsuarios />} />
</Route>
```

---

#### 2.4 Ajustar redirecionamento padrao

Atualizar o redirecionamento inicial para direcionar `vendedor_provedor` para uma pagina que ele pode acessar:

```typescript
{/* Redirect padrao baseado na role */}
<Route path="/" element={<Navigate to="/agendamentos/novo" replace />} />
```

Ou criar logica condicional no componente de redirecionamento.

---

### Resumo dos Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Adicionar `vendedor_clique` e `vendedor_provedor` ao enum |
| `src/pages/GerenciarUsuarios.tsx` | Atualizar lista de roles disponiveis |
| `src/components/AppSidebar.tsx` | Atualizar logica de visibilidade do menu |
| `src/App.tsx` | Atualizar rotas protegidas |

### Observacoes

1. As roles antigas (`tecnico`, `vendedor`, `atendente`) permanecerao no banco de dados, mas nao aparecerão mais na interface de gerenciamento
2. Usuarios com roles antigas continuarao funcionando com acesso basico (paginas que nao requerem role especifica)
3. Recomenda-se migrar usuarios existentes para as novas roles manualmente ou via script SQL
