

## Adicionar Data de Nascimento no modal de detalhes do contrato

### Problema
O modal "Resumo do Contrato" na tela de contratos nao exibe o campo "Data de Nascimento" na secao "Informacoes Pessoais", mesmo que o dado exista no banco de dados (coluna `data_nascimento` na tabela `contratos`).

### Solucao

**Arquivo: `src/components/ContractDetailsDialog.tsx`**

Adicionar uma linha `InfoRow` com label "Data de Nascimento" na secao "Informacoes Pessoais", exibindo para todos os tipos de cliente (pf, pj, estrangeiro) logo apos os campos especificos de cada tipo e antes dos campos de contato (Telefone, Celular, Email).

A data ja e formatada pela funcao `formatDate` existente no componente, entao basta adicionar:

```
<InfoRow label="Data de Nascimento" value={formatDate(contract.data_nascimento)} />
```

O campo sera inserido apos o bloco condicional de tipo de cliente (pf/pj/estrangeiro) e antes do campo "Telefone".

### Arquivo alterado
- `src/components/ContractDetailsDialog.tsx`

