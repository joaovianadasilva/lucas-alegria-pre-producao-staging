

## Problema: Tela branca infinita em aba anônima

### Causa raiz

No `AuthContext`, o estado `provedoresLoading` começa como `true` e so e definido como `false` dentro da funcao `fetchProvedores`. Quando nao ha sessao (aba anonima ou navegador novo), `fetchProvedores` nunca e chamado, entao `provedoresLoading` fica `true` para sempre.

No `ProtectedRoute`, a condicao de loading e:
```
if (loading || provedoresLoading) { /* mostra spinner */ }
```

Como `provedoresLoading` nunca vira `false`, o spinner fica infinito e o redirect para `/auth` nunca acontece.

### Solucao

No bloco `getSession` dentro do `useEffect` em `AuthContext.tsx`, quando **nao ha sessao**, definir `provedoresLoading` como `false` explicitamente.

### Alteracao

**Arquivo:** `src/contexts/AuthContext.tsx`

Trecho atual (linhas 170-180):
```typescript
supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
  setSession(currentSession);
  setUser(currentSession?.user ?? null);

  if (currentSession?.user) {
    initializedRef.current = true;
    const userRoles = await fetchProfileAndRoles(currentSession.user.id);
    await fetchProvedores(currentSession.user.id, userRoles);
  }
  setLoading(false);
});
```

Correcao:
```typescript
supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
  setSession(currentSession);
  setUser(currentSession?.user ?? null);

  if (currentSession?.user) {
    initializedRef.current = true;
    const userRoles = await fetchProfileAndRoles(currentSession.user.id);
    await fetchProvedores(currentSession.user.id, userRoles);
  } else {
    setProvedoresLoading(false);  // Sem sessao, nao ha provedores para carregar
  }
  setLoading(false);
});
```

Tambem adicionar o mesmo tratamento no `onAuthStateChange` para o evento `INITIAL_SESSION` sem sessao:

Trecho atual (linhas 156-163):
```typescript
} else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !initializedRef.current) {
  if (currentSession?.user) {
    setTimeout(async () => {
      const userRoles = await fetchProfileAndRoles(currentSession.user.id);
      await fetchProvedores(currentSession.user.id, userRoles);
    }, 0);
  }
}
```

Correcao:
```typescript
} else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && !initializedRef.current) {
  if (currentSession?.user) {
    setTimeout(async () => {
      const userRoles = await fetchProfileAndRoles(currentSession.user.id);
      await fetchProvedores(currentSession.user.id, userRoles);
    }, 0);
  } else {
    setProvedoresLoading(false);
  }
}
```

### Resumo

- 1 arquivo alterado: `src/contexts/AuthContext.tsx`
- 2 blocos `else` adicionados para garantir que `provedoresLoading` seja `false` quando nao ha usuario logado
- Corrige a tela branca infinita em abas anonimas e navegadores novos
