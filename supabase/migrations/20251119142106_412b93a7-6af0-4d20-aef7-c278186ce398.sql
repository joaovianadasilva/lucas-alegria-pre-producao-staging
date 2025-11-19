-- Criar tabela de histórico de reagendamentos
CREATE TABLE historico_reagendamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id uuid NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  data_anterior date NOT NULL,
  slot_anterior integer NOT NULL,
  data_nova date NOT NULL,
  slot_novo integer NOT NULL,
  motivo text,
  usuario_id uuid REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Índice para busca rápida por agendamento
CREATE INDEX idx_historico_agendamento ON historico_reagendamentos(agendamento_id);

-- Trigger para updated_at (mesmo que outros já tenham)
CREATE TRIGGER update_historico_reagendamentos_updated_at
  BEFORE UPDATE ON historico_reagendamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE historico_reagendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reschedule history"
  ON historico_reagendamentos FOR SELECT
  USING (true);

CREATE POLICY "Only functions can modify reschedule history"
  ON historico_reagendamentos FOR ALL
  USING (false);