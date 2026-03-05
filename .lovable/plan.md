

## Corrigir constraints UNIQUE que impedem cadastro multi-provedor

### Causa raiz

As tabelas de catalogo possuem constraints UNIQUE apenas na coluna de identificacao (sem incluir `provedor_id`), o que impede que dois provedores diferentes cadastrem itens com o mesmo nome/codigo:

| Tabela | Constraint atual | Deveria ser |
|---|---|---|
| `catalogo_planos` | `UNIQUE(codigo)` | `UNIQUE(codigo, provedor_id)` |
| `catalogo_adicionais` | `UNIQUE(codigo)` | `UNIQUE(codigo, provedor_id)` |
| `catalogo_representantes` | `UNIQUE(nome)` | `UNIQUE(nome, provedor_id)` |
| `catalogo_origem_vendas` | `UNIQUE(nome)` | `UNIQUE(nome, provedor_id)` |
| `catalogo_tipos_agendamento` | `UNIQUE(codigo)` | `UNIQUE(codigo, provedor_id)` |
| `catalogo_cidades` | `UNIQUE(nome, uf)` | `UNIQUE(nome, uf, provedor_id)` |

### Solucao

Uma unica migration SQL que:

1. Remove as 6 constraints UNIQUE antigas
2. Recria cada uma incluindo `provedor_id` na composicao

```sql
-- catalogo_planos
ALTER TABLE catalogo_planos DROP CONSTRAINT catalogo_planos_codigo_key;
ALTER TABLE catalogo_planos ADD CONSTRAINT catalogo_planos_codigo_provedor_key UNIQUE (codigo, provedor_id);

-- catalogo_adicionais
ALTER TABLE catalogo_adicionais DROP CONSTRAINT catalogo_adicionais_codigo_key;
ALTER TABLE catalogo_adicionais ADD CONSTRAINT catalogo_adicionais_codigo_provedor_key UNIQUE (codigo, provedor_id);

-- catalogo_representantes
ALTER TABLE catalogo_representantes DROP CONSTRAINT catalogo_representantes_nome_key;
ALTER TABLE catalogo_representantes ADD CONSTRAINT catalogo_representantes_nome_provedor_key UNIQUE (nome, provedor_id);

-- catalogo_origem_vendas
ALTER TABLE catalogo_origem_vendas DROP CONSTRAINT catalogo_origem_vendas_nome_key;
ALTER TABLE catalogo_origem_vendas ADD CONSTRAINT catalogo_origem_vendas_nome_provedor_key UNIQUE (nome, provedor_id);

-- catalogo_tipos_agendamento
ALTER TABLE catalogo_tipos_agendamento DROP CONSTRAINT catalogo_tipos_agendamento_codigo_key;
ALTER TABLE catalogo_tipos_agendamento ADD CONSTRAINT catalogo_tipos_agendamento_codigo_provedor_key UNIQUE (codigo, provedor_id);

-- catalogo_cidades
ALTER TABLE catalogo_cidades DROP CONSTRAINT catalogo_cidades_nome_uf_key;
ALTER TABLE catalogo_cidades ADD CONSTRAINT catalogo_cidades_nome_uf_provedor_key UNIQUE (nome, uf, provedor_id);
```

### Resumo

- 1 migration com 12 statements (6 DROP + 6 ADD)
- Nenhuma alteracao em edge functions ou frontend (a logica de verificacao de duplicatas ja filtra por `provedor_id`)
- Corrige o erro para todas as tabelas de catalogo de uma vez

