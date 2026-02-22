

## Adicionar campo "Data de Nascimento" para todos os tipos de cliente no modal de edicao

### Problema

No `ContractEditDialog.tsx`, o campo "Data de Nascimento" so aparece quando o tipo de cliente e "Estrangeiro" (linha 477). Para clientes PF e PJ, o campo nao e exibido, impossibilitando a edicao.

### Solucao

Mover o campo "Data de Nascimento" para fora dos blocos condicionais de tipo de cliente, colocando-o como campo comum visivel para todos os tipos (PF, PJ e Estrangeiro), logo apos o bloco do tipo de cliente e antes dos campos de telefone/celular.

### Alteracao

**Arquivo:** `src/components/ContractEditDialog.tsx`

1. Remover o campo "Data de Nascimento" de dentro do bloco `tipoCliente === 'estrangeiro'` (linhas 477-479)
2. Adicionar o campo "Data de Nascimento" como campo independente, visivel para todos os tipos de cliente, entre o bloco condicional de tipo de cliente e os campos de telefone/celular (antes da linha 483)

O campo continuara usando `<Input type="date">` com o estado `dataNascimento` que ja existe e ja e enviado no payload de salvamento.
