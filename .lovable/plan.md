## Módulo: Réguas de Comissão

### Princípios

- **Forward-looking**: a régua só processa eventos positivos (venda, ativação). Cancelamentos, reembolsos, estornos e recálculos retroativos **não** entram aqui — ficam no módulo financeiro existente.
- **Pipeline conceitual**: Regras de Receita → Bases calculadas → Réguas de Comissão → Comissão calculada.
- A régua **consome** bases de uma Regra de Receita; não escolhe contratos manualmente, não trata deltas, não reabre períodos.
- Auditoria mínima: persiste o resultado calculado/pago. Sem snapshot complexo, sem reprocessamento retroativo nesta fase.

### Arquitetura de dados

Reaproveitar a tabela `regras_operacionais_provedor` (já aceita `tipo='receita'`) acrescentando o novo `tipo='comissao'`. Estrutura do JSON `regra` para comissão:

```text
{
  regra_receita_id: uuid,          // FK lógica para a regra de receita vinculada
  vigencia_inicio, vigencia_fim,
  tipo_regua: 'percentual_fixo' | 'faixa_volume' | 'faixa_valor'
            | 'valor_fixo_unidade' | 'hibrida',
  base_faixa: 'planos_vendidos' | 'adicionais_vendidos' | 'contratos'
            | 'valor_plano' | 'valor_adicionais' | 'valor_total_venda',
  base_calculo: <mesmas opções, conforme tipo>,
  faixas: [
    { min: number, max: number|null, fator: number,
      tipo_fator: 'percentual' | 'valor_fixo', descricao?: string }
  ],
  percentual_fixo?: number,        // só para tipo percentual_fixo
  valor_fixo_unidade?: number,     // só para tipo valor_fixo_unidade
  ciclo: {
    tipo: 'evento' | 'semanal' | 'quinzenal' | 'mensal' | 'personalizado',
    dia_pagamento?: number,        // ex.: dia do mês para pagamento
    custom?: { intervalo_dias?: number, ancora?: string }
  }
}
```

Validações por `tipo_regua`:
- `percentual_fixo` → exige `percentual_fixo` e `base_calculo`; ignora `faixas`/`base_faixa`.
- `faixa_volume` → `base_faixa` deve ser de volume; `base_calculo` = base_faixa.
- `faixa_valor` → `base_faixa` deve ser de valor; `base_calculo` = base_faixa.
- `valor_fixo_unidade` → exige `valor_fixo_unidade` e `base_calculo` de volume.
- `hibrida` → `base_faixa` (volume ou valor) ≠ `base_calculo` (independente).

Migração: ampliar o CHECK de `tipo` em `regras_operacionais_provedor` para incluir `'comissao'`.

### Backend (edge function `central-operacional`)

Adicionar actions:
- `listarReguasComissao` (filtro `tipo='comissao'`, opcional por `provedor`)
- `salvarReguaComissao` (insert/update; valida payload; injeta `provedor_id`/`provedor_ids`/`aplica_todos` igual ao fluxo de receita)
- `excluirReguaComissao`, `atualizarReguaComissao` (toggle ativo) — pode reaproveitar `excluirRegra`/`atualizarRegra` existentes.
- `listarRegrasReceitaParaVinculo` — devolve resumo `{ id, nome, provedor_ids, aplica_todos, bases_disponiveis }` para o select da régua. `bases_disponiveis` é derivado da regra de receita: `base_valor`, `base_volume`, e se `base_comissao.ativa` também a base extra.

Sem cálculo de comissão nesta entrega (apenas CRUD + prévia). Cálculo entra em iteração futura.

### Frontend

#### Nova aba "Comissão" em `RegrasOperacionais.tsx`
Adicionar `TabsTrigger value="comissao"` ao lado das três existentes. A listagem desta aba tem colunas próprias (a tabela genérica atual não serve):

| Nome | Provedor | Regra de Receita | Tipo | Base faixa | Base cálculo | Ciclo | Vigência | Status | Ações |

Ações: editar, **duplicar**, ativar/inativar, excluir.

#### Novo componente `ReguaComissaoEditorDialog.tsx`
Modal seguindo o mesmo padrão visual do `RegraReceitaEditorDialog` (cards numerados, bloco de Provedor alvo separado conforme já implementado). Seções:

1. **Dados gerais** — nome, descrição, status, vigência inicial/final.
2. **Provedor alvo** — RadioGroup "todos / selecionar provedores" (reaproveitar o bloco já criado para receita).
3. **Regra de Receita vinculada** — Select com regras de receita disponíveis para o(s) provedor(es) selecionado(s). Ao escolher, mostra um card de leitura com as bases que a regra disponibiliza (base_valor, base_volume e, se houver, base_comissao). O filtro de provedor deve ser coerente: só listar regras com `aplica_todos=true` ou que cubram todos os provedores selecionados.
4. **Tipo da régua** — RadioGroup com 5 opções (percentual fixo, faixa por volume, faixa por valor, valor fixo por unidade, híbrida) com descrição curta em cada uma.
5. **Base para definir faixa** — Select. Opções filtradas pelas bases disponíveis na regra de receita vinculada e pelo tipo. Oculto para `percentual_fixo`.
6. **Base para calcular comissão** — Select. Para tipos não-híbridos, pré-preenche/iguala à base_faixa. Para `hibrida`, livre entre as bases disponíveis.
7. **Faixas e fatores** — tabela editável (add/remove linha): `min`, `max` (opcional, último em branco = ∞), `fator`, `tipo_fator` (percentual|valor fixo), `descricao`. Oculta para `percentual_fixo` e `valor_fixo_unidade` (que exibem um input único). Validação: faixas contínuas, sem sobreposição, ordenadas.
8. **Ciclo de apuração** — Select de tipo + campos auxiliares (dia previsto de pagamento; intervalo personalizado).
9. **Prévia em linguagem natural** — bloco somente-leitura que monta uma frase a partir da configuração. Exemplos:
   - Híbrida: "A cada quinzena, para cada provedor, calcula a faixa pela quantidade de planos vendidos (Regra: Receita W2A por venda) e aplica o percentual da faixa sobre o valor total da venda."
   - Faixa W2A renderizada como lista: `1–65 → 100%`, `66–79 → 120%`, …

Validação no `src/lib/regras/comissao.ts` (novo arquivo, espelhando `receita.ts`): nome obrigatório, vigência, regra de receita vinculada existente, faixas coerentes, etc.

### Roteamento

Reaproveitar a rota atual `/central/regras` — apenas mais uma aba. Nada novo no router.

### Fora de escopo (esta entrega)

- Motor de cálculo de comissão (gera valores por ciclo) — fica para próxima iteração.
- Snapshot/auditoria avançada.
- Qualquer tratamento de cancelamento/reembolso/estorno na régua.
- Pagamento efetivo (apenas configuração de ciclo + data prevista).

### Arquivos afetados

- `supabase/migrations/<novo>.sql` — ampliar CHECK de `tipo` para aceitar `'comissao'`.
- `supabase/functions/central-operacional/index.ts` — actions de CRUD para réguas de comissão e listagem auxiliar de regras de receita.
- `src/lib/regras/comissao.ts` — tipos, catálogos, `emptyReguaComissao`, `validateReguaComissao`.
- `src/components/ReguaComissaoEditorDialog.tsx` — novo modal.
- `src/pages/central/RegrasOperacionais.tsx` — nova aba "Comissão" + tabela própria + integração com o novo modal.
- (Opcional) pequenos ajustes em `RegraReceitaEditorDialog.tsx` para extrair o bloco de "Provedor alvo" em um subcomponente compartilhado.

### Perguntas em aberto (assumir defaults se não houver resposta)

- Ciclo "personalizado" — assumir apenas `intervalo_dias` + âncora opcional. OK?
- Duplicar régua — copia tudo e prefixa o nome com "Cópia de". OK?
- "Data prevista de pagamento" no ciclo — apenas um número (dia do mês) ou data fixa? Vou assumir `dia do mês` com offset opcional em dias após fim do ciclo.
