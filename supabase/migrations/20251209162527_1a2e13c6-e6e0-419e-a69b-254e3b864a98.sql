-- Criar tabela de catálogo de tipos de agendamento
CREATE TABLE public.catalogo_tipos_agendamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.catalogo_tipos_agendamento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS (mesmo padrão dos outros catálogos)
CREATE POLICY "Anyone can read active types" 
  ON public.catalogo_tipos_agendamento 
  FOR SELECT 
  USING (ativo = true);

CREATE POLICY "Only functions can modify types" 
  ON public.catalogo_tipos_agendamento 
  FOR ALL 
  USING (false);

-- Inserir os tipos iniciais
INSERT INTO public.catalogo_tipos_agendamento (codigo, nome) VALUES
  ('instalacao', 'Instalação'),
  ('instalacao_roku', 'Instalação + Roku'),
  ('instalacao_rede_mesa', 'Instalação + Rede Mesa'),
  ('instalacao_telefone', 'Instalação + Telefone'),
  ('roku', 'Roku'),
  ('telefone', 'Telefone'),
  ('rede_mesh', 'Rede Mesh');