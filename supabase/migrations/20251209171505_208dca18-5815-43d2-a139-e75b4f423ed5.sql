-- 1. Adicionar coluna taxa_instalacao na tabela contratos
ALTER TABLE public.contratos 
ADD COLUMN IF NOT EXISTS taxa_instalacao numeric DEFAULT 0;

COMMENT ON COLUMN public.contratos.taxa_instalacao 
IS 'Valor da taxa de instalação cobrada no contrato (0 = grátis)';

-- 2. Tornar telefone opcional (permitir NULL)
ALTER TABLE public.contratos 
ALTER COLUMN telefone DROP NOT NULL;