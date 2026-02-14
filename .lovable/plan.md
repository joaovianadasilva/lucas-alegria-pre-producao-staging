

## Adicionar campo de URL da Logo no cadastro de provedores

### Alteracoes necessarias

**1. Formulario de criacao (`GerenciarProvedores.tsx`)**
- Adicionar `logoUrl` ao state `formData` (inicializado como string vazia)
- Adicionar campo `Input` com label "URL da Logo" e placeholder (ex: `https://exemplo.com/logo.png`) no dialog de criacao
- Passar `logoUrl` no body da chamada `createProvedor` para a edge function

**2. Nenhuma alteracao no backend**
- A edge function `manage-provedores` ja aceita o parametro `logoUrl` na action `createProvedor` e salva como `logo_url` na tabela. Nao precisa de nenhuma mudanca.

### Detalhes tecnicos

- O state `formData` passa de `{ nome: '', slug: '' }` para `{ nome: '', slug: '', logoUrl: '' }`
- O campo sera opcional (sem `required`), pois nem todo provedor tem logo
- O body da mutation incluira `logoUrl: formData.logoUrl || null`
- O reset do form apos sucesso limpara o campo tambem

