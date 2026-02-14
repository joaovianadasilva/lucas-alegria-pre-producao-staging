

## Melhorias no Dialog de Usuarios por Provedor

### Problema 1: Criar usuario novo direto pelo dialog

Atualmente, o dialog so permite selecionar usuarios ja existentes no sistema. Vamos adicionar um botao "Novo Usuario" que abre um formulario inline (ou sub-dialog) para criar um usuario do zero e ja vincula-lo ao provedor automaticamente.

**Abordagem:** Adicionar um estado de modo no dialog (visualizacao normal vs. formulario de criacao). Quando o usuario clicar em "Novo Usuario", aparece um formulario com campos: nome, sobrenome, email, senha, telefone (opcional) e role. Ao submeter, chama a edge function `manage-users` com action `createUser` passando o `provedorId` do provedor atual -- isso ja cria o usuario E vincula ao provedor. Apos sucesso, invalida as queries e volta para o modo de listagem.

### Problema 2: Barra de rolagem visivel na lista de usuarios

O `ScrollArea` esta aplicado mas sem altura fixa obrigatoria -- o componente precisa de uma altura definida para ativar a rolagem. Vamos aplicar `h-[400px]` (altura fixa) em vez de apenas `max-h-[400px]`, e adicionar `overflow-y-scroll` no estilo para garantir que a barra de rolagem fique sempre visivel (conforme padrao ja usado em outros modais do projeto).

### Alteracoes tecnicas

**Arquivo: `src/components/GerenciarUsuariosProvedorDialog.tsx`**

1. Adicionar estados para modo de criacao (`showCreateForm`) e dados do formulario (`newUserForm` com campos nome, sobrenome, email, password, telefone, role)
2. Adicionar constante `availableRoles` (mesma lista usada em `GerenciarUsuarios.tsx`)
3. Adicionar mutation `createUserMutation` que chama `manage-users` com action `createUser` e o `provedorId` atual
4. No JSX, adicionar botao "Novo Usuario" ao lado do select de adicionar existente
5. Quando `showCreateForm` estiver ativo, renderizar formulario com os campos necessarios no lugar do select
6. Corrigir ScrollArea: trocar `max-h-[400px]` por classe com altura fixa e `overflow-y-scroll` para garantir barra de rolagem visivel

**Nenhuma alteracao no backend** -- a edge function `manage-users` ja suporta `createUser` com `provedorId` e ja faz a vinculacao automatica.
