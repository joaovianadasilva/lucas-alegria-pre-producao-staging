-- Criar tabela catalogo_cidades
CREATE TABLE public.catalogo_cidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  uf text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(nome, uf)
);

-- Índice para busca rápida por UF
CREATE INDEX idx_catalogo_cidades_uf ON public.catalogo_cidades(uf);

-- RLS Policies para catalogo_cidades
ALTER TABLE public.catalogo_cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active cities"
  ON public.catalogo_cidades
  FOR SELECT
  USING (ativo = true);

CREATE POLICY "Only functions can modify cities"
  ON public.catalogo_cidades
  FOR ALL
  USING (false);

-- Inserir cidades iniciais do Ceará
INSERT INTO public.catalogo_cidades (nome, uf) VALUES
  ('Fortaleza', 'CE'),
  ('Caucaia', 'CE'),
  ('Maracanaú', 'CE'),
  ('Eusébio', 'CE'),
  ('Aquiraz', 'CE'),
  ('Maranguape', 'CE'),
  ('Pacatuba', 'CE'),
  ('Horizonte', 'CE'),
  ('São Gonçalo do Amarante', 'CE'),
  ('Itaitinga', 'CE');

-- Criar tabela catalogo_representantes
CREATE TABLE public.catalogo_representantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS Policies para catalogo_representantes
ALTER TABLE public.catalogo_representantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active representatives"
  ON public.catalogo_representantes
  FOR SELECT
  USING (ativo = true);

CREATE POLICY "Only functions can modify representatives"
  ON public.catalogo_representantes
  FOR ALL
  USING (false);

-- Inserir representantes iniciais
INSERT INTO public.catalogo_representantes (nome) VALUES
  ('Silvana Santos'),
  ('Lucas Alegria'),
  ('Yara');

-- Adicionar campos na tabela contratos
ALTER TABLE public.contratos 
  ADD COLUMN tipo_venda text,
  ADD COLUMN representante_vendas text;

-- Criar constraint para validar tipo_venda
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_tipo_venda_check 
  CHECK (tipo_venda IN ('Adicional Avulso', 'Contrato Ordinário'));

-- Trigger para updated_at em catalogo_cidades
CREATE TRIGGER update_catalogo_cidades_updated_at
  BEFORE UPDATE ON public.catalogo_cidades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em catalogo_representantes
CREATE TRIGGER update_catalogo_representantes_updated_at
  BEFORE UPDATE ON public.catalogo_representantes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();