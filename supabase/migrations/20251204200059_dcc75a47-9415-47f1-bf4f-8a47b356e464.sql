-- Adicionar coluna rede na tabela agendamentos (nullable)
ALTER TABLE public.agendamentos 
ADD COLUMN rede text;

-- Constraint para validar valores permitidos
ALTER TABLE public.agendamentos 
ADD CONSTRAINT agendamentos_rede_check 
CHECK (rede IS NULL OR rede IN ('lado_a', 'lado_b', 'lado_c'));