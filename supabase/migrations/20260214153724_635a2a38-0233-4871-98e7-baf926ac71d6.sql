
-- =============================================
-- FASE 2.1: REESCREVER RLS POLICIES
-- =============================================

-- === CONTRATOS ===
DROP POLICY IF EXISTS "Only functions can access contracts" ON public.contratos;
CREATE POLICY "Authenticated users access contracts of their provedor"
  ON public.contratos FOR SELECT TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify contracts"
  ON public.contratos FOR INSERT WITH CHECK (false);
CREATE POLICY "Only functions can update contracts"
  ON public.contratos FOR UPDATE USING (false);
CREATE POLICY "Only functions can delete contracts"
  ON public.contratos FOR DELETE USING (false);

-- === AGENDAMENTOS ===
DROP POLICY IF EXISTS "Agendamentos são visíveis para todos" ON public.agendamentos;
DROP POLICY IF EXISTS "Qualquer um pode atualizar agendamentos" ON public.agendamentos;
DROP POLICY IF EXISTS "Qualquer um pode criar agendamentos" ON public.agendamentos;
CREATE POLICY "Authenticated users access agendamentos of their provedor"
  ON public.agendamentos FOR SELECT TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify agendamentos"
  ON public.agendamentos FOR INSERT WITH CHECK (false);
CREATE POLICY "Only functions can update agendamentos"
  ON public.agendamentos FOR UPDATE USING (false);

-- === ADICIONAIS_CONTRATO ===
DROP POLICY IF EXISTS "Only functions can access contract add-ons" ON public.adicionais_contrato;
CREATE POLICY "Authenticated users access adicionais of their provedor"
  ON public.adicionais_contrato FOR SELECT TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify adicionais_contrato"
  ON public.adicionais_contrato FOR ALL USING (false);

-- === SLOTS ===
DROP POLICY IF EXISTS "Anyone can read slots" ON public.slots;
DROP POLICY IF EXISTS "Only functions can modify slots" ON public.slots;
CREATE POLICY "Authenticated users access slots of their provedor"
  ON public.slots FOR SELECT TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify slots"
  ON public.slots FOR INSERT WITH CHECK (false);
CREATE POLICY "Only functions can update slots"
  ON public.slots FOR UPDATE USING (false);
CREATE POLICY "Only functions can delete slots"
  ON public.slots FOR DELETE USING (false);

-- === CATALOGO_PLANOS ===
DROP POLICY IF EXISTS "Anyone can read active plans" ON public.catalogo_planos;
DROP POLICY IF EXISTS "Only functions can modify plans" ON public.catalogo_planos;
CREATE POLICY "Authenticated users read active plans of their provedor"
  ON public.catalogo_planos FOR SELECT TO authenticated
  USING (ativo = true AND provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify catalogo_planos"
  ON public.catalogo_planos FOR ALL USING (false);

-- === CATALOGO_ADICIONAIS ===
DROP POLICY IF EXISTS "Anyone can read active add-ons" ON public.catalogo_adicionais;
DROP POLICY IF EXISTS "Only functions can modify add-ons" ON public.catalogo_adicionais;
CREATE POLICY "Authenticated users read active add-ons of their provedor"
  ON public.catalogo_adicionais FOR SELECT TO authenticated
  USING (ativo = true AND provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify catalogo_adicionais"
  ON public.catalogo_adicionais FOR ALL USING (false);

-- === CATALOGO_CIDADES ===
DROP POLICY IF EXISTS "Anyone can read active cities" ON public.catalogo_cidades;
DROP POLICY IF EXISTS "Only functions can modify cities" ON public.catalogo_cidades;
CREATE POLICY "Authenticated users read active cities of their provedor"
  ON public.catalogo_cidades FOR SELECT TO authenticated
  USING (ativo = true AND provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify catalogo_cidades"
  ON public.catalogo_cidades FOR ALL USING (false);

-- === CATALOGO_ORIGEM_VENDAS ===
DROP POLICY IF EXISTS "Anyone can read active origins" ON public.catalogo_origem_vendas;
DROP POLICY IF EXISTS "Only functions can modify origins" ON public.catalogo_origem_vendas;
CREATE POLICY "Authenticated users read active origins of their provedor"
  ON public.catalogo_origem_vendas FOR SELECT TO authenticated
  USING (ativo = true AND provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify catalogo_origem_vendas"
  ON public.catalogo_origem_vendas FOR ALL USING (false);

-- === CATALOGO_REPRESENTANTES ===
DROP POLICY IF EXISTS "Anyone can read active representatives" ON public.catalogo_representantes;
DROP POLICY IF EXISTS "Only functions can modify representatives" ON public.catalogo_representantes;
CREATE POLICY "Authenticated users read active reps of their provedor"
  ON public.catalogo_representantes FOR SELECT TO authenticated
  USING (ativo = true AND provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify catalogo_representantes"
  ON public.catalogo_representantes FOR ALL USING (false);

-- === CATALOGO_TIPOS_AGENDAMENTO ===
DROP POLICY IF EXISTS "Anyone can read active types" ON public.catalogo_tipos_agendamento;
DROP POLICY IF EXISTS "Only functions can modify types" ON public.catalogo_tipos_agendamento;
CREATE POLICY "Authenticated users read active tipos of their provedor"
  ON public.catalogo_tipos_agendamento FOR SELECT TO authenticated
  USING (ativo = true AND provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify catalogo_tipos_agendamento"
  ON public.catalogo_tipos_agendamento FOR ALL USING (false);

-- === CATALOGO_GRUPOS_MENSAGEM ===
CREATE POLICY "Authenticated users read grupos_mensagem of their provedor"
  ON public.catalogo_grupos_mensagem FOR SELECT TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
ALTER TABLE public.catalogo_grupos_mensagem ENABLE ROW LEVEL SECURITY;

-- === HISTORICO_CONTRATOS ===
DROP POLICY IF EXISTS "Anyone can read contract history" ON public.historico_contratos;
DROP POLICY IF EXISTS "Only functions can modify contract history" ON public.historico_contratos;
CREATE POLICY "Authenticated users read historico_contratos of their provedor"
  ON public.historico_contratos FOR SELECT TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify historico_contratos"
  ON public.historico_contratos FOR ALL USING (false);

-- === HISTORICO_ADICIONAIS_CONTRATO ===
DROP POLICY IF EXISTS "Anyone can read add-ons history" ON public.historico_adicionais_contrato;
DROP POLICY IF EXISTS "Only functions can modify add-ons history" ON public.historico_adicionais_contrato;
CREATE POLICY "Authenticated users read historico_adicionais of their provedor"
  ON public.historico_adicionais_contrato FOR SELECT TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify historico_adicionais_contrato"
  ON public.historico_adicionais_contrato FOR ALL USING (false);

-- === HISTORICO_EDICOES_AGENDAMENTOS ===
DROP POLICY IF EXISTS "Anyone can read edit history" ON public.historico_edicoes_agendamentos;
DROP POLICY IF EXISTS "Only functions can modify edit history" ON public.historico_edicoes_agendamentos;
CREATE POLICY "Authenticated users read historico_edicoes of their provedor"
  ON public.historico_edicoes_agendamentos FOR SELECT TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify historico_edicoes_agendamentos"
  ON public.historico_edicoes_agendamentos FOR ALL USING (false);

-- === HISTORICO_REAGENDAMENTOS ===
DROP POLICY IF EXISTS "Anyone can read reschedule history" ON public.historico_reagendamentos;
DROP POLICY IF EXISTS "Only functions can modify reschedule history" ON public.historico_reagendamentos;
CREATE POLICY "Authenticated users read historico_reagendamentos of their provedor"
  ON public.historico_reagendamentos FOR SELECT TO authenticated
  USING (provedor_id = ANY(public.get_user_provedor_ids(auth.uid())));
CREATE POLICY "Only functions can modify historico_reagendamentos"
  ON public.historico_reagendamentos FOR ALL USING (false);

-- === PROFILES - Restringir para apenas autenticados ===
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
