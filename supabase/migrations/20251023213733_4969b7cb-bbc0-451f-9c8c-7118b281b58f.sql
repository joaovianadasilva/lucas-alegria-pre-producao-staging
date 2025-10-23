-- Adicionar coluna 'tipo' para categorizar o agendamento
ALTER TABLE agendamentos 
ADD COLUMN tipo TEXT NOT NULL DEFAULT 'instalacao';

-- Adicionar constraint para validar os tipos permitidos
ALTER TABLE agendamentos 
ADD CONSTRAINT check_tipo 
CHECK (tipo IN ('instalacao', 'manutencao', 'visita_tecnica', 'suporte'));

-- Adicionar coluna 'observacao' para notas opcionais
ALTER TABLE agendamentos 
ADD COLUMN observacao TEXT;

-- Adicionar comentários para documentação
COMMENT ON COLUMN agendamentos.tipo IS 'Tipo do agendamento: instalacao, manutencao, visita_tecnica, suporte';
COMMENT ON COLUMN agendamentos.observacao IS 'Observações e notas sobre o agendamento';