

## Remover localStorage do provedor ativo e corrigir redirecionamento

### Problema

O provedor ativo esta sendo salvo no `localStorage`, o que causa dois problemas:
1. Ao acessar `/selecionar-provedor`, o provedor ja esta restaurado e a pagina redireciona automaticamente
2. Ao trocar de provedor, o estado antigo persiste e pode causar inconsistencias

### Solucao

Remover completamente o uso de `localStorage` para o provedor. O provedor sera mantido apenas em memoria (estado React). Ao recarregar a pagina ou fazer novo login, o sistema redireciona para `/selecionar-provedor` (ou auto-seleciona se so tem 1 provedor).

### Alteracoes

**Arquivo: `src/contexts/AuthContext.tsx`**

1. Remover a constante `PROVEDOR_STORAGE_KEY`
2. Na funcao `fetchProvedores`: remover a logica de restaurar provedor do `localStorage` (linhas que fazem `localStorage.getItem`). Manter apenas a auto-selecao quando ha exatamente 1 provedor
3. Na funcao `selecionarProvedor`: remover `localStorage.setItem`
4. Na funcao `signOut`: remover `localStorage.removeItem(PROVEDOR_STORAGE_KEY)`

**Arquivo: `src/pages/SelecionarProvedor.tsx`**

1. Remover o primeiro `useEffect` que redireciona quando `provedorAtivo` ja existe (linhas 14-18) -- esse efeito causava o redirecionamento indesejado
2. Manter o segundo `useEffect` que auto-seleciona quando ha apenas 1 provedor

**Arquivo: `src/components/AppLayout.tsx`**

1. No botao de trocar provedor, remover `localStorage.removeItem('provedorAtivoId')` -- basta navegar para `/selecionar-provedor`

### Comportamento resultante

- Login com 1 provedor: auto-seleciona, vai direto para o sistema
- Login com 2+ provedores: mostra tela de selecao
- Trocar provedor: clica no botao, vai para tela de selecao, escolhe outro
- Recarregar pagina (F5): como nao ha provedor em memoria, redireciona para selecao (ou auto-seleciona se so tem 1)
