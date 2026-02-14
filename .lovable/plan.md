

## Atribuir role `super_admin` ao usuário joaoviana.silva@outlook.com

### O que sera feito
Inserir a role `super_admin` na tabela `user_roles` para o usuario Joao Viana (ID: `70bf42d5-f395-42b8-b300-f17805e3fd62`).

### Detalhes tecnicos
- Executar um `INSERT` na tabela `user_roles` com `role = 'super_admin'` para o `user_id` correspondente.
- A role `admin` existente sera mantida (as roles nao sao mutuamente exclusivas).
- Apos a alteracao, o usuario tera acesso ao menu "Super Admin" e a pagina "Gerenciar Provedores".

### SQL a ser executado
```text
INSERT INTO public.user_roles (user_id, role)
VALUES ('70bf42d5-f395-42b8-b300-f17805e3fd62', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

