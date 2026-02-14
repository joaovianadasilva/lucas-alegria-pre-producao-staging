

## Alteracoes globais: Tipos de Agendamento, Representantes e Tecnicos

Tres problemas identificados e suas solucoes:

---

### 1. Menu de configuracao de Tipos de Agendamento

**Problema:** Nao existe pagina para gerenciar os tipos de agendamento (tabela `catalogo_tipos_agendamento`), apesar do backend (edge function) ja suportar CRUD completo (`listTiposAgendamento`, `addTipoAgendamento`, `updateTipoAgendamento`, `removeTipoAgendamento`).

**Solucao:**

- Criar pagina `src/pages/ConfigurarTiposAgendamento.tsx` seguindo o mesmo padrao de `ConfigurarAdicionais.tsx` (formulario de codigo/nome + tabela com editar/remover)
- Adicionar rota `/configuracoes/tipos-agendamento` dentro do bloco de rotas admin em `src/App.tsx`
- Adicionar item "Configurar Tipos de Agendamento" no menu de configuracoes em `src/components/AppSidebar.tsx`

---

### 2. Representantes exibindo dados de outro provedor + Menu de configuracao

**Problema:** Em `NovoAgendamento.tsx` e `GerenciarAgendamentos.tsx`, a query de representantes faz `.from('catalogo_representantes').eq('ativo', true)` **sem filtrar por `provedor_id`**, retornando representantes de todos os provedores. Alem disso, nao existe pagina de configuracao para representantes.

**Solucao - Filtro:**

- `src/pages/NovoAgendamento.tsx`: adicionar `.eq('provedor_id', provedorAtivo?.id)` na query de representantes
- `src/pages/GerenciarAgendamentos.tsx`: mesma correcao
- `src/components/ContractEditDialog.tsx`: mesma correcao

**Solucao - Menu de configuracao:**

- Criar pagina `src/pages/ConfigurarRepresentantes.tsx` seguindo o padrao existente (formulario de nome + tabela com editar/remover). Usara as actions ja existentes no edge function (`addRepresentante`, `removeRepresentante`)
- Adicionar rota `/configuracoes/representantes` no bloco admin em `src/App.tsx`
- Adicionar item no menu de configuracoes em `src/components/AppSidebar.tsx`

---

### 3. Tecnicos exibindo dados de outro provedor

**Problema:** O hook `useTecnicos.ts` busca todos os usuarios com role `tecnico` sem filtrar por provedor. Ele consulta `user_roles` + `profiles`, mas ignora a tabela `usuario_provedores` que vincula usuarios a provedores.

**Solucao:**

- Alterar `src/hooks/useTecnicos.ts` para receber `provedorId` como parametro
- Adicionar um join com `usuario_provedores` filtrando pelo `provedor_id` ativo, garantindo que so retorne tecnicos vinculados ao provedor atual
- Atualizar `src/components/TecnicoSelector.tsx` para passar o `provedorId` do contexto
- A logica sera: buscar em `usuario_provedores` os `user_id` do provedor ativo, cruzar com `user_roles` onde role = 'tecnico', e buscar os perfis correspondentes

---

### Detalhes tecnicos

**Arquivos novos:**
- `src/pages/ConfigurarTiposAgendamento.tsx`
- `src/pages/ConfigurarRepresentantes.tsx`

**Arquivos modificados:**
- `src/App.tsx` - 2 novas rotas admin
- `src/components/AppSidebar.tsx` - 2 novos itens no menu configuracoes
- `src/pages/NovoAgendamento.tsx` - filtro provedor_id nos representantes
- `src/pages/GerenciarAgendamentos.tsx` - filtro provedor_id nos representantes
- `src/components/ContractEditDialog.tsx` - filtro provedor_id nos representantes
- `src/hooks/useTecnicos.ts` - filtro por provedor via usuario_provedores
- `src/components/TecnicoSelector.tsx` - passar provedorId ao hook

**Edge function:** Nenhuma alteracao necessaria - todas as actions de CRUD ja existem no `manage-catalog`.
