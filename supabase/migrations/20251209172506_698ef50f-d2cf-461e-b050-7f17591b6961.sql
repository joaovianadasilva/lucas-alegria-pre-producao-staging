-- Remove the outdated slot_numero constraint that limits to 1-10
-- Slots now support variable numbers (currently up to 21)
ALTER TABLE public.agendamentos DROP CONSTRAINT agendamentos_slot_numero_check;