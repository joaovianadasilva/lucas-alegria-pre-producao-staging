

## Gerenciamento de status (ativo/inativo) nos catalogos

### Problema atual

Todas as 4 paginas de configuracao (Planos, Adicionais, Tipos de Agendamento, Representantes) usam o botao "remover" que faz soft-delete (seta `ativo = false`). Porem:
- Os itens inativos desaparecem da listagem (o backend filtra `ativo = true`)
- Nao ha como reativar um item depois de inativado
- O administrador nao tem visibilidade sobre quais itens estao ativos ou inativos

### Solucao

Adicionar um controle de toggle (Switch) em cada linha da tabela para ativar/inativar itens, e exibir todos os itens (ativos e inativos) nas paginas de configuracao.

### Alteracoes

**Edge function `supabase/functions/manage-catalog/index.ts`:**

1. Criar variantes "listAll" para cada entidade que retornam todos os registros (sem filtro `ativo = true`), para uso exclusivo nas paginas de admin:
   - `listAllPlanos` - retorna todos os planos incluindo inativos
   - `listAllAdicionais` - retorna todos os adicionais incluindo inativos
   - `listAllTiposAgendamento` - retorna todos os tipos incluindo inativos
   - `listAllRepresentantes` - retorna todos os representantes incluindo inativos

2. Criar action `toggleStatus` generica que recebe `tabela`, `itemId` e `ativo` (novo valor):
   - Atualiza o campo `ativo` do registro na tabela indicada
   - Valida que a tabela e uma das permitidas (whitelist)

**Paginas de configuracao (frontend):**

3. `src/pages/ConfigurarPlanos.tsx`:
   - Usar action `listAllPlanos` em vez de `listPlans`
   - Adicionar coluna com Switch para toggle ativo/inativo
   - Remover botao de delete (o delete agora e feito via toggle)

4. `src/pages/ConfigurarAdicionais.tsx`:
   - Usar action `listAllAdicionais` em vez de `listAddOns`
   - Adicionar Switch para toggle ativo/inativo
   - Remover botao de delete

5. `src/pages/ConfigurarTiposAgendamento.tsx`:
   - Usar action `listAllTiposAgendamento` em vez de `listTiposAgendamento`
   - Adicionar campo `ativo` na interface e coluna com Switch
   - Remover botao de delete

6. `src/pages/ConfigurarRepresentantes.tsx`:
   - Usar action `listAllRepresentantes` em vez de `listRepresentantes`
   - Adicionar campo `ativo` na interface e coluna com Switch
   - Remover botao de delete

**Importante:** As actions `list` originais (usadas nos formularios de agendamento, contratos etc.) continuam filtrando apenas ativos -- nenhuma alteracao nelas.

### Comportamento resultante

- Paginas de admin mostram todos os itens, com indicacao visual clara de ativo/inativo
- Administrador pode ativar ou inativar qualquer item com um clique no Switch
- Formularios de cadastro (agendamento, contrato) continuam exibindo apenas itens ativos
- Nao ha mais exclusao permanente via interface -- tudo e soft-delete controlado pelo toggle

