-- Adicionar novas roles ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor_clique';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor_provedor';