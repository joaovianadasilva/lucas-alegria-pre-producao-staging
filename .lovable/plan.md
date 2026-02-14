

## Editar provedor: nome e logo

### O que sera feito

Adicionar um botao de editar (icone de lapis) em cada linha da tabela de provedores que abre um dialog para alterar o nome e a URL da logo.

### Alteracoes

**Arquivo: `src/pages/GerenciarProvedores.tsx`**

1. Adicionar estado para controlar o dialog de edicao (`editDialog`) com `open`, `provedorId`, `nome` e `logoUrl`
2. Criar uma mutation `updateMutation` que chama a action `updateProvedor` ja existente no edge function, enviando `provedorId`, `nome` e `logoUrl`
3. Adicionar um Dialog de edicao com formulario de nome e URL da logo, pre-preenchido com os dados atuais do provedor
4. Adicionar um botao com icone de lapis (Pencil) na coluna de acoes de cada linha, ao lado dos botoes existentes de usuarios e power
5. Importar o icone `Pencil` do lucide-react

**Nenhuma alteracao no backend** -- a action `updateProvedor` ja existe e aceita `nome` e `logoUrl`.
