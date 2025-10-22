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
    const { action, codigo, nome, valor } = await req.json();
    
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
