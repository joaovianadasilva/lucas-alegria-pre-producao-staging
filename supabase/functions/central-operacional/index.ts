import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

interface Regra {
  exige_pagamentos?: number; // qtde mínima de mensalidades pagas
  dias_apos_ativacao?: number;
  dias_apos_cancelamento?: number;
  status_contrato_in?: string[];
}

function contratoElegivel(c: any, tipo: 'recebimento' | 'reembolso', regra: Regra | null): boolean {
  if (tipo === 'recebimento') {
    if (c.recebimento_efetivado === true) return false;
    const r = regra ?? {};
    const exige = r.exige_pagamentos ?? 1;
    const pgtos = [c.data_pgto_primeira_mensalidade, c.data_pgto_segunda_mensalidade, c.data_pgto_terceira_mensalidade].filter(Boolean).length;
    if (pgtos < exige) return false;
    if (r.status_contrato_in && c.status_contrato && !r.status_contrato_in.includes(c.status_contrato)) return false;
    if (r.dias_apos_ativacao && c.data_ativacao) {
      const diff = (Date.now() - new Date(c.data_ativacao).getTime()) / 86400000;
      if (diff < r.dias_apos_ativacao) return false;
    }
    return true;
  } else {
    if (c.reembolso_efetivado === true) return false;
    if (c.reembolsavel !== true) return false;
    const r = regra ?? {};
    if (r.status_contrato_in && c.status_contrato && !r.status_contrato_in.includes(c.status_contrato)) return false;
    if (r.dias_apos_cancelamento && c.data_cancelamento) {
      const diff = (Date.now() - new Date(c.data_cancelamento).getTime()) / 86400000;
      if (diff < r.dias_apos_cancelamento) return false;
    }
    return true;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const auth = req.headers.get('Authorization');
    if (!auth) return json({ error: 'Não autorizado' }, 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(auth.replace('Bearer ', ''));
    if (authError || !user) return json({ error: 'Token inválido' }, 401);

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isSA = roles?.some(r => r.role === 'super_admin');
    if (!isSA) return json({ error: 'Acesso restrito a super_admin' }, 403);

    const { action, ...params } = await req.json();
    console.log('central-operacional action:', action, params);

    // Carrega regras ativas e indexa por provedor+tipo
    const { data: regrasRows } = await supabase
      .from('regras_operacionais_provedor')
      .select('provedor_id, tipo, regra')
      .eq('ativo', true);
    const regrasMap = new Map<string, Regra>();
    for (const r of regrasRows || []) regrasMap.set(`${r.provedor_id}:${r.tipo}`, r.regra as Regra);

    const buildContractsQuery = (provedorIds?: string[]) => {
      let q = supabase.from('contratos').select('*');
      if (provedorIds && provedorIds.length > 0) q = q.in('provedor_id', provedorIds);
      return q;
    };

    const filterByBusca = (rows: any[], busca?: string) => {
      if (!busca) return rows;
      const s = busca.toLowerCase();
      return rows.filter(c =>
        (c.nome_completo || '').toLowerCase().includes(s) ||
        (c.cpf || '').toLowerCase().includes(s) ||
        (c.codigo_contrato || '').toLowerCase().includes(s) ||
        (c.codigo_cliente || '').toLowerCase().includes(s)
      );
    };

    switch (action) {
      case 'listElegiveis': {
        const tipo = params.tipo as 'recebimento' | 'reembolso';
        if (tipo !== 'recebimento' && tipo !== 'reembolso') return json({ error: 'tipo inválido' }, 400);
        const { data, error } = await buildContractsQuery(params.provedorIds);
        if (error) throw error;
        const rows = (data || []).filter(c => contratoElegivel(c, tipo, regrasMap.get(`${c.provedor_id}:${tipo}`) || null));
        return json({ success: true, contratos: filterByBusca(rows, params.busca) });
      }
      case 'listProcessados': {
        const tipo = params.tipo as 'recebimento' | 'reembolso';
        const flag = tipo === 'recebimento' ? 'recebimento_efetivado' : 'reembolso_efetivado';
        let q = buildContractsQuery(params.provedorIds);
        q = q.eq(flag, true);
        const { data, error } = await q;
        if (error) throw error;
        return json({ success: true, contratos: filterByBusca(data || [], params.busca) });
      }
      case 'confirmarRecebimento':
      case 'confirmarReembolso': {
        const { contratoId, data: dataAcao } = params;
        if (!contratoId) return json({ error: 'contratoId obrigatório' }, 400);
        const isReceb = action === 'confirmarRecebimento';
        const updates = isReceb
          ? { recebimento_efetivado: true, data_recebimento: dataAcao || new Date().toISOString().slice(0, 10) }
          : { reembolso_efetivado: true, data_reembolso: dataAcao || new Date().toISOString().slice(0, 10) };
        const { data: contrato, error: cErr } = await supabase.from('contratos').select('provedor_id, nome_completo').eq('id', contratoId).single();
        if (cErr) throw cErr;
        const { error } = await supabase.from('contratos').update(updates).eq('id', contratoId);
        if (error) throw error;
        await supabase.from('historico_contratos').insert({
          contrato_id: contratoId,
          provedor_id: contrato.provedor_id,
          entidade_nome: contrato.nome_completo,
          usuario_id: user.id,
          tipo_acao: isReceb ? 'recebimento_confirmado' : 'reembolso_confirmado',
          campo_alterado: isReceb ? 'recebimento_efetivado' : 'reembolso_efetivado',
          valor_anterior: 'false',
          valor_novo: 'true',
        });
        return json({ success: true });
      }
      case 'listProvedores': {
        const { data, error } = await supabase.from('provedores').select('id, nome').eq('ativo', true).order('nome');
        if (error) throw error;
        return json({ success: true, provedores: data });
      }
      case 'listContratos': {
        const {
          provedorIds, status, statusContrato, tipoVenda,
          dataInicio, dataFim, busca, page = 1, pageSize = 20,
        } = params;
        let q = supabase.from('contratos').select('*', { count: 'exact' });
        if (provedorIds && provedorIds.length > 0) q = q.in('provedor_id', provedorIds);
        if (status) q = q.eq('status', status);
        if (statusContrato) q = q.eq('status_contrato', statusContrato);
        if (tipoVenda) q = q.eq('tipo_venda', tipoVenda);
        if (dataInicio) q = q.gte('created_at', dataInicio);
        if (dataFim) q = q.lte('created_at', dataFim + 'T23:59:59');
        if (busca) {
          const s = `%${busca}%`;
          q = q.or(`nome_completo.ilike.${s},cpf.ilike.${s},codigo_contrato.ilike.${s},codigo_cliente.ilike.${s},email.ilike.${s},celular.ilike.${s}`);
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        q = q.order('created_at', { ascending: false }).range(from, to);
        const { data, error, count } = await q;
        if (error) throw error;
        return json({ success: true, contratos: data || [], total: count || 0 });
      }
      default:
        return json({ error: 'Ação desconhecida' }, 400);
    }
  } catch (e: any) {
    console.error('central-operacional error', e);
    return json({ error: e.message || String(e) }, 500);
  }
});
