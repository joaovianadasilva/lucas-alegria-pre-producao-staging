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
    const { action, codigo, nome, valor, uf, id, planId, addOnId } = body;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'listPlanos': {
        const { data, error } = await supabase
          .from('catalogo_planos')
          .select('*')
          .eq('ativo', true)
          .order('codigo', { ascending: true });
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, planos: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAdicionais': {
        const { data, error } = await supabase
          .from('catalogo_adicionais')
          .select('*')
          .eq('ativo', true)
          .order('codigo', { ascending: true });
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, adicionais: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addPlano': {
        if (!codigo || !nome || !valor) {
          throw new Error('Código, nome e valor são obrigatórios');
        }

        // Verificar duplicidade
        const { data: existing } = await supabase
          .from('catalogo_planos')
          .select('codigo')
          .eq('codigo', codigo)
          .single();

        if (existing) {
          throw new Error('Código já existe');
        }

        const { data, error } = await supabase
          .from('catalogo_planos')
          .insert({
            codigo,
            nome,
            valor: parseFloat(valor),
            ativo: true
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, plano: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removePlano': {
        if (!codigo) {
          throw new Error('Código é obrigatório');
        }

        // Desativar em vez de deletar (soft delete)
        const { error } = await supabase
          .from('catalogo_planos')
          .update({ ativo: false })
          .eq('codigo', codigo);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addAdicional': {
        if (!codigo || !nome || !valor) {
          throw new Error('Código, nome e valor são obrigatórios');
        }

        // Verificar duplicidade
        const { data: existing } = await supabase
          .from('catalogo_adicionais')
          .select('codigo')
          .eq('codigo', codigo)
          .single();

        if (existing) {
          throw new Error('Código já existe');
        }

        const { data, error } = await supabase
          .from('catalogo_adicionais')
          .insert({
            codigo,
            nome,
            valor: parseFloat(valor),
            ativo: true
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, adicional: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeAdicional': {
        if (!codigo) {
          throw new Error('Código é obrigatório');
        }

        // Desativar em vez de deletar (soft delete)
        const { error } = await supabase
          .from('catalogo_adicionais')
          .update({ ativo: false })
          .eq('codigo', codigo);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listCidades': {
        let query = supabase
          .from('catalogo_cidades')
          .select('id, nome, uf')
          .eq('ativo', true)
          .order('nome', { ascending: true });
        
        if (uf) {
          query = query.eq('uf', uf);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addCidade': {
        if (!nome) {
          throw new Error('Nome e UF são obrigatórios');
        }
        const cidade_uf = body.uf;
        if (!cidade_uf) {
          throw new Error('UF é obrigatória');
        }

        // Verificar duplicidade
        const { data: existing } = await supabase
          .from('catalogo_cidades')
          .select('id')
          .eq('nome', nome)
          .eq('uf', cidade_uf)
          .single();

        if (existing) {
          throw new Error('Cidade já existe para esta UF');
        }

        const { data, error } = await supabase
          .from('catalogo_cidades')
          .insert({
            nome,
            uf: cidade_uf,
            ativo: true
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, cidade: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeCidade': {
        if (!id) {
          throw new Error('ID é obrigatório');
        }

        const { error } = await supabase
          .from('catalogo_cidades')
          .update({ ativo: false })
          .eq('id', id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listRepresentantes': {
        const { data, error } = await supabase
          .from('catalogo_representantes')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome', { ascending: true });
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addRepresentante': {
        if (!nome) {
          throw new Error('Nome é obrigatório');
        }

        // Verificar duplicidade
        const { data: existing } = await supabase
          .from('catalogo_representantes')
          .select('id')
          .eq('nome', nome)
          .single();

        if (existing) {
          throw new Error('Representante já existe');
        }

        const { data, error } = await supabase
          .from('catalogo_representantes')
          .insert({
            nome,
            ativo: true
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, representante: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'removeRepresentante': {
        if (!id) {
          throw new Error('ID é obrigatório');
        }

        const { error } = await supabase
          .from('catalogo_representantes')
          .update({ ativo: false })
          .eq('id', id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // English aliases for Plans
      case 'listPlans': {
        const { data, error } = await supabase
          .from('catalogo_planos')
          .select('*')
          .eq('ativo', true)
          .order('codigo', { ascending: true });
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, plans: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createPlan': {
        if (!codigo || !nome || valor === undefined) {
          throw new Error('Código, nome e valor são obrigatórios');
        }

        // Verificar duplicidade
        const { data: existing } = await supabase
          .from('catalogo_planos')
          .select('codigo')
          .eq('codigo', codigo)
          .single();

        if (existing) {
          throw new Error('Código já existe');
        }

        const { data, error } = await supabase
          .from('catalogo_planos')
          .insert({
            codigo,
            nome,
            valor: parseFloat(valor),
            ativo: true
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, plan: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updatePlan': {
        if (!planId) {
          throw new Error('ID do plano é obrigatório');
        }

        const updateData: any = {};
        if (codigo !== undefined) updateData.codigo = codigo;
        if (nome !== undefined) updateData.nome = nome;
        if (valor !== undefined) updateData.valor = parseFloat(valor);

        const { data, error } = await supabase
          .from('catalogo_planos')
          .update(updateData)
          .eq('id', planId)
          .select()
          .single();
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, plan: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deletePlan': {
        if (!planId) {
          throw new Error('ID do plano é obrigatório');
        }

        const { error } = await supabase
          .from('catalogo_planos')
          .update({ ativo: false })
          .eq('id', planId);
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // English aliases for Add-ons
      case 'listAddOns': {
        const { data, error } = await supabase
          .from('catalogo_adicionais')
          .select('*')
          .eq('ativo', true)
          .order('codigo', { ascending: true });
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, addOns: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createAddOn': {
        if (!codigo || !nome || valor === undefined) {
          throw new Error('Código, nome e valor são obrigatórios');
        }

        // Verificar duplicidade
        const { data: existing } = await supabase
          .from('catalogo_adicionais')
          .select('codigo')
          .eq('codigo', codigo)
          .single();

        if (existing) {
          throw new Error('Código já existe');
        }

        const { data, error } = await supabase
          .from('catalogo_adicionais')
          .insert({
            codigo,
            nome,
            valor: parseFloat(valor),
            ativo: true
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, addOn: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateAddOn': {
        if (!addOnId) {
          throw new Error('ID do adicional é obrigatório');
        }

        const updateData: any = {};
        if (codigo !== undefined) updateData.codigo = codigo;
        if (nome !== undefined) updateData.nome = nome;
        if (valor !== undefined) updateData.valor = parseFloat(valor);

        const { data, error } = await supabase
          .from('catalogo_adicionais')
          .update(updateData)
          .eq('id', addOnId)
          .select()
          .single();
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, addOn: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deleteAddOn': {
        if (!addOnId) {
          throw new Error('ID do adicional é obrigatório');
        }

        const { error } = await supabase
          .from('catalogo_adicionais')
          .update({ ativo: false })
          .eq('id', addOnId);
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listOrigens': {
        const { data, error } = await supabase
          .from('catalogo_origem_vendas')
          .select('id, nome')
          .eq('ativo', true)
          .order('nome', { ascending: true });
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Tipos de Agendamento
      case 'listTiposAgendamento': {
        const { data, error } = await supabase
          .from('catalogo_tipos_agendamento')
          .select('id, codigo, nome')
          .eq('ativo', true)
          .order('nome', { ascending: true });
        
        if (error) throw error;
        
        return new Response(
          JSON.stringify({ success: true, tipos: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'addTipoAgendamento': {
        if (!codigo || !nome) {
          throw new Error('Código e nome são obrigatórios');
        }

        const { data: existing } = await supabase
          .from('catalogo_tipos_agendamento')
          .select('codigo')
          .eq('codigo', codigo)
          .single();

        if (existing) {
          throw new Error('Código já existe');
        }

        const { data, error } = await supabase
          .from('catalogo_tipos_agendamento')
          .insert({ codigo, nome, ativo: true })
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
        if (!tipoId) {
          throw new Error('ID do tipo é obrigatório');
        }

        const updateData: any = {};
        if (codigo !== undefined) updateData.codigo = codigo;
        if (nome !== undefined) updateData.nome = nome;

        const { data, error } = await supabase
          .from('catalogo_tipos_agendamento')
          .update(updateData)
          .eq('id', tipoId)
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
        if (!tipoId) {
          throw new Error('ID do tipo é obrigatório');
        }

        const { error } = await supabase
          .from('catalogo_tipos_agendamento')
          .update({ ativo: false })
          .eq('id', tipoId);

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
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
