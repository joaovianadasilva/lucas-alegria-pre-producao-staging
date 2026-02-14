

## Corrigir redirecionamento indesejado para tela de selecionar provedor

### Problema

Toda vez que o Supabase dispara um evento de autenticacao (como refresh de token), o `onAuthStateChange` executa `fetchProvedores`, que na linha 127 faz `setProvedorAtivo(null)` quando ha mais de 1 provedor -- mesmo que o usuario ja tenha selecionado um. O `ProtectedRoute` detecta que nao ha provedor ativo e redireciona para `/selecionar-provedor`.

### Solucao

**Arquivo: `src/contexts/AuthContext.tsx`**

1. Na funcao `fetchProvedores`, preservar o provedor ja selecionado ao inves de resetar para null. Se `provedorAtivo` ja estiver definido e ainda existir na lista de provedores carregada, manter a selecao atual.

2. No `onAuthStateChange`, evitar re-executar `fetchProvedores` em eventos que nao sejam de login/logout (como `TOKEN_REFRESHED` e `SIGNED_IN` repetido). Apenas executar no evento `SIGNED_IN` inicial e `SIGNED_OUT`.

### Detalhes tecnicos

Alterar a logica do bloco que define `provedorAtivo` dentro de `fetchProvedores`:

```
// Antes (sempre reseta):
if (provedores.length === 1) {
  setProvedorAtivo(provedores[0]);
} else {
  setProvedorAtivo(null);
}

// Depois (preserva selecao existente):
if (provedores.length === 1) {
  setProvedorAtivo(provedores[0]);
} else {
  setProvedorAtivo(prev => {
    if (prev && provedores.some(p => p.id === prev.id)) {
      return prev; // manter selecao atual
    }
    return null;
  });
}
```

Tambem filtrar eventos no `onAuthStateChange` para nao recarregar tudo em `TOKEN_REFRESHED`:

```
if (event === 'SIGNED_OUT') {
  // limpar estado
} else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
  // carregar perfil e provedores
}
```

### Arquivos alterados

- `src/contexts/AuthContext.tsx`

