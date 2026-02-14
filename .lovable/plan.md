

## Persistir provedor no localStorage e eliminar re-fetches desnecessarios

### Problema

Ao alternar abas do navegador, o Supabase re-emite o evento `SIGNED_IN`, que dispara `fetchProvedores` novamente. Isso causa `setProvedoresLoading(true)`, re-renders e fecha modais abertos.

### Solucao

**Arquivo: `src/contexts/AuthContext.tsx`**

1. **Persistir provedor no localStorage**: Salvar o ID do provedor selecionado em `localStorage` na funcao `selecionarProvedor` e sempre que o provedor ativo mudar.

2. **Restaurar do localStorage na inicializacao**: Ao carregar provedores, verificar se ha um ID salvo no localStorage e restaurar a selecao automaticamente (se o provedor ainda existir na lista).

3. **Adicionar um `useRef` de controle (`initializedRef`)**: Marcar como `true` apos a primeira carga completa. Se ja estiver inicializado, nao executar `fetchProfileAndRoles` e `fetchProvedores` novamente nos eventos do `onAuthStateChange`.

4. **Limpar localStorage no logout**: Remover a chave do localStorage ao fazer signOut.

### Detalhes tecnicos

- Chave no localStorage: `provedorAtivoId`
- Na funcao `selecionarProvedor`, salvar: `localStorage.setItem('provedorAtivoId', id)`
- Na funcao `fetchProvedores`, apos carregar a lista, verificar `localStorage.getItem('provedorAtivoId')` e restaurar se o provedor existir na lista
- Adicionar `const initializedRef = useRef(false)` e no `onAuthStateChange`, se `initializedRef.current === true`, apenas atualizar session/user sem re-buscar dados
- No `getSession` inicial, marcar `initializedRef.current = true` apos a carga
- No `signOut`, fazer `localStorage.removeItem('provedorAtivoId')` e resetar `initializedRef.current = false`

### Resultado esperado

- Ao alternar abas: nenhum re-fetch, nenhum loading, modais permanecem abertos
- Ao fazer refresh da pagina: provedor restaurado do localStorage automaticamente
- Ao fazer login: comportamento normal de carga
- Ao fazer logout: estado limpo corretamente

### Arquivos alterados

- `src/contexts/AuthContext.tsx`
