-- Criar tabela de histórico de contratos
CREATE TABLE historico_contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  tipo_acao TEXT NOT NULL, -- 'criacao', 'edicao', 'cancelamento'
  campo_alterado TEXT, -- NULL para criação, nome do campo para edição
  valor_anterior TEXT, -- NULL para criação
  valor_novo TEXT, -- Dados do contrato para criação
  usuario_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_historico_contratos_contrato ON historico_contratos(contrato_id);
CREATE INDEX idx_historico_contratos_data ON historico_contratos(created_at);
CREATE INDEX idx_historico_contratos_usuario ON historico_contratos(usuario_id);

-- Criar tabela de histórico de adicionais de contratos
CREATE TABLE historico_adicionais_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  adicional_codigo TEXT NOT NULL,
  adicional_nome TEXT NOT NULL,
  adicional_valor NUMERIC NOT NULL,
  tipo_acao TEXT NOT NULL, -- 'adicao', 'remocao'
  usuario_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_historico_adicionais_contrato ON historico_adicionais_contrato(contrato_id);
CREATE INDEX idx_historico_adicionais_data ON historico_adicionais_contrato(created_at);
CREATE INDEX idx_historico_adicionais_usuario ON historico_adicionais_contrato(usuario_id);

-- RLS policies para histórico de contratos
ALTER TABLE historico_contratos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read contract history"
  ON historico_contratos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only functions can modify contract history"
  ON historico_contratos FOR ALL
  TO authenticated
  USING (false);

-- RLS policies para histórico de adicionais
ALTER TABLE historico_adicionais_contrato ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read add-ons history"
  ON historico_adicionais_contrato FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only functions can modify add-ons history"
  ON historico_adicionais_contrato FOR ALL
  TO authenticated
  USING (false);