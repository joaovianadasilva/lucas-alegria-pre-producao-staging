

## Corrigir largura do modal e rolagem horizontal

### Problema
O `DialogContent` usa `max-w-lg` (32rem / 512px), que e estreito demais para a tabela com 3 colunas (Nome, Email, botao de remover). Os emails longos forcam rolagem horizontal.

### Alteracao

**Arquivo: `src/components/GerenciarUsuariosProvedorDialog.tsx`**

1. Aumentar a largura maxima do dialog de `max-w-lg` para `max-w-2xl` (672px), dando espaco suficiente para a tabela sem rolagem horizontal
2. Adicionar `overflow-x-hidden` no container da tabela para prevenir qualquer overflow residual
3. Aplicar `truncate` na celula de email para que emails muito longos sejam cortados com reticencias em vez de forcar expansao horizontal

### Detalhes tecnicos

- Linha 134: trocar `max-w-lg` por `max-w-2xl`
- Linha 255: adicionar classe `truncate max-w-[200px]` na `TableCell` do email para truncar textos longos

