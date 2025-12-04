-- Make email_cliente optional in agendamentos table
ALTER TABLE public.agendamentos 
ALTER COLUMN email_cliente DROP NOT NULL;