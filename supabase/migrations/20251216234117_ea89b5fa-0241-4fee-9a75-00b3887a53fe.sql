-- Remove a constraint única atual que impede reutilização de vagas canceladas
ALTER TABLE agendamentos 
DROP CONSTRAINT IF EXISTS agendamentos_data_agendamento_slot_numero_key;

-- Cria partial unique index que só se aplica a agendamentos NÃO cancelados
-- Isso permite múltiplos agendamentos cancelados para mesma data/vaga
-- mas garante apenas UM agendamento ativo por data/vaga
CREATE UNIQUE INDEX agendamentos_data_slot_unique_active 
ON agendamentos (data_agendamento, slot_numero) 
WHERE status != 'cancelado';