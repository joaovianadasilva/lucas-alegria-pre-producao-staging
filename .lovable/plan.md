

## Problem

When a sale is registered via "Cadastro de Venda", the contract correctly stores `origem` and `representante_vendas`. However, the linked appointment (`agendamentos`) does not receive these fields because they are omitted from the insert on lines 207-221 of `manage-contracts/index.ts`.

The `agendamentos` table already has `origem` and `representante_vendas` columns, so the fix is straightforward.

## Plan

**Edit `supabase/functions/manage-contracts/index.ts`** (lines 207-221):

Add `origem` and `representante_vendas` to the agendamento insert:

```typescript
.insert({
  provedor_id: provedorId,
  contrato_id: contratoId,
  data_agendamento: dataAgendamento,
  slot_numero: slotAgendamento,
  nome_cliente: nomeCompleto,
  email_cliente: email,
  telefone_cliente: celular || telefone,
  status: 'pendente',
  confirmacao: 'pre-agendado',
  origem: origem || null,
  representante_vendas: representanteVendas || null,
})
```

Then redeploy the `manage-contracts` edge function.

This is a single-file change with no database modifications needed.

