
-- 1.1 Adicionar super_admin ao enum app_role (deve ser em transação separada)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
