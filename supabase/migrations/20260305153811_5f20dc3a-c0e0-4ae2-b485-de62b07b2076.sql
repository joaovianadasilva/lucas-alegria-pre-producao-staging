-- catalogo_planos
ALTER TABLE catalogo_planos DROP CONSTRAINT IF EXISTS catalogo_planos_codigo_key;
ALTER TABLE catalogo_planos ADD CONSTRAINT catalogo_planos_codigo_provedor_key UNIQUE (codigo, provedor_id);

-- catalogo_adicionais
ALTER TABLE catalogo_adicionais DROP CONSTRAINT IF EXISTS catalogo_adicionais_codigo_key;
ALTER TABLE catalogo_adicionais ADD CONSTRAINT catalogo_adicionais_codigo_provedor_key UNIQUE (codigo, provedor_id);

-- catalogo_representantes
ALTER TABLE catalogo_representantes DROP CONSTRAINT IF EXISTS catalogo_representantes_nome_key;
ALTER TABLE catalogo_representantes ADD CONSTRAINT catalogo_representantes_nome_provedor_key UNIQUE (nome, provedor_id);

-- catalogo_origem_vendas
ALTER TABLE catalogo_origem_vendas DROP CONSTRAINT IF EXISTS catalogo_origem_vendas_nome_key;
ALTER TABLE catalogo_origem_vendas ADD CONSTRAINT catalogo_origem_vendas_nome_provedor_key UNIQUE (nome, provedor_id);

-- catalogo_tipos_agendamento
ALTER TABLE catalogo_tipos_agendamento DROP CONSTRAINT IF EXISTS catalogo_tipos_agendamento_codigo_key;
ALTER TABLE catalogo_tipos_agendamento ADD CONSTRAINT catalogo_tipos_agendamento_codigo_provedor_key UNIQUE (codigo, provedor_id);

-- catalogo_cidades
ALTER TABLE catalogo_cidades DROP CONSTRAINT IF EXISTS catalogo_cidades_nome_uf_key;
ALTER TABLE catalogo_cidades ADD CONSTRAINT catalogo_cidades_nome_uf_provedor_key UNIQUE (nome, uf, provedor_id);