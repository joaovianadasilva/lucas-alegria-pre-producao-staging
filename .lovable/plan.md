

## Plano: Adicionar Role Tecnico de Volta ao Gerenciamento

### Objetivo

Adicionar a role `tecnico` de volta a lista de roles disponiveis na interface de gerenciamento de usuarios, permitindo que ela seja combinada com outras roles.

---

### Contexto

A role `tecnico` tem uma funcao especifica no sistema:
- **Nao define permissoes de acesso a paginas**
- **Identifica usuarios que podem ser atribuidos como "Tecnico Responsavel" em agendamentos**
- O hook `useTecnicos.ts` busca usuarios com esta role para popular o seletor de tecnicos

Por isso, a role `tecnico` deve poder ser **combinada** com outras roles de acesso (ex: um usuario pode ter `vendedor_provedor` + `tecnico`).

---

### Alteracao Necessaria

**Arquivo**: `src/pages/GerenciarUsuarios.tsx`

**Linha 25-30** - Adicionar `tecnico` a lista de roles disponiveis:

```typescript
const availableRoles = [
  { value: 'admin', label: 'Administrador' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'vendedor_clique', label: 'Vendedor Clique' },
  { value: 'vendedor_provedor', label: 'Vendedor Provedor' },
  { value: 'tecnico', label: 'Tecnico' },
];
```

---

### Comportamento Esperado

1. A role `tecnico` aparecera no dropdown de roles ao criar um novo usuario
2. A role `tecnico` aparecera no seletor "+" para adicionar roles a usuarios existentes
3. Usuarios com a role `tecnico` aparecerao no seletor de "Tecnico Responsavel" em agendamentos
4. A role `tecnico` pode ser combinada com qualquer outra role (ex: `supervisor` + `tecnico`)

---

### Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/GerenciarUsuarios.tsx` | Adicionar `{ value: 'tecnico', label: 'Tecnico' }` ao array `availableRoles` |

