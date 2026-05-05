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
      case 'exportContratos': {
        const {
          provedorIds, status, statusContrato, tipoVenda,
          dataInicio, dataFim, busca,
        } = params;
        const MAX = 50000;
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
        q = q.order('created_at', { ascending: false }).range(0, MAX - 1);
        const { data, error, count } = await q;
        if (error) throw error;
        if ((count || 0) > MAX) {
          return json({ error: `Exportação excede ${MAX} linhas (${count}). Refine os filtros.` }, 400);
        }
        return json({ success: true, contratos: data || [], total: count || 0 });
      }
      case 'relatorioVisaoGeralVendas': {
        const { provedorIds, dataInicio, dataFim } = params as { provedorIds?: string[]; dataInicio: string; dataFim: string };
        if (!dataInicio || !dataFim) return json({ error: 'dataInicio e dataFim obrigatórios' }, 400);

        const inicioISO = `${dataInicio}T00:00:00`;
        const fimISO = `${dataFim}T23:59:59`;

        // Helper para paginar acima de 1000
        const fetchAll = async (build: () => any) => {
          const out: any[] = [];
          const page = 1000;
          for (let from = 0; ; from += page) {
            const { data, error } = await build().range(from, from + page - 1);
            if (error) throw error;
            out.push(...(data || []));
            if (!data || data.length < page) break;
          }
          return out;
        };

        const baseFilter = (q: any) => {
          if (provedorIds && provedorIds.length > 0) q = q.in('provedor_id', provedorIds);
          return q;
        };

        const [cadastrados, instalados, cancelados] = await Promise.all([
          fetchAll(() => baseFilter(supabase.from('contratos').select('id, provedor_id, created_at, plano_codigo, plano_nome, plano_valor, taxa_instalacao, origem, representante_vendas').gte('created_at', inicioISO).lte('created_at', fimISO))),
          fetchAll(() => baseFilter(supabase.from('contratos').select('id, provedor_id, data_ativacao, plano_codigo, plano_nome, plano_valor, origem, representante_vendas').gte('data_ativacao', dataInicio).lte('data_ativacao', dataFim).not('data_ativacao', 'is', null))),
          fetchAll(() => baseFilter(supabase.from('contratos').select('id, provedor_id, data_cancelamento, motivo_cancelamento').gte('data_cancelamento', dataInicio).lte('data_cancelamento', dataFim).not('data_cancelamento', 'is', null))),
        ]);

        // Adicionais: pegar todos os adicionais de contratos cadastrados OU instalados no período
        const idsRelevantes = Array.from(new Set([...cadastrados.map(c => c.id), ...instalados.map(c => c.id)]));
        let adicionais: any[] = [];
        if (idsRelevantes.length > 0) {
          // Chunk para evitar query muito grande
          const chunk = 200;
          for (let i = 0; i < idsRelevantes.length; i += chunk) {
            const slice = idsRelevantes.slice(i, i + chunk);
            const { data, error } = await supabase.from('adicionais_contrato')
              .select('contrato_id, adicional_codigo, adicional_nome, adicional_valor')
              .in('contrato_id', slice);
            if (error) throw error;
            adicionais.push(...(data || []));
          }
        }

        // ===== KPIs e médias =====
        const ms = (new Date(fimISO).getTime() - new Date(inicioISO).getTime());
        const dias = Math.max(1, Math.ceil(ms / 86400000));
        const semanas = Math.max(1, dias / 7);
        const kpis = {
          cadastrados: cadastrados.length,
          instalados: instalados.length,
          cancelados: cancelados.length,
          mediaCadastradosDia: cadastrados.length / dias,
          mediaCadastradosSemana: cadastrados.length / semanas,
          mediaInstaladosDia: instalados.length / dias,
          mediaInstaladosSemana: instalados.length / semanas,
          mediaCanceladosDia: cancelados.length / dias,
          mediaCanceladosSemana: cancelados.length / semanas,
          dias, semanas,
        };

        // ===== Série temporal (cadastrados x instalados por dia) =====
        const serieMap = new Map<string, { data: string; cadastrados: number; instalados: number }>();
        const ensure = (d: string) => {
          if (!serieMap.has(d)) serieMap.set(d, { data: d, cadastrados: 0, instalados: 0 });
          return serieMap.get(d)!;
        };
        for (const c of cadastrados) {
          const d = (c.created_at || '').slice(0, 10);
          if (d) ensure(d).cadastrados++;
        }
        for (const c of instalados) {
          const d = (c.data_ativacao || '').slice(0, 10);
          if (d) ensure(d).instalados++;
        }
        const serieTemporal = Array.from(serieMap.values()).sort((a, b) => a.data.localeCompare(b.data));

        // ===== Composição (sem/com adicionais) baseada nos INSTALADOS =====
        const adicPorContrato = new Map<string, any[]>();
        for (const a of adicionais) {
          if (!adicPorContrato.has(a.contrato_id)) adicPorContrato.set(a.contrato_id, []);
          adicPorContrato.get(a.contrato_id)!.push(a);
        }
        const cadIds = new Set(cadastrados.map(c => c.id));

        let semAdic = { cadastrados: 0, instalados: 0, valorPlanoCadastrados: 0, valorPlanoInstalados: 0 };
        let comAdic = { cadastrados: 0, instalados: 0, valorPlanoCadastrados: 0, valorAdicionaisCadastrados: 0, valorPlanoInstalados: 0, valorAdicionaisInstalados: 0 };

        for (const c of cadastrados) {
          const adic = adicPorContrato.get(c.id) || [];
          const valor = Number(c.plano_valor || 0);
          const somaAdic = adic.reduce((s, a) => s + Number(a.adicional_valor || 0), 0);
          if (adic.length > 0) {
            comAdic.cadastrados++;
            comAdic.valorPlanoCadastrados += valor;
            comAdic.valorAdicionaisCadastrados += somaAdic;
          } else {
            semAdic.cadastrados++;
            semAdic.valorPlanoCadastrados += valor;
          }
        }
        for (const c of instalados) {
          const adic = adicPorContrato.get(c.id) || [];
          const valor = Number(c.plano_valor || 0);
          if (adic.length > 0) {
            comAdic.instalados++;
            comAdic.valorPlanoInstalados += valor;
            comAdic.valorAdicionaisInstalados += adic.reduce((s, a) => s + Number(a.adicional_valor || 0), 0);
          } else {
            semAdic.instalados++;
            semAdic.valorPlanoInstalados += valor;
          }
        }

        // ===== Rankings =====
        const tally = <T>(arr: any[], keyFn: (x: any) => string, labelFn: (x: any) => string) => {
          const m = new Map<string, { codigo: string; nome: string; total: number }>();
          for (const x of arr) {
            const k = keyFn(x);
            if (!k) continue;
            const cur = m.get(k);
            if (cur) cur.total++;
            else m.set(k, { codigo: k, nome: labelFn(x), total: 1 });
          }
          return Array.from(m.values()).sort((a, b) => b.total - a.total).slice(0, 10);
        };

        // Combinado: planos cadastrados + instalados em uma só lista
        const planosMap = new Map<string, { codigo: string; nome: string; cadastrados: number; instalados: number }>();
        const upPlano = (codigo: string, nome: string, field: 'cadastrados' | 'instalados') => {
          if (!codigo) return;
          if (!planosMap.has(codigo)) planosMap.set(codigo, { codigo, nome, cadastrados: 0, instalados: 0 });
          planosMap.get(codigo)![field]++;
        };
        for (const c of cadastrados) upPlano(c.plano_codigo, c.plano_nome, 'cadastrados');
        for (const c of instalados) upPlano(c.plano_codigo, c.plano_nome, 'instalados');
        const rankingPlanos = Array.from(planosMap.values())
          .sort((a, b) => (b.cadastrados + b.instalados) - (a.cadastrados + a.instalados))
          .slice(0, 10);

        // Adicionais: contar somente os de contratos cadastrados no período
        const adicCadastrados = adicionais.filter(a => cadIds.has(a.contrato_id));
        const rankingAdicionais = tally(adicCadastrados, a => a.adicional_codigo, a => a.adicional_nome);

        // Origem e Representante: agrupar cadastrados + instalados
        const buildGroup = (field: 'origem' | 'representante_vendas') => {
          const m = new Map<string, { chave: string; cadastrados: number; instalados: number }>();
          const get = (k: string) => {
            if (!m.has(k)) m.set(k, { chave: k, cadastrados: 0, instalados: 0 });
            return m.get(k)!;
          };
          for (const c of cadastrados) get(((c as any)[field] || '').trim() || 'Não informado').cadastrados++;
          for (const c of instalados) get(((c as any)[field] || '').trim() || 'Não informado').instalados++;
          return Array.from(m.values()).sort((a, b) => (b.cadastrados + b.instalados) - (a.cadastrados + a.instalados));
        };
        const rankingOrigens = buildGroup('origem');
        const rankingRepresentantes = buildGroup('representante_vendas');

        // ===== Cancelamentos por motivo =====
        const motivosMap = new Map<string, number>();
        for (const c of cancelados) {
          const m = (c.motivo_cancelamento || '').trim() || 'Não informado';
          motivosMap.set(m, (motivosMap.get(m) || 0) + 1);
        }
        const cancelamentosPorMotivo = Array.from(motivosMap.entries())
          .map(([motivo, total]) => ({ motivo, total }))
          .sort((a, b) => b.total - a.total);

        return json({
          success: true,
          kpis,
          serieTemporal,
          composicao: { semAdicionais: semAdic, comAdicionais: comAdic },
          rankings: { planos: rankingPlanos, adicionais: rankingAdicionais, origens: rankingOrigens, representantes: rankingRepresentantes },
          cancelamentosPorMotivo,
        });
      }
      case 'relatorioVisaoGeralAgendamentos': {
        const {
          provedorIds, dataInicio, dataFim,
          status: fStatus, confirmacao: fConf, tecnicoIds, tipos: fTipos,
          origens: fOrigens, redes: fRedes, representantes: fReps,
        } = params as {
          provedorIds?: string[]; dataInicio: string; dataFim: string;
          status?: string[]; confirmacao?: string[]; tecnicoIds?: string[]; tipos?: string[];
          origens?: string[]; redes?: string[]; representantes?: string[];
        };
        if (!dataInicio || !dataFim) return json({ error: 'dataInicio e dataFim obrigatórios' }, 400);

        const fetchAll = async (build: () => any) => {
          const out: any[] = [];
          const page = 1000;
          for (let from = 0; ; from += page) {
            const { data, error } = await build().range(from, from + page - 1);
            if (error) throw error;
            out.push(...(data || []));
            if (!data || data.length < page) break;
          }
          return out;
        };

        const applyFilters = (q: any) => {
          if (provedorIds?.length) q = q.in('provedor_id', provedorIds);
          if (fStatus?.length) q = q.in('status', fStatus);
          if (fConf?.length) q = q.in('confirmacao', fConf);
          if (fTipos?.length) q = q.in('tipo', fTipos);
          if (tecnicoIds?.length) {
            // Suportar valor "__none__" para "Sem técnico"
            const hasNone = tecnicoIds.includes('__none__');
            const ids = tecnicoIds.filter(t => t !== '__none__');
            if (hasNone && ids.length === 0) q = q.is('tecnico_responsavel_id', null);
            else if (!hasNone) q = q.in('tecnico_responsavel_id', ids);
            // se ambos: não restringir por técnico (cobre tudo)
          }
          if (fOrigens?.length) q = q.in('origem', fOrigens);
          if (fRedes?.length) q = q.in('rede', fRedes);
          if (fReps?.length) q = q.in('representante_vendas', fReps);
          return q;
        };

        const agendamentos = await fetchAll(() => applyFilters(
          supabase.from('agendamentos')
            .select('id, provedor_id, data_agendamento, slot_numero, status, confirmacao, tipo, origem, rede, representante_vendas, tecnico_responsavel_id, created_at')
            .gte('data_agendamento', dataInicio)
            .lte('data_agendamento', dataFim)
        ));

        // Reagendamentos no período (para gráfico de cancelamentos & reprogramações ao longo do tempo)
        let reagFilter = supabase.from('historico_reagendamentos')
          .select('id, provedor_id, agendamento_id, data_nova, created_at')
          .gte('data_nova', dataInicio)
          .lte('data_nova', dataFim);
        if (provedorIds?.length) reagFilter = reagFilter.in('provedor_id', provedorIds);
        const reagendamentos = await fetchAll(() => reagFilter);

        // Lookup nomes de técnicos
        const tecIds = Array.from(new Set(agendamentos.map(a => a.tecnico_responsavel_id).filter(Boolean)));
        const profMap = new Map<string, string>();
        if (tecIds.length > 0) {
          const { data: profs } = await supabase.from('profiles').select('id, nome, sobrenome').in('id', tecIds);
          (profs || []).forEach(p => profMap.set(p.id, `${p.nome || ''} ${p.sobrenome || ''}`.trim() || 'Sem nome'));
        }
        const tecNome = (id: string | null) => id ? (profMap.get(id) || 'Desconhecido') : 'Sem técnico';

        const today = new Date().toISOString().slice(0, 10);
        const in7 = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10); })();

        // ===== KPIs =====
        const isReprog = new Set(reagendamentos.map(r => r.agendamento_id));
        const kpis = {
          hoje: agendamentos.filter(a => a.data_agendamento === today).length,
          proximos7Dias: agendamentos.filter(a => a.data_agendamento >= today && a.data_agendamento <= in7).length,
          pendentes: agendamentos.filter(a => a.status === 'pendente').length,
          confirmados: agendamentos.filter(a => a.confirmacao === 'confirmado').length,
          concluidos: agendamentos.filter(a => a.status === 'concluido').length,
          cancelados: agendamentos.filter(a => a.status === 'cancelado').length,
          reprogramados: isReprog.size,
          semTecnico: agendamentos.filter(a => !a.tecnico_responsavel_id).length,
        };

        // ===== Série temporal (volume por dia) =====
        const serieMap = new Map<string, any>();
        const ensureS = (d: string) => {
          if (!serieMap.has(d)) serieMap.set(d, { data: d, total: 0, pendentes: 0, confirmados: 0, concluidos: 0, cancelados: 0 });
          return serieMap.get(d);
        };
        for (const a of agendamentos) {
          const row = ensureS(a.data_agendamento);
          row.total++;
          if (a.status === 'pendente') row.pendentes++;
          if (a.confirmacao === 'confirmado') row.confirmados++;
          if (a.status === 'concluido') row.concluidos++;
          if (a.status === 'cancelado') row.cancelados++;
        }
        const serieTemporal = Array.from(serieMap.values()).sort((a, b) => a.data.localeCompare(b.data));

        // Cancelamentos & reprogramações ao longo do tempo
        const crMap = new Map<string, { data: string; cancelados: number; reprogramados: number }>();
        const ensureCR = (d: string) => {
          if (!crMap.has(d)) crMap.set(d, { data: d, cancelados: 0, reprogramados: 0 });
          return crMap.get(d)!;
        };
        for (const a of agendamentos) if (a.status === 'cancelado') ensureCR(a.data_agendamento).cancelados++;
        for (const r of reagendamentos) {
          const d = (r.created_at || r.data_nova || '').slice(0, 10);
          if (d) ensureCR(d).reprogramados++;
        }
        const cancelReprogTempo = Array.from(crMap.values()).sort((a, b) => a.data.localeCompare(b.data));

        // ===== Registrados por dia (created_at) =====
        const registradosAgendamentos = await fetchAll(() => applyFilters(
          supabase.from('agendamentos')
            .select('id, provedor_id, created_at, status, confirmacao, tipo, origem, rede, representante_vendas, tecnico_responsavel_id, data_agendamento')
            .gte('created_at', dataInicio + 'T00:00:00')
            .lte('created_at', dataFim + 'T23:59:59')
        ));
        const regMap = new Map<string, number>();
        for (const a of registradosAgendamentos) {
          const d = (a.created_at || '').slice(0, 10);
          if (!d) continue;
          regMap.set(d, (regMap.get(d) || 0) + 1);
        }
        const registradosPorDia = Array.from(regMap.entries())
          .map(([data, total]) => ({ data, total }))
          .sort((a, b) => a.data.localeCompare(b.data));

        // ===== Ocupação por slot =====
        const slotMap = new Map<number, number>();
        for (const a of agendamentos) slotMap.set(a.slot_numero, (slotMap.get(a.slot_numero) || 0) + 1);
        const ocupacaoPorSlot = Array.from(slotMap.entries())
          .map(([slot, total]) => ({ slot, total }))
          .sort((a, b) => a.slot - b.slot);

        // ===== Por técnico =====
        const tecMap = new Map<string, { tecnico: string; total: number; pendentes: number; concluidos: number }>();
        const ensureT = (n: string) => {
          if (!tecMap.has(n)) tecMap.set(n, { tecnico: n, total: 0, pendentes: 0, concluidos: 0 });
          return tecMap.get(n)!;
        };
        for (const a of agendamentos) {
          const t = ensureT(tecNome(a.tecnico_responsavel_id));
          t.total++;
          if (a.status === 'pendente') t.pendentes++;
          if (a.status === 'concluido') t.concluidos++;
        }
        const porTecnico = Array.from(tecMap.values()).sort((a, b) => b.total - a.total);

        // ===== Distribuições =====
        const tally1 = (field: string) => {
          const m = new Map<string, number>();
          for (const a of agendamentos) {
            const k = ((a as any)[field] || '').toString().trim() || 'Não informado';
            m.set(k, (m.get(k) || 0) + 1);
          }
          return Array.from(m.entries()).map(([chave, total]) => ({ chave, total })).sort((a, b) => b.total - a.total);
        };
        const distribuicaoStatus = tally1('status').map(x => ({ status: x.chave, total: x.total }));
        const distribuicaoConfirmacao = tally1('confirmacao').map(x => ({ confirmacao: x.chave, total: x.total }));
        const porOrigem = tally1('origem');
        const porRepresentante = tally1('representante_vendas');
        const porRede = tally1('rede');

        // ===== Pendências =====
        const pendentes = agendamentos.filter(a => a.status === 'pendente');
        const todayDate = new Date(today + 'T00:00:00');
        const bucketAging = (dias: number) => {
          if (dias <= 1) return '0-1d';
          if (dias <= 3) return '2-3d';
          if (dias <= 7) return '4-7d';
          if (dias <= 14) return '8-14d';
          return '15+d';
        };
        const agingMap = new Map<string, number>();
        for (const a of pendentes) {
          const d = new Date(a.data_agendamento + 'T00:00:00');
          const diff = Math.max(0, Math.floor((todayDate.getTime() - d.getTime()) / 86400000));
          // Apenas pendências vencidas/dia
          const f = bucketAging(diff);
          agingMap.set(f, (agingMap.get(f) || 0) + 1);
        }
        const ordemAging = ['0-1d', '2-3d', '4-7d', '8-14d', '15+d'];
        const agingPendencias = ordemAging.map(faixa => ({ faixa, total: agingMap.get(faixa) || 0 }));

        const bucketLead = (dias: number) => {
          if (dias <= 0) return 'mesmo dia';
          if (dias <= 3) return '1-3d';
          if (dias <= 7) return '4-7d';
          if (dias <= 14) return '8-14d';
          return '15+d';
        };
        const leadMap = new Map<string, number>();
        for (const a of agendamentos) {
          if (!a.created_at) continue;
          const c = new Date(a.created_at);
          const d = new Date(a.data_agendamento + 'T00:00:00');
          const diff = Math.max(0, Math.floor((d.getTime() - c.getTime()) / 86400000));
          const f = bucketLead(diff);
          leadMap.set(f, (leadMap.get(f) || 0) + 1);
        }
        const ordemLead = ['mesmo dia', '1-3d', '4-7d', '8-14d', '15+d'];
        const leadTime = ordemLead.map(faixa => ({ faixa, total: leadMap.get(faixa) || 0 }));

        const pendTecMap = new Map<string, number>();
        for (const a of pendentes) {
          const n = tecNome(a.tecnico_responsavel_id);
          pendTecMap.set(n, (pendTecMap.get(n) || 0) + 1);
        }
        const pendentesPorTecnico = Array.from(pendTecMap.entries())
          .map(([tecnico, total]) => ({ tecnico, total }))
          .sort((a, b) => b.total - a.total);

        return json({
          success: true,
          kpis,
          serieTemporal,
          ocupacaoPorSlot,
          porTecnico,
          distribuicaoStatus,
          distribuicaoConfirmacao,
          cancelReprogTempo,
          porOrigem,
          porRepresentante,
          porRede,
          agingPendencias,
          leadTime,
          pendentesPorTecnico,
        });
      }
      default:
        return json({ error: 'Ação desconhecida' }, 400);
    }
  } catch (e: any) {
    console.error('central-operacional error', e);
    return json({ error: e.message || String(e) }, 500);
  }
});
