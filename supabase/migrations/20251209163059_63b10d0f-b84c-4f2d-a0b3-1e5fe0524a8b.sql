-- Remover a CHECK constraint antiga de tipo
ALTER TABLE public.agendamentos DROP CONSTRAINT check_tipo;

-- Nota: A validação de tipos agora é feita dinamicamente através da tabela catalogo_tipos_agendamento