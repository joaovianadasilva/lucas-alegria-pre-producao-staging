-- Adicionar 'supervisor' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';

-- Comentário: O supervisor terá acesso às configurações de vagas
-- As permissões serão controladas via código no frontend usando has_role()