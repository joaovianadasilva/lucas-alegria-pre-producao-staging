-- Criar tabela historico_edicoes_agendamentos
CREATE TABLE historico_edicoes_agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agendamento_id UUID NOT NULL REFERENCES agendamentos(id) ON DELETE CASCADE,
  campo_alterado TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  usuario_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para melhorar performance das consultas
CREATE INDEX idx_historico_edicoes_agendamento_id 
ON historico_edicoes_agendamentos(agendamento_id, created_at DESC);

-- RLS Policies
ALTER TABLE historico_edicoes_agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read edit history"
ON historico_edicoes_agendamentos FOR SELECT
USING (true);

CREATE POLICY "Only functions can modify edit history"
ON historico_edicoes_agendamentos FOR ALL
USING (false);

-- Criar função que registra mudanças
CREATE OR REPLACE FUNCTION log_agendamento_changes()
RETURNS TRIGGER AS $$
DECLARE
  campo TEXT;
  valor_antigo TEXT;
  valor_novo TEXT;
BEGIN
  -- Tipo
  IF OLD.tipo IS DISTINCT FROM NEW.tipo THEN
    INSERT INTO historico_edicoes_agendamentos 
    (agendamento_id, campo_alterado, valor_anterior, valor_novo, usuario_id)
    VALUES (NEW.id, 'tipo', OLD.tipo, NEW.tipo, auth.uid());
  END IF;
  
  -- Status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO historico_edicoes_agendamentos 
    (agendamento_id, campo_alterado, valor_anterior, valor_novo, usuario_id)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, auth.uid());
  END IF;
  
  -- Confirmação
  IF OLD.confirmacao IS DISTINCT FROM NEW.confirmacao THEN
    INSERT INTO historico_edicoes_agendamentos 
    (agendamento_id, campo_alterado, valor_anterior, valor_novo, usuario_id)
    VALUES (NEW.id, 'confirmacao', OLD.confirmacao, NEW.confirmacao, auth.uid());
  END IF;
  
  -- Técnico Responsável
  IF OLD.tecnico_responsavel_id IS DISTINCT FROM NEW.tecnico_responsavel_id THEN
    INSERT INTO historico_edicoes_agendamentos 
    (agendamento_id, campo_alterado, valor_anterior, valor_novo, usuario_id)
    VALUES (NEW.id, 'tecnico_responsavel_id', 
            COALESCE(OLD.tecnico_responsavel_id::TEXT, 'null'), 
            COALESCE(NEW.tecnico_responsavel_id::TEXT, 'null'), 
            auth.uid());
  END IF;
  
  -- Origem
  IF OLD.origem IS DISTINCT FROM NEW.origem THEN
    INSERT INTO historico_edicoes_agendamentos 
    (agendamento_id, campo_alterado, valor_anterior, valor_novo, usuario_id)
    VALUES (NEW.id, 'origem', OLD.origem, NEW.origem, auth.uid());
  END IF;
  
  -- Representante de Vendas
  IF OLD.representante_vendas IS DISTINCT FROM NEW.representante_vendas THEN
    INSERT INTO historico_edicoes_agendamentos 
    (agendamento_id, campo_alterado, valor_anterior, valor_novo, usuario_id)
    VALUES (NEW.id, 'representante_vendas', 
            COALESCE(OLD.representante_vendas, 'null'), 
            COALESCE(NEW.representante_vendas, 'null'), 
            auth.uid());
  END IF;
  
  -- Data e Slot (reagendamento via UPDATE direto)
  IF OLD.data_agendamento IS DISTINCT FROM NEW.data_agendamento 
     OR OLD.slot_numero IS DISTINCT FROM NEW.slot_numero THEN
    INSERT INTO historico_edicoes_agendamentos 
    (agendamento_id, campo_alterado, valor_anterior, valor_novo, usuario_id)
    VALUES (NEW.id, 'reagendamento', 
            OLD.data_agendamento::TEXT || ' - Slot ' || OLD.slot_numero::TEXT,
            NEW.data_agendamento::TEXT || ' - Slot ' || NEW.slot_numero::TEXT,
            auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger
CREATE TRIGGER agendamentos_audit_trigger
AFTER UPDATE ON agendamentos
FOR EACH ROW
EXECUTE FUNCTION log_agendamento_changes();