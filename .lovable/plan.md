

## Corrigir data de nascimento exibida 1 dia atrasada na visualizacao do contrato

### Causa raiz

No `ContractDetailsDialog.tsx` (linha 72-75), a funcao `formatDate` faz:
```typescript
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};
```

`new Date("1986-10-14")` interpreta a string como UTC (meia-noite UTC). No fuso horario do Brasil (UTC-3), isso vira `13/10/1986 21:00`, exibindo o dia anterior.

O projeto ja possui `src/lib/dateUtils.ts` com a funcao `formatLocalDate` que faz o parsing correto sem conversao de timezone.

### Solucao

**Arquivo:** `src/components/ContractDetailsDialog.tsx`

1. Importar `formatLocalDate` de `@/lib/dateUtils`
2. Substituir a funcao local `formatDate` para usar `formatLocalDate` internamente

Funcao corrigida:
```typescript
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return formatLocalDate(dateString);
};
```

### Resumo

- 1 arquivo alterado: `src/components/ContractDetailsDialog.tsx`
- Adicionar import de `formatLocalDate`
- Alterar `formatDate` para usar `formatLocalDate` em vez de `new Date()`
- Corrige a exibicao da data de nascimento (e todas as outras datas) no modal de visualizacao do contrato

