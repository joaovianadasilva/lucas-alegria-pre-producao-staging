## Visão Geral dos Agendamentos — novo relatório

Criar uma nova tela de relatório seguindo o mesmo padrão visual e arquitetura do **Visão Geral de Vendas** (filtros + edge function + cards/charts com Recharts).

### 1. Navegação
- `src/components/CentralSidebar.tsx`: adicionar item **"Visão Geral de Agendamentos"** em **Relatórios**, rota `/central/relatorios/visao-geral-agendamentos`.
- `src/App.tsx`: registrar a rota apontando para a nova página.

### 2. Backend — `supabase/functions/central-operacional/index.ts`
Adicionar action `relatorioVisaoGeralAgendamentos`.

**Input:** `provedorIds[]`, `dataInicio`, `dataFim`, e filtros opcionais `status[]`, `confirmacao[]`, `tecnicoIds[]`, `tipos[]`, `origens[]`, `redes[]`, `representantes[]`.

**Query base:** `agendamentos` filtrado por `provedor_id IN (...)` e `data_agendamento BETWEEN ini AND fim`, mais filtros opcionais. Para "Reprogramados" e "Tempo até a data agendada" também consultar `historico_reagendamentos` e `agendamentos.created_at`.

**Resposta:**
```ts
{
  kpis: {
    hoje, proximos7Dias, pendentes, confirmados, concluidos,
    cancelados, reprogramados, semTecnico
  },
  serieTemporal: [{ data, total, pendentes, confirmados, concluidos, cancelados }],
  ocupacaoPorSlot: [{ slot: 1..N, total }],
  porTecnico: [{ tecnico, total, pendentes, concluidos }], // "Sem técnico" como bucket
  distribuicaoStatus: [{ status, total }],
  distribuicaoConfirmacao: [{ confirmacao, total }],
  cancelReprogTempo: [{ data, cancelados, reprogramados }],
  porOrigem: [{ chave, total }],
  porRepresentante: [{ chave, total }],
  porRede: [{ chave, total }],
  agingPendencias: [{ faixa: '0-1d'|'2-3d'|'4-7d'|'8-14d'|'15+d', total }],
  leadTime: [{ faixa: 'mesmo dia'|'1-3d'|'4-7d'|'8-14d'|'15+d', total }],
  pendentesPorTecnico: [{ tecnico, total }] // inclui "Sem técnico"
}
```
Nomes de técnicos virão de `profiles` (lookup por `tecnico_responsavel_id`).

### 3. Frontend — `src/pages/central/RelatorioVisaoGeralAgendamentos.tsx`
Estrutura de filtros (header sticky no mesmo padrão, com botão "Aplicar Filtros"):
- Provedor (multiselect — herdado do padrão)
- Período (presets: hoje, 7d, mês atual, mês anterior, ano, custom)
- Status, Confirmação, Tipo, Origem, Rede, Representante (multiselects populados a partir de catálogos / valores distintos)
- Técnico (multiselect a partir de `profiles` com role `tecnico` do provedor)

**Layout:**

```text
Linha 1 — Visão geral (8 cards KPI)
[Hoje] [Próx. 7d] [Pendentes] [Confirmados] [Concluídos] [Cancelados] [Reprogramados] [Sem técnico]

Linha 2 — Carga operacional
[Volume por dia (BarChart)] [Ocupação por slot (BarChart)] [Por técnico (BarChart horizontal)]

Linha 3 — Saúde da agenda
[Status (Pie/Bar)] [Confirmação (Pie/Bar)] [Cancel. & reprog. ao longo do tempo (LineChart)]

Linha 4 — Origem e qualidade
[Origem (Bar)] [Representante (Bar)] [Rede (Bar)]

Linha 5 — Pendências
[Aging pendências (Bar)] [Lead time criação→agendamento (Bar)] [Pendentes por técnico (Bar, inclui Sem técnico)]
```

Reaproveitar utilitários (`fmtNum`, `getPresetRange`, `formatLocalDate`) e padrão de Popover de multiselect já usado em `RelatorioVisaoGeralVendas.tsx`.

### Observações técnicas
- Toda agregação no edge function (evita 1000-row limit e mantém lógica server-side).
- Buscar `profiles` (id→nome) uma vez para resolver técnicos.
- Tratar `null/empty` como "Não informado" nas dimensões origem/representante/rede.
- Filtros opcionais: quando array vazio, não aplicar restrição.
- Sem migração de banco.
