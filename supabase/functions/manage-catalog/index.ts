import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, codigo, nome, valor, uf, id, planId, addOnId, provedorId } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!provedorId) {
      throw new Error('provedorId é obrigatório');
    }

    switch (action) {
      // === PLANOS ===
      case 'listPlanos':
      case 'listPlans': {
        const { data, error } = await supabase
          .from('catalogo_planos')
          .select('*')
          .eq('ativo', true)
          .eq('provedor_id', provedorId)
          .order('codigo', { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, planos: data, plans: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addPlano':
      case 'createPlan': {
        if (!codigo || !nome || !valor) throw new Error('Código, nome e valor são obrigatórios');

        const { data: existing } = await supabase
          .from('catalogo_planos')
          .select('codigo')
          .eq('codigo', codigo)
          .eq('provedor_id', provedorId)
          .single();

        if (existing) throw new Error('Código já existe');

        const { data, error } = await supabase
          .from('catalogo_planos')
          .insert({ codigo, nome, valor: parseFloat(valor), ativo: true, provedor_id: provedorId })
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, plano: data, plan: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updatePlan': {
        if (!planId) throw new Error('ID do plano é obrigatório');
        const updateData: any = {};
        if (codigo !== undefined) updateData.codigo = codigo;
        if (nome !== undefined) updateData.nome = nome;
        if (valor !== undefined) updateData.valor = parseFloat(valor);

        const { data, error } = await supabase
          .from('catalogo_planos')
          .update(updateData)
          .eq('id', planId)
          .eq('provedor_id', provedorId)
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, plan: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removePlano':
      case 'deletePlan': {
        const removeId = planId || undefined;
        const removeCodigo = codigo || undefined;
        
        let query = supabase.from('catalogo_planos').update({ ativo: false });
        if (removeId) query = query.eq('id', removeId);
        else if (removeCodigo) query = query.eq('codigo', removeCodigo);
        else throw new Error('ID ou código é obrigatório');
        
        const { error } = await query.eq('provedor_id', provedorId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === ADICIONAIS ===
      case 'listAdicionais':
      case 'listAddOns': {
        const { data, error } = await supabase
          .from('catalogo_adicionais')
          .select('*')
          .eq('ativo', true)
          .eq('provedor_id', provedorId)
          .order('codigo', { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, adicionais: data, addOns: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addAdicional':
      case 'createAddOn': {
        const { requer_agendamento } = body;
        if (!codigo || !nome || !valor) throw new Error('Código, nome e valor são obrigatórios');

        const { data: existing } = await supabase
          .from('catalogo_adicionais')
          .select('codigo')
          .eq('codigo', codigo)
          .eq('provedor_id', provedorId)
          .single();

        if (existing) throw new Error('Código já existe');

        const { data, error } = await supabase
          .from('catalogo_adicionais')
          .insert({ codigo, nome, valor: parseFloat(valor), ativo: true, requer_agendamento: requer_agendamento || false, provedor_id: provedorId })
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, adicional: data, addOn: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateAddOn': {
        const { requer_agendamento } = body;
        if (!addOnId) throw new Error('ID do adicional é obrigatório');

        const updateData: any = {};
        if (codigo !== undefined) updateData.codigo = codigo;
        if (nome !== undefined) updateData.nome = nome;
        if (valor !== undefined) updateData.valor = parseFloat(valor);
        if (requer_agendamento !== undefined) updateData.requer_agendamento = requer_agendamento;

        const { data, error } = await supabase
          .from('catalogo_adicionais')
          .update(updateData)
          .eq('id', addOnId)
          .eq('provedor_id', provedorId)
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, addOn: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeAdicional':
      case 'deleteAddOn': {
        const removeId = addOnId || undefined;
        const removeCodigo = codigo || undefined;
        
        let query = supabase.from('catalogo_adicionais').update({ ativo: false });
        if (removeId) query = query.eq('id', removeId);
        else if (removeCodigo) query = query.eq('codigo', removeCodigo);
        else throw new Error('ID ou código é obrigatório');
        
        const { error } = await query.eq('provedor_id', provedorId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === CIDADES ===
      case 'listCidades': {
        let query = supabase
          .from('catalogo_cidades')
          .select('id, nome, uf')
          .eq('ativo', true)
          .eq('provedor_id', provedorId)
          .order('nome', { ascending: true });
        if (uf) query = query.eq('uf', uf);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addCidade': {
        if (!nome) throw new Error('Nome e UF são obrigatórios');
        const cidade_uf = body.uf;
        if (!cidade_uf) throw new Error('UF é obrigatória');

        const { data: existing } = await supabase
          .from('catalogo_cidades')
          .select('id')
          .eq('nome', nome)
          .eq('uf', cidade_uf)
          .eq('provedor_id', provedorId)
          .single();

        if (existing) throw new Error('Cidade já existe para esta UF');

        const { data, error } = await supabase
          .from('catalogo_cidades')
          .insert({ nome, uf: cidade_uf, ativo: true, provedor_id: provedorId })
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, cidade: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeCidade': {
        if (!id) throw new Error('ID é obrigatório');
        const { error } = await supabase
          .from('catalogo_cidades')
          .update({ ativo: false })
          .eq('id', id)
          .eq('provedor_id', provedorId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === REPRESENTANTES ===
      case 'listRepresentantes': {
        const { data, error } = await supabase
          .from('catalogo_representantes')
          .select('id, nome')
          .eq('ativo', true)
          .eq('provedor_id', provedorId)
          .order('nome', { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addRepresentante': {
        if (!nome) throw new Error('Nome é obrigatório');
        const { data: existing } = await supabase
          .from('catalogo_representantes')
          .select('id')
          .eq('nome', nome)
          .eq('provedor_id', provedorId)
          .single();

        if (existing) throw new Error('Representante já existe');

        const { data, error } = await supabase
          .from('catalogo_representantes')
          .insert({ nome, ativo: true, provedor_id: provedorId })
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, representante: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeRepresentante': {
        if (!id) throw new Error('ID é obrigatório');
        const { error } = await supabase
          .from('catalogo_representantes')
          .update({ ativo: false })
          .eq('id', id)
          .eq('provedor_id', provedorId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === ORIGENS ===
      case 'listOrigens': {
        const { data, error } = await supabase
          .from('catalogo_origem_vendas')
          .select('id, nome')
          .eq('ativo', true)
          .eq('provedor_id', provedorId)
          .order('nome', { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addOrigem': {
        if (!nome) throw new Error('Nome é obrigatório');
        const { data: existing } = await supabase
          .from('catalogo_origem_vendas')
          .select('id')
          .eq('nome', nome)
          .eq('provedor_id', provedorId)
          .single();

        if (existing) throw new Error('Origem já existe');

        const { data, error } = await supabase
          .from('catalogo_origem_vendas')
          .insert({ nome, ativo: true, provedor_id: provedorId })
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, origem: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeOrigem': {
        if (!id) throw new Error('ID é obrigatório');
        const { error } = await supabase
          .from('catalogo_origem_vendas')
          .update({ ativo: false })
          .eq('id', id)
          .eq('provedor_id', provedorId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === TIPOS DE AGENDAMENTO ===
      case 'listTiposAgendamento': {
        const { data, error } = await supabase
          .from('catalogo_tipos_agendamento')
          .select('id, codigo, nome')
          .eq('ativo', true)
          .eq('provedor_id', provedorId)
          .order('nome', { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, tipos: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addTipoAgendamento': {
        if (!codigo || !nome) throw new Error('Código e nome são obrigatórios');

        const { data: existing } = await supabase
          .from('catalogo_tipos_agendamento')
          .select('codigo')
          .eq('codigo', codigo)
          .eq('provedor_id', provedorId)
          .single();

        if (existing) throw new Error('Código já existe');

        const { data, error } = await supabase
          .from('catalogo_tipos_agendamento')
          .insert({ codigo, nome, ativo: true, provedor_id: provedorId })
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, tipo: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateTipoAgendamento': {
        const tipoId = body.tipoId;
        if (!tipoId) throw new Error('ID do tipo é obrigatório');

        const updateData: any = {};
        if (codigo !== undefined) updateData.codigo = codigo;
        if (nome !== undefined) updateData.nome = nome;

        const { data, error } = await supabase
          .from('catalogo_tipos_agendamento')
          .update(updateData)
          .eq('id', tipoId)
          .eq('provedor_id', provedorId)
          .select()
          .single();
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, tipo: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeTipoAgendamento': {
        const tipoId = body.tipoId || id;
        if (!tipoId) throw new Error('ID do tipo é obrigatório');
        const { error } = await supabase
          .from('catalogo_tipos_agendamento')
          .update({ ativo: false })
          .eq('id', tipoId)
          .eq('provedor_id', provedorId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === LIST ALL (admin - includes inactive) ===
      case 'listAllPlanos': {
        const { data, error } = await supabase
          .from('catalogo_planos')
          .select('*')
          .eq('provedor_id', provedorId)
          .order('codigo', { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, plans: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAllAdicionais': {
        const { data, error } = await supabase
          .from('catalogo_adicionais')
          .select('*')
          .eq('provedor_id', provedorId)
          .order('codigo', { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, addOns: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAllTiposAgendamento': {
        const { data, error } = await supabase
          .from('catalogo_tipos_agendamento')
          .select('*')
          .eq('provedor_id', provedorId)
          .order('nome', { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, tipos: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAllRepresentantes': {
        const { data, error } = await supabase
          .from('catalogo_representantes')
          .select('*')
          .eq('provedor_id', provedorId)
          .order('nome', { ascending: true });
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // === TOGGLE STATUS ===
      case 'toggleStatus': {
        const { tabela, itemId, ativo } = body;
        const allowedTables = ['catalogo_planos', 'catalogo_adicionais', 'catalogo_tipos_agendamento', 'catalogo_representantes'];
        if (!allowedTables.includes(tabela)) throw new Error('Tabela não permitida');
        if (!itemId) throw new Error('itemId é obrigatório');
        if (typeof ativo !== 'boolean') throw new Error('ativo deve ser boolean');

        const { error } = await supabase
          .from(tabela)
          .update({ ativo })
          .eq('id', itemId)
          .eq('provedor_id', provedorId);
        if (error) throw error;
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error('Ação inválida');
    }
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})