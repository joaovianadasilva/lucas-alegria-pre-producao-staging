CREATE OR REPLACE VIEW public.vw_contratos_completos AS
SELECT
  c.*,
  COALESCE(ad.nomes_adicionais, '') AS nomes_adicionais,
  COALESCE(ad.soma_adicionais, 0) AS soma_adicionais,
  ag.ultimo_agendamento_id,
  ag.ultima_data_agendamento,
  ag.ultimo_agendamento_status,
  ag.ultimo_agendamento_tipo,
  ag.ultimo_agendamento_confirmacao
FROM contratos c
LEFT JOIN LATERAL (
  SELECT
    string_agg(ac.adicional_nome, ', ' ORDER BY ac.adicional_nome) AS nomes_adicionais,
    SUM(ac.adicional_valor) AS soma_adicionais
  FROM adicionais_contrato ac
  WHERE ac.contrato_id = c.id
) ad ON true
LEFT JOIN LATERAL (
  SELECT
    a.id AS ultimo_agendamento_id,
    a.data_agendamento AS ultima_data_agendamento,
    a.status AS ultimo_agendamento_status,
    a.tipo AS ultimo_agendamento_tipo,
    a.confirmacao AS ultimo_agendamento_confirmacao
  FROM agendamentos a
  WHERE a.contrato_id = c.id
  ORDER BY a.created_at DESC
  LIMIT 1
) ag ON true;