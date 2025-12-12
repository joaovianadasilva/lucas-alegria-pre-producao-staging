-- Remover constraint antiga
ALTER TABLE agendamentos DROP CONSTRAINT IF EXISTS agendamentos_rede_check;

-- Adicionar nova constraint para lado_a até lado_z
ALTER TABLE agendamentos ADD CONSTRAINT agendamentos_rede_check 
CHECK ((rede IS NULL) OR (rede = ANY (ARRAY[
  'lado_a', 'lado_b', 'lado_c', 'lado_d', 'lado_e', 'lado_f', 'lado_g', 
  'lado_h', 'lado_i', 'lado_j', 'lado_k', 'lado_l', 'lado_m', 'lado_n', 
  'lado_o', 'lado_p', 'lado_q', 'lado_r', 'lado_s', 'lado_t', 'lado_u', 
  'lado_v', 'lado_w', 'lado_x', 'lado_y', 'lado_z'
]::text[])));