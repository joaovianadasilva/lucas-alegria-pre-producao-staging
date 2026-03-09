

## Modificar seletor de adicionais para suportar quantidade (com linhas duplicadas)

### Abordagem

Em vez de armazenar quantidade como campo, ao selecionar um adicional com quantidade 3, inserimos 3 linhas idênticas na tabela `adicionais_contrato`. Isso mantém compatibilidade total com o schema atual sem alterações no banco.

### Mudanças

**1. Schema do formulário (`FormularioCompleto.tsx`)**
- Mudar `adicionaisContratados` de `z.array(z.string())` para `z.array(z.object({ item: z.string(), quantidade: z.number().min(1) }))`

**2. UI do seletor de adicionais (`FormularioCompleto.tsx`)**
- Ao marcar checkbox, exibir stepper (- / +) com quantidade mínima 1
- Badges mostram `"Nome (x2)"` com botão de remover
- Desmarcar remove o adicional

**3. Resumo do contrato (`FormularioCompleto.tsx`)**
- Multiplicar valor pela quantidade: `"Roteador (x2) — R$ 20,00"`
- Total mensal soma `valor * quantidade` de cada adicional

**4. `algumAdicionalRequerAgenda` (`FormularioCompleto.tsx`)**
- Adaptar para ler `item` do objeto em vez de string direta

**5. Backend (`manage-contracts/index.ts`)**
- Aceitar novo formato `{ item: string, quantidade: number }`
- Para cada adicional, criar N linhas em `adicionais_contrato` (uma por unidade)
- Exemplo: quantidade 3 gera 3 inserts com mesmo código/nome/valor
- `valorTotalAdicionais = sum(valor * quantidade)`

**6. Tipo (`src/types/formulario.ts`)**
- Atualizar `adicionaisContratados` para `{ item: string; quantidade: number }[]`

### Arquivos afetados
- `src/components/FormularioCompleto.tsx` — schema, UI, resumo, submit
- `src/types/formulario.ts` — tipo
- `supabase/functions/manage-contracts/index.ts` — parsing e inserção de N linhas

