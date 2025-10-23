-- 1. Adicionar coluna codigo_cliente na tabela contratos
ALTER TABLE contratos ADD COLUMN codigo_cliente TEXT;

-- Atualizar registros existentes com valor padrão baseado no ID
UPDATE contratos SET codigo_cliente = 'CLI-' || substring(id::text, 1, 8) WHERE codigo_cliente IS NULL;

-- Tornar obrigatório após popular
ALTER TABLE contratos ALTER COLUMN codigo_cliente SET NOT NULL;

-- Criar índice para performance
CREATE INDEX idx_contratos_codigo_cliente ON contratos(codigo_cliente);

-- 2. Adicionar coluna confirmacao na tabela agendamentos
ALTER TABLE agendamentos ADD COLUMN confirmacao TEXT DEFAULT 'pre-agendado' NOT NULL;

-- Adicionar check constraint para validar valores
ALTER TABLE agendamentos ADD CONSTRAINT check_confirmacao 
  CHECK (confirmacao IN ('confirmado', 'pre-agendado', 'cancelado'));

-- Comentário para documentação
COMMENT ON COLUMN agendamentos.confirmacao IS 'Status de confirmação: confirmado, pre-agendado, cancelado';