# Corrigir builder de regras

## Problema

No `RegraEditorDialog.tsx`, clicar em **"+ Condição"** ou **"+ Grupo"** no nível raiz não tem efeito.

**Causa:** em `updateNode`, com `path=[]`, o código faz `parent.children[0] = updater(...)` em um wrapper local `{ children: [clone] }`. Isso reatribui o slot do array temporário, mas a variável `clone` continua apontando para o objeto antigo — e é `clone` que vai pro `setTree`. Resultado: ações no grupo raiz (adicionar condição/grupo, remover filho via helper, etc.) não modificam o estado.

Em grupos aninhados funciona "por acidente" porque a mutação acontece dentro do `clone` real.

## Correção

Reescrever `updateNode` com recursão imutável que funciona em qualquer profundidade, incluindo raiz:

```ts
const updateNode = (path: number[], updater: (n: Node) => Node) => {
  const recur = (node: Node, depth: number): Node => {
    if (depth === path.length) return updater(node);
    if (!isGroup(node)) return node;
    const idx = path[depth];
    const newChildren = node.children.map((c, i) => i === idx ? recur(c, depth + 1) : c);
    return { ...node, children: newChildren };
  };
  setTree(recur(tree, 0) as Group);
};
```

## Limpeza adicional (mesmo arquivo)

- Adicionar `DialogDescription` no `DialogContent` para eliminar o warning de acessibilidade visto no console.
- Pré-popular **uma condição inicial** ao abrir "Nova regra" para o usuário não ver a tela vazia "Nenhuma condição".

## Arquivo afetado

- `src/components/RegraEditorDialog.tsx`

## Validação

- Abrir "Nova regra" → "+ Condição" adiciona linha. ✓
- "+ Grupo" adiciona grupo filho. ✓
- Adicionar/remover dentro de grupo aninhado segue funcionando. ✓
- Console limpo (sem warning de DialogDescription). ✓
