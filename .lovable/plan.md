

## Adicionar menu lateral na pagina Gerenciar Provedores

### Problema

A rota `/gerenciar-provedores` esta definida fora do grupo que usa `<AppLayout />`, por isso nao tem sidebar nem header. As outras paginas protegidas estao dentro do bloco `<ProtectedRoute><AppLayout /></ProtectedRoute>`, que fornece o layout com sidebar.

### Alteracao

**Arquivo: `src/App.tsx`**

Mover a rota `/gerenciar-provedores` para dentro do bloco que usa `<AppLayout />`, mantendo a restricao de `super_admin`. Trocar de:

```text
<Route element={<ProtectedRoute requireProvedor={false} requiredRole="super_admin" />}>
  <Route path="/gerenciar-provedores" element={<GerenciarProvedores />} />
</Route>
```

Para dentro do bloco existente com AppLayout:

```text
<Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  ...
  <Route element={<ProtectedRoute requiredRole="super_admin" />}>
    <Route path="/gerenciar-provedores" element={<GerenciarProvedores />} />
  </Route>
</Route>
```

Isso faz com que a pagina herde o sidebar, header e todo o layout padrao, mantendo a protecao de role `super_admin`. O `requireProvedor` passa a ser `true` (padrao), o que e aceitavel pois o super_admin sempre tem pelo menos um provedor disponivel.

Nenhum outro arquivo precisa ser alterado -- o `AppSidebar` ja exibe o link "Gerenciar Provedores" para super_admin.

