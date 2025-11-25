-- Corrigir search_path da função validate_slot_date_limit
CREATE OR REPLACE FUNCTION public.validate_slot_date_limit()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;