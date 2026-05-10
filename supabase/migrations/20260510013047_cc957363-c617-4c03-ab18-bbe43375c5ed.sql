
ALTER TABLE public.regras_operacionais_provedor
  ALTER COLUMN provedor_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS nome text NOT NULL DEFAULT 'Regra sem nome',
  ADD COLUMN IF NOT EXISTS provedor_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS aplica_todos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prioridade integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_regras_op_tipo_ativo
  ON public.regras_operacionais_provedor (tipo, ativo);

CREATE INDEX IF NOT EXISTS idx_regras_op_provedor_ids
  ON public.regras_operacionais_provedor USING GIN (provedor_ids);
