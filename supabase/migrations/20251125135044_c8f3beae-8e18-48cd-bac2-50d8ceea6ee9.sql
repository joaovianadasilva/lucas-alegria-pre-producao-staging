-- Criar nova tabela slots com estrutura flexível
CREATE TABLE IF NOT EXISTS public.slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_disponivel DATE NOT NULL,
  slot_numero INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'bloqueado', 'ocupado')),
  agendamento_id UUID REFERENCES public.agendamentos(id) ON DELETE SET NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Índice único: não pode ter dois slots com mesmo número na mesma data
  CONSTRAINT unique_slot_per_date UNIQUE (data_disponivel, slot_numero)
);

-- Comentários para documentação
COMMENT ON TABLE public.slots IS 'Nova tabela de slots com estrutura flexível - substitui slots_disponiveis';
COMMENT ON COLUMN public.slots.status IS 'Status do slot: disponivel, bloqueado ou ocupado';
COMMENT ON COLUMN public.slots.slot_numero IS 'Número sequencial do slot no dia (1, 2, 3, etc)';

-- Índices para performance
CREATE INDEX idx_slots_data ON public.slots(data_disponivel);
CREATE INDEX idx_slots_status ON public.slots(status);
CREATE INDEX idx_slots_agendamento ON public.slots(agendamento_id);
CREATE INDEX idx_slots_data_status ON public.slots(data_disponivel, status);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_slots_updated_at
  BEFORE UPDATE ON public.slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;

-- Qualquer um autenticado pode ler slots
CREATE POLICY "Anyone can read slots"
  ON public.slots FOR SELECT
  TO authenticated
  USING (true);

-- Apenas edge functions podem modificar
CREATE POLICY "Only functions can modify slots"
  ON public.slots FOR ALL
  TO authenticated
  USING (false);

-- Script de migração de dados da tabela antiga para a nova
-- Verificar se UUID existe na tabela de agendamentos antes de referenciar
INSERT INTO public.slots (data_disponivel, slot_numero, status, agendamento_id, created_at, updated_at)
SELECT 
  sd.data_disponivel,
  slot_num,
  CASE 
    WHEN slot_value IS NULL THEN 'disponivel'
    WHEN slot_value = '-' THEN 'bloqueado'
    ELSE 'ocupado'
  END as status,
  CASE 
    -- Verificar se é UUID válido E se existe na tabela de agendamentos
    WHEN slot_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
         AND EXISTS (SELECT 1 FROM public.agendamentos WHERE id = slot_value::UUID)
    THEN slot_value::UUID 
    ELSE NULL 
  END as agendamento_id,
  sd.created_at,
  sd.updated_at
FROM public.slots_disponiveis sd
CROSS JOIN LATERAL (
  VALUES 
    (1, sd.slot_1), (2, sd.slot_2), (3, sd.slot_3), (4, sd.slot_4), (5, sd.slot_5),
    (6, sd.slot_6), (7, sd.slot_7), (8, sd.slot_8), (9, sd.slot_9), (10, sd.slot_10)
) AS slots(slot_num, slot_value)
ON CONFLICT (data_disponivel, slot_numero) DO NOTHING;

-- Função para validar limite de 30 dias (apenas para novos inserts)
CREATE OR REPLACE FUNCTION public.validate_slot_date_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Apenas validar datas futuras para novos inserts
  IF TG_OP = 'INSERT' THEN
    IF NEW.data_disponivel > CURRENT_DATE + INTERVAL '30 days' THEN
      RAISE EXCEPTION 'Não é possível criar slots para mais de 30 dias no futuro';
    END IF;
    IF NEW.data_disponivel < CURRENT_DATE THEN
      RAISE EXCEPTION 'Não é possível criar slots para datas passadas';
    END IF;
  END IF;
  
  -- Para UPDATE, apenas validar se a data foi alterada
  IF TG_OP = 'UPDATE' AND NEW.data_disponivel != OLD.data_disponivel THEN
    IF NEW.data_disponivel > CURRENT_DATE + INTERVAL '30 days' THEN
      RAISE EXCEPTION 'Não é possível mover slots para mais de 30 dias no futuro';
    END IF;
    IF NEW.data_disponivel < CURRENT_DATE THEN
      RAISE EXCEPTION 'Não é possível mover slots para datas passadas';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_slot_date_limit
  BEFORE INSERT OR UPDATE ON public.slots
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_slot_date_limit();

-- Função para obter estatísticas de slots
CREATE OR REPLACE FUNCTION public.get_slots_statistics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'proxima_vaga', (
      SELECT json_build_object(
        'data', data_disponivel,
        'quantidade', COUNT(*)
      )
      FROM public.slots
      WHERE status = 'disponivel' 
        AND data_disponivel >= CURRENT_DATE
      GROUP BY data_disponivel
      ORDER BY data_disponivel
      LIMIT 1
    ),
    'total_disponiveis', (
      SELECT COUNT(*) 
      FROM public.slots 
      WHERE status = 'disponivel' 
        AND data_disponivel >= CURRENT_DATE
        AND data_disponivel <= CURRENT_DATE + INTERVAL '30 days'
    ),
    'total_ocupados', (
      SELECT COUNT(*) 
      FROM public.slots 
      WHERE status = 'ocupado' 
        AND data_disponivel >= CURRENT_DATE
        AND data_disponivel <= CURRENT_DATE + INTERVAL '30 days'
    ),
    'total_bloqueados', (
      SELECT COUNT(*) 
      FROM public.slots 
      WHERE status = 'bloqueado' 
        AND data_disponivel >= CURRENT_DATE
        AND data_disponivel <= CURRENT_DATE + INTERVAL '30 days'
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Renomear tabela antiga (mantém como backup)
ALTER TABLE IF EXISTS public.slots_disponiveis RENAME TO slots_disponiveis_backup;