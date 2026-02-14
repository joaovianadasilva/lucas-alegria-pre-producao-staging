
-- =============================================
-- FASE 1: FUNDAÇÃO MULTI-PROVEDOR (parte 2)
-- =============================================

-- 1.2 Criar tabela provedores
CREATE TABLE public.provedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.provedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active provedores"
  ON public.provedores FOR SELECT TO authenticated
  USING (ativo = true OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Only super_admin can manage provedores"
  ON public.provedores FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 1.3 Criar tabela usuario_provedores
CREATE TABLE public.usuario_provedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provedor_id uuid REFERENCES public.provedores(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, provedor_id)
);

CREATE INDEX idx_usuario_provedores_user ON public.usuario_provedores(user_id);
CREATE INDEX idx_usuario_provedores_provedor ON public.usuario_provedores(provedor_id);

ALTER TABLE public.usuario_provedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own provedor links"
  ON public.usuario_provedores FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only functions can manage provedor links"
  ON public.usuario_provedores FOR ALL
  USING (false);

-- 1.4 Criar função auxiliar get_user_provedor_ids
CREATE OR REPLACE FUNCTION public.get_user_provedor_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'super_admin'
    )
    THEN (SELECT COALESCE(array_agg(id), '{}') FROM provedores WHERE ativo = true)
    ELSE (SELECT COALESCE(array_agg(provedor_id), '{}') FROM usuario_provedores WHERE user_id = _user_id)
  END
$$;

-- 1.5 Adicionar provedor_id em 15 tabelas
ALTER TABLE public.contratos ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.agendamentos ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.adicionais_contrato ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.slots ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.catalogo_planos ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.catalogo_adicionais ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.catalogo_cidades ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.catalogo_origem_vendas ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.catalogo_representantes ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.catalogo_tipos_agendamento ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.catalogo_grupos_mensagem ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.historico_contratos ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.historico_adicionais_contrato ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.historico_edicoes_agendamentos ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);
ALTER TABLE public.historico_reagendamentos ADD COLUMN provedor_id uuid REFERENCES public.provedores(id);

-- Índices
CREATE INDEX idx_contratos_provedor ON public.contratos(provedor_id);
CREATE INDEX idx_agendamentos_provedor ON public.agendamentos(provedor_id);
CREATE INDEX idx_adicionais_contrato_provedor ON public.adicionais_contrato(provedor_id);
CREATE INDEX idx_slots_provedor ON public.slots(provedor_id);
CREATE INDEX idx_catalogo_planos_provedor ON public.catalogo_planos(provedor_id);
CREATE INDEX idx_catalogo_adicionais_provedor ON public.catalogo_adicionais(provedor_id);
CREATE INDEX idx_catalogo_cidades_provedor ON public.catalogo_cidades(provedor_id);
CREATE INDEX idx_catalogo_origem_vendas_provedor ON public.catalogo_origem_vendas(provedor_id);
CREATE INDEX idx_catalogo_representantes_provedor ON public.catalogo_representantes(provedor_id);
CREATE INDEX idx_catalogo_tipos_agendamento_provedor ON public.catalogo_tipos_agendamento(provedor_id);
CREATE INDEX idx_catalogo_grupos_mensagem_provedor ON public.catalogo_grupos_mensagem(provedor_id);
CREATE INDEX idx_historico_contratos_provedor ON public.historico_contratos(provedor_id);
CREATE INDEX idx_historico_adicionais_contrato_provedor ON public.historico_adicionais_contrato(provedor_id);
CREATE INDEX idx_historico_edicoes_agendamentos_provedor ON public.historico_edicoes_agendamentos(provedor_id);
CREATE INDEX idx_historico_reagendamentos_provedor ON public.historico_reagendamentos(provedor_id);

-- 1.6 Inserir provedor W2A
INSERT INTO public.provedores (nome, slug) VALUES ('W2A Telecomunicações', 'w2a');

-- Vincular todos os usuários existentes ao W2A
INSERT INTO public.usuario_provedores (user_id, provedor_id)
SELECT p.id, (SELECT id FROM public.provedores WHERE slug = 'w2a')
FROM public.profiles p;

-- Desabilitar triggers para evitar erro com update_updated_at_column em tabelas sem updated_at
SET session_replication_role = 'replica';

-- Popular provedor_id em todas as 15 tabelas
UPDATE public.contratos SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.agendamentos SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.adicionais_contrato SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.slots SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.catalogo_planos SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.catalogo_adicionais SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.catalogo_cidades SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.catalogo_origem_vendas SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.catalogo_representantes SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.catalogo_tipos_agendamento SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.catalogo_grupos_mensagem SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.historico_contratos SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.historico_adicionais_contrato SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.historico_edicoes_agendamentos SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;
UPDATE public.historico_reagendamentos SET provedor_id = (SELECT id FROM public.provedores WHERE slug = 'w2a') WHERE provedor_id IS NULL;

-- Reabilitar triggers
SET session_replication_role = 'origin';

-- Tornar NOT NULL
ALTER TABLE public.contratos ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.agendamentos ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.adicionais_contrato ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.slots ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.catalogo_planos ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.catalogo_adicionais ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.catalogo_cidades ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.catalogo_origem_vendas ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.catalogo_representantes ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.catalogo_tipos_agendamento ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.catalogo_grupos_mensagem ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.historico_contratos ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.historico_adicionais_contrato ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.historico_edicoes_agendamentos ALTER COLUMN provedor_id SET NOT NULL;
ALTER TABLE public.historico_reagendamentos ALTER COLUMN provedor_id SET NOT NULL;

-- 1.7 Storage bucket para logos
INSERT INTO storage.buckets (id, name, public) VALUES ('provedor-logos', 'provedor-logos', true);

CREATE POLICY "Public can view provedor logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'provedor-logos');

CREATE POLICY "Super admins can upload provedor logos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'provedor-logos' AND public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update provedor logos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'provedor-logos' AND public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete provedor logos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'provedor-logos' AND public.has_role(auth.uid(), 'super_admin'::app_role));
