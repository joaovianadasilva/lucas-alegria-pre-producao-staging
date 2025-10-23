-- Tornar codigo_cliente nullable na tabela contratos (será preenchido manualmente)
ALTER TABLE contratos 
ALTER COLUMN codigo_cliente DROP NOT NULL;

-- Adicionar coluna 'origem' para rastrear origem do agendamento
ALTER TABLE agendamentos 
ADD COLUMN origem TEXT;

-- Adicionar coluna 'representante_vendas' para rastrear representante
ALTER TABLE agendamentos 
ADD COLUMN representante_vendas TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN contratos.codigo_cliente IS 'Código do cliente (preenchido manualmente via processo manual)';
COMMENT ON COLUMN agendamentos.origem IS 'Origem do agendamento/venda';
COMMENT ON COLUMN agendamentos.representante_vendas IS 'Nome do representante de vendas responsável';