
## Ajustes na aba "Receita" de Regras Operacionais

Refinar o catálogo de **eventos geradores** das regras de receita para refletir apenas eventos de receita positiva, conforme definição de negócio.

### Mudanças

**1. `src/lib/regras/receita.ts`**

Reduzir a lista `EVENTOS_GERADORES` para apenas:
- `venda` — conta todo contrato criado no período (independe de `status_contrato`; cancelamentos posteriores não retiram da base)
- `ativacao` — contrato com `data_ativacao` preenchida

Remover:
- `instalacao` (era sinônimo de `ativacao` no schema atual — sem coluna própria)
- `cancelamento` e `reembolso` (não geram receita positiva; permanecem disponíveis apenas nas regras Operacionais existentes)

Ajustar também o default das **datas de referência** sugeridas por evento:
- `venda` → `created_at`
- `ativacao` → `data_ativacao`

A lista completa de datas selecionáveis permanece (o usuário ainda pode escolher `data_pgto_primeira_mensalidade` etc. para reconhecimento por pagamento), só muda o default e os eventos disponíveis.

**2. `src/components/RegraReceitaEditorDialog.tsx`**

- Atualizar o `Select` de evento gerador para refletir a nova lista (2 opções).
- Ajustar texto de ajuda abaixo do campo explicando o significado de cada evento.
- Se uma regra existente no banco tiver `evento = 'instalacao' | 'cancelamento' | 'reembolso'`, o editor exibe um aviso e força a re-seleção antes de salvar (sem migração silenciosa).
- Atualizar a validação em `validateRegraReceita` para aceitar apenas `venda | ativacao`.

**3. `supabase/functions/central-operacional/index.ts`**

Nenhuma mudança estrutural — a função apenas persiste o JSON. Mas adicionar validação defensiva no payload `tipo='receita'` rejeitando `evento` fora de `['venda','ativacao']` para evitar inserção inválida via API.

### Fora de escopo

- Migração de dados (não há regras de receita em produção ainda, criadas agora).
- Qualquer mudança nas abas Recebimento/Reembolso.
- Cálculo agregado / dashboards (continua fora desta entrega).
