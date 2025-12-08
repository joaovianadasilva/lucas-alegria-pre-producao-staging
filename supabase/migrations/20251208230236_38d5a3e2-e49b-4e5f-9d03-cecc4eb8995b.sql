-- Adicionar coluna valor_total à tabela contratos
ALTER TABLE public.contratos 
ADD COLUMN valor_total numeric NOT NULL DEFAULT 0;