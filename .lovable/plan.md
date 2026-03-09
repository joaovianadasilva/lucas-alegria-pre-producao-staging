

## Modificar seletor de adicionais para suportar quantidade

### Problema atual
O seletor de adicionais funciona como um multi-select simples (checkbox), onde cada adicional pode ser apenas selecionado ou não. Não há como informar a quantidade de cada adicional.

### Proposta de design

Substituir o popover com checkboxes por uma lista interativa onde, ao selecionar um adicional, aparece um controle de quantidade (stepper com botões - / +). O design seria:

```text
┌─────────────────────────────────────────────┐
│ Adicionais Contratados                      │
│ ┌─────────────────────────────────────────┐ │
│ │ 2 adicional(is) selecionado(s)      ▼   │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ ┌─ Popover ─────────────────────────────┐   │
│ │ ☑ [01] - Roteador - R$ 10,00         │   │
│ │     Qtd: [ - ]  2  [ + ]             │   │
│ │                                       │   │
│ │ ☑ [02] - IP Fixo - R$ 30,00          │   │
│ │     Qtd: [ - ]  1  [ + ]             │   │
│ │                                       │   │
│ │ ☐ [03] - TV Box - R$ 25,00           │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ Badges selecionados:                        │
│ [Roteador (x2) ✕] [IP Fixo (x1) ✕]        │
│                                             │
│ No resumo do contrato:                      │
│   Roteador (x2)           R$ 20,00          │
│   IP Fixo (x1)            R$ 30,00          │
└─────────────────────────────────────────────┘
```

### Mudanças técnicas

**1. Alterar o schema do formulário (`FormularioCompleto.tsx`)**
- Mudar `adicionaisContratados` de `z.array(z.string())` para `z.array(z.object({ item: z.string(), quantidade: z.number().min(1) }))` para armazenar a quantidade junto com cada adicional.

**2. Atualizar o seletor de adicionais (UI)**
- Dentro do Popover, ao marcar o checkbox de um adicional, exibir um stepper de quantidade (min: 1) logo abaixo do item.
- Desmarcar o checkbox remove o adicional da lista.

**3. Atualizar os badges de seleção**
- Exibir o nome do adicional com a quantidade: `"Roteador (x2)"`.

**4. Atualizar o resumo do contrato**
- Multiplicar o valor do adicional pela quantidade no cálculo do total.
- Exibir `"Roteador (x2) — R$ 20,00"` no resumo.

**5. Atualizar o cálculo de `algumAdicionalRequerAgenda`**
- Adaptar para o novo formato de objeto ao verificar se algum adicional requer agendamento.

**6. Atualizar o backend (`manage-contracts/index.ts`)**
- Aceitar o novo formato com quantidade.
- Ao inserir em `adicionais_contrato`, criar uma linha por unidade ou armazenar a quantidade (preferível: uma linha por adicional com o valor já multiplicado, mantendo compatibilidade).
- Ajustar o cálculo de `valorTotalAdicionais` para considerar a quantidade.

**7. Atualizar o envio do formulário (`onSubmit`)**
- Garantir que o novo formato é enviado corretamente ao backend.

### Arquivos afetados
- `src/components/FormularioCompleto.tsx` — schema, UI do seletor, resumo, submit
- `src/types/formulario.ts` — tipo do campo adicionais
- `supabase/functions/manage-contracts/index.ts` — parsing e cálculo com quantidade

