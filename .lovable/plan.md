
## Problema: Race condition entre `getSession` e `onAuthStateChange`

### O que está acontecendo

Ao carregar a aplicação, dois fluxos rodam quase simultaneamente:

1. `onAuthStateChange` dispara `INITIAL_SESSION` e como `initializedRef.current` ainda é `false`, entra no bloco e chama `fetchProvedores` dentro de um `setTimeout` — **mas sem as roles ainda carregadas** (roles chegam vazia `[]`).
2. `getSession` roda de forma síncrona, busca as roles corretamente (incluindo `super_admin`) e chama `fetchProvedores` com roles corretas, depois marca `initializedRef.current = true`.

O problema: qual das duas chamadas de `fetchProvedores` termina por **último** define o estado final. Se o `onAuthStateChange` (com roles vazias, portanto `isSA = false`) terminar depois do `getSession`, o resultado é `provedoresDisponiveis` com apenas os provedores via `usuario_provedores` — sem detecção de `super_admin` — e a lista pode aparecer incompleta dependendo da velocidade de cada chamada.

No banco confirmamos: o usuário tem 3 provedores nos dois caminhos (tanto super_admin quanto usuario_provedores), mas a inconsistência de roles no segundo fetch pode causar comportamento imprevisível.

### Solução

Marcar `initializedRef.current = true` **imediatamente** antes de fazer qualquer chamada assíncrona no bloco `getSession`, para garantir que quando o `onAuthStateChange` verificar a flag, ela já esteja marcada como `true` e o segundo fetch seja ignorado.

**Arquivo: `src/contexts/AuthContext.tsx`**

Linha atual (problema):
```typescript
supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
  setSession(currentSession);
  setUser(currentSession?.user ?? null);

  if (currentSession?.user) {
    const userRoles = await fetchProfileAndRoles(currentSession.user.id);
    await fetchProvedores(currentSession.user.id, userRoles);
    initializedRef.current = true;  // <- marcado só APÓS os fetches
  }
  setLoading(false);
});
```

Correção (marcar ANTES dos fetches):
```typescript
supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
  setSession(currentSession);
  setUser(currentSession?.user ?? null);

  if (currentSession?.user) {
    initializedRef.current = true;  // <- marcado ANTES, bloqueando o onAuthStateChange
    const userRoles = await fetchProfileAndRoles(currentSession.user.id);
    await fetchProvedores(currentSession.user.id, userRoles);
  }
  setLoading(false);
});
```

### Por que funciona

Com `initializedRef.current = true` marcado antes dos awaits, quando o `onAuthStateChange` disparar `INITIAL_SESSION` (que ocorre logo em seguida), a condição `!initializedRef.current` já será `false` e o segundo `fetchProvedores` nunca será executado — eliminando a race condition.

### Arquivo alterado

- `src/contexts/AuthContext.tsx` (apenas mover uma linha de código)
