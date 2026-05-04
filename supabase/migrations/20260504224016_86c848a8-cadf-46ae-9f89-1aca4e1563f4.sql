CREATE TABLE public.regras_operacionais_provedor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provedor_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('recebimento','reembolso')),
  regra jsonb NOT NULL DEFAULT '{}'::jsonb,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_regras_op_provedor ON public.regras_operacionais_provedor(provedor_id, tipo) WHERE ativo;

ALTER TABLE public.regras_operacionais_provedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read regras of own provedor or super_admin"
ON public.regras_operacionais_provedor
FOR SELECT
TO authenticated
USING (
  provedor_id = ANY (public.get_user_provedor_ids(auth.uid()))
  OR public.has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Only functions can modify regras_operacionais_provedor"
ON public.regras_operacionais_provedor
FOR ALL
USING (false)
WITH CHECK (false);

CREATE TRIGGER trg_regras_op_updated_at
BEFORE UPDATE ON public.regras_operacionais_provedor
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();