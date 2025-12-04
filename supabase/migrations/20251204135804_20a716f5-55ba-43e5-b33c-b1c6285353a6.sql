-- Criar tabela de catálogo de origens de vendas
CREATE TABLE public.catalogo_origem_vendas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  ativo boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.catalogo_origem_vendas ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública de origens ativas
CREATE POLICY "Anyone can read active origins"
ON public.catalogo_origem_vendas
FOR SELECT
USING (ativo = true);

-- Política para que apenas funções possam modificar
CREATE POLICY "Only functions can modify origins"
ON public.catalogo_origem_vendas
FOR ALL
USING (false);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_catalogo_origem_vendas_updated_at
BEFORE UPDATE ON public.catalogo_origem_vendas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados iniciais baseados nas opções existentes
INSERT INTO public.catalogo_origem_vendas (nome) VALUES
  ('Indicação'),
  ('Ex-cliente'),
  ('Panfleto'),
  ('Cartaz/Banner/Outdoor'),
  ('Google'),
  ('Facebook'),
  ('Instagram'),
  ('Internet'),
  ('Anúncio na parede / Placa'),
  ('Carro/Veículos da empresa'),
  ('Anúncio na avenida'),
  ('Caixa no poste'),
  ('Via Técnico'),
  ('Propaganda'),
  ('Mora próximo'),
  ('Condomínio'),
  ('Já é cliente'),
  ('Via Vendedor'),
  ('Não informado');