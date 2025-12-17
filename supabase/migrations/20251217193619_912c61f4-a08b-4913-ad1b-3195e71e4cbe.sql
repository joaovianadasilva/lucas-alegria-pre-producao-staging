-- Adicionar coluna entidade_nome em historico_contratos
ALTER TABLE historico_contratos 
ADD COLUMN entidade_nome text;

-- Adicionar coluna entidade_nome em historico_adicionais_contrato
ALTER TABLE historico_adicionais_contrato 
ADD COLUMN entidade_nome text;