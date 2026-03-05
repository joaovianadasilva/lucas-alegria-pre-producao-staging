-- slots: remover constraint e recriar como index com provedor_id
ALTER TABLE slots DROP CONSTRAINT IF EXISTS unique_slot_per_date;
CREATE UNIQUE INDEX unique_slot_per_date ON slots (data_disponivel, slot_numero, provedor_id);

-- agendamentos: remover index parcial e recriar com provedor_id
DROP INDEX IF EXISTS agendamentos_data_slot_unique_active;
CREATE UNIQUE INDEX agendamentos_data_slot_unique_active
  ON agendamentos (data_agendamento, slot_numero, provedor_id)
  WHERE (status <> 'cancelado');