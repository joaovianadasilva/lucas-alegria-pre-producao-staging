## Relatório: Visão Geral de Vendas

Nova página em `/central/relatorios/visao-geral-vendas`, acessível somente a `super_admin`, com filtros multi-provedor e período.

### Filtros (topo da página)
- **Provedores**: popover multi-select (padrão: todos ativos). Mesmo componente já usado em Recebimentos/Reembolsos.
- **Período**: presets `Hoje`, `7 dias`, `Mês atual` (padrão), `Mês anterior`, `Ano`, `Customizado` (date range).
- Botão **"Aplicar filtros"** explícito (padrão do projeto).

### Métricas (independentes pela data do evento)
- **Cadastrados**: `created_at` no período.
- **Instalados**: `data_ativacao` no período (não nulo).
- **Cancelados**: `data_cancelamento` no período (não nulo).
- Um contrato pode contar em mais de uma métrica se múltiplos eventos caírem no intervalo.

### Layout

**Linha 1 — KPIs (3 cards)**
- Card "Contratos Cadastrados": total + média/dia + média/semana no período.
- Card "Contratos Instalados": idem.
- Card "Contratos Cancelados": idem.
- Médias = total ÷ nº de dias (ou semanas) do período selecionado.

**Linha 2 — Gráfico temporal**
- Linha/Área dual (recharts): séries `Cadastrados` (created_at) e `Instalados` (data_ativacao) por dia.
- Se período > 90 dias, agrupa por semana automaticamente.

**Linha 3 — Receita por composição (2 cards lado a lado)**
- **Sem adicionais**: contratos instalados no período cuja `adicionais_contrato` está vazia. Mostra: nº cadastrados (do mesmo grupo, por created_at), nº instalados, **MRR** (Σ `plano_valor`).
- **Com adicionais**: contratos instalados no período com pelo menos uma linha em `adicionais_contrato`. Mostra: nº cadastrados, nº instalados, **MRR plano** (Σ `plano_valor`), **MRR adicionais** (Σ `adicional_valor`), **MRR total**.

**Linha 4 — Rankings (2 cards)**
- **Planos mais cadastrados / mais instalados**: tabela top 10 por `plano_codigo` + `plano_nome`, com colunas `Cadastrados` e `Instalados`.
- **Adicionais mais cadastrados**: top 10 por `adicional_codigo` + `adicional_nome`, contagem de ocorrências em `adicionais_contrato` cujo contrato foi cadastrado no período.

**Linha 5 — Cancelamentos por motivo**
- Gráfico de barras horizontais com `motivo_cancelamento` (agrupado, vazio = "Não informado") para contratos cancelados no período.

### Backend

Estender a edge function `central-operacional` com nova action `relatorioVisaoGeralVendas` (mantém o gating super_admin já existente). Params: `provedorIds[]`, `dataInicio`, `dataFim`.

Carrega 4 datasets em paralelo (filtrando por `provedor_id` se fornecido):
1. `contratos` com `created_at` no período → cadastrados, ranking de planos cadastrados.
2. `contratos` com `data_ativacao` no período → instalados, ranking instalados, separação com/sem adicionais, MRR.
3. `contratos` com `data_cancelamento` no período → cancelados, agregação por `motivo_cancelamento`.
4. `adicionais_contrato` JOIN `contratos` (via `contrato_id`) onde contrato cadastrado no período → ranking adicionais e flag "tem adicionais" para os instalados.

Retorna JSON pronto para a UI:
```ts
{
  kpis: { cadastrados, instalados, cancelados, mediaDia, mediaSemana, ... },
  serieTemporal: [{ data, cadastrados, instalados }],
  composicao: { semAdicionais: {...}, comAdicionais: {...} },
  rankings: { planosCadastrados: [...], planosInstalados: [...], adicionais: [...] },
  cancelamentosPorMotivo: [{ motivo, total }]
}
```

### Frontend
- Nova página `src/pages/central/RelatorioVisaoGeralVendas.tsx`.
- Reaproveita `MultiProvedorPicker` (extrair se ainda inline em Recebimentos/Reembolsos) e `DateRangePicker` (verificar se existe; senão criar simples com `Calendar` + dois popovers).
- Usa `recharts` (já no projeto via `chart.tsx`).
- Adiciona item no `CentralSidebar.tsx` na seção **Relatórios** (substituindo o "Em breve" placeholder): `Visão Geral de Vendas`.
- Rota em `src/App.tsx`.

### Notas
- Datas usam `formatLocalDate` (regra do projeto) para evitar UTC shift.
- Para períodos grandes a edge function pagina internamente (loop em `range()` de 1000 em 1000) para evitar o limite default do Supabase.
- Sem export CSV nesta primeira versão (pode ser adicionado depois se desejado).
