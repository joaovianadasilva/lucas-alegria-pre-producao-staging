-- Remove o trigger de auditoria automática (será feito pela edge function)
DROP TRIGGER IF EXISTS agendamentos_audit_trigger ON public.agendamentos;

-- Remove a função se não for usada em outro lugar
DROP FUNCTION IF EXISTS public.log_agendamento_changes();

-- Nota: O trigger update_agendamentos_updated_at permanece ativo para atualizar o campo updated_at