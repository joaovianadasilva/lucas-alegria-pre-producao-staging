-- Adicionar coluna requer_agendamento na tabela catalogo_adicionais
ALTER TABLE public.catalogo_adicionais 
ADD COLUMN requer_agendamento boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.catalogo_adicionais.requer_agendamento 
IS 'Indica se o adicional requer agendamento quando vendido de forma avulsa';