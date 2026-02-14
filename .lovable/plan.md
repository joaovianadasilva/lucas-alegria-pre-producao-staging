
## Gerenciamento de Usuarios por Provedor

### Problema identificado
1. Ao criar um provedor, ninguem e vinculado a ele automaticamente na tabela `usuario_provedores`
2. Nao existe interface para vincular/desvincular usuarios a provedores
3. Sem vinculo, nenhum usuario (exceto super_admin que ve tudo) consegue acessar o novo provedor

### Solucao proposta

#### 1. Auto-vincular criador ao novo provedor (Backend)
Na edge function `manage-provedores`, na action `createProvedor`, apos inserir o provedor, inserir automaticamente um registro em `usuario_provedores` vinculando o usuario que criou ao novo provedor.

#### 2. Adicionar actions de gerenciamento de vinculos (Backend)
Adicionar na edge function `manage-provedores` tres novas actions:
- `listUsuariosProvedor` - listar usuarios vinculados a um provedor (com dados do profile)
- `addUsuarioProvedor` - vincular um usuario a um provedor
- `removeUsuarioProvedor` - desvincular um usuario de um provedor

#### 3. Interface de gerenciamento de usuarios por provedor (Frontend)
Na pagina `GerenciarProvedores.tsx`, adicionar para cada provedor na tabela um botao "Gerenciar Usuarios" que abre um dialog com:
- Lista de usuarios ja vinculados ao provedor (com opcao de remover)
- Campo para buscar e adicionar novos usuarios (por email ou nome)

### Detalhes tecnicos

**Edge Function (`manage-provedores/index.ts`):**

```text
case 'createProvedor':
  // ... insercao existente ...
  // NOVO: auto-vincular criador
  await supabaseAdmin
    .from('usuario_provedores')
    .insert({ user_id: user.id, provedor_id: data.id });

case 'listUsuariosProvedor':
  // Buscar vinculos + join com profiles
  // Parametros: provedorId

case 'addUsuarioProvedor':
  // Inserir em usuario_provedores
  // Parametros: provedorId, userId

case 'removeUsuarioProvedor':
  // Deletar de usuario_provedores
  // Parametros: provedorId, userId
```

**Frontend (`GerenciarProvedores.tsx`):**
- Novo componente/dialog `GerenciarUsuariosProvedorDialog`
- Botao "Usuarios" na coluna de acoes de cada provedor na tabela
- Dialog com lista de usuarios vinculados e opcao de adicionar/remover
- Busca de usuarios via edge function `manage-users` (listUsers) ou nova action

**Busca de usuarios disponiveis:**
- Utilizar a edge function `manage-users` existente (action `listUsers`) para listar usuarios do sistema
- No dialog, mostrar um select/combobox com usuarios que ainda nao estao vinculados ao provedor
