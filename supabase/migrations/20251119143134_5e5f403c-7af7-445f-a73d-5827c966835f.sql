-- Remover a constraint antiga de status
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_status_check;

-- Adicionar nova constraint incluindo 'reprogramado'
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_status_check 
CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'concluido', 'reprogramado'));