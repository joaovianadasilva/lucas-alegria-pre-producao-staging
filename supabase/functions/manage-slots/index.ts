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
    const { action, data: requestData } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case 'getDatesAndSlots': {
        const { data, error } = await supabase
          .from('slots_disponiveis')
          .select('*')
          .order('data_disponivel', { ascending: true });
        
        if (error) throw error;

        // Transformar para o formato esperado pelo frontend
        const datesWithSlots: { [key: string]: { [key: number]: string } } = {};
        
        for (const row of data || []) {
          const date = row.data_disponivel;
          datesWithSlots[date] = {};
          
          for (let i = 1; i <= 10; i++) {
            const slotValue = row[`slot_${i}`];
            datesWithSlots[date][i] = slotValue || '';
          }
        }

        return new Response(
          JSON.stringify({ success: true, data: datesWithSlots }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createSlotDate': {
        const { dataDisponivel } = requestData;
        
        if (!dataDisponivel) {
          throw new Error('Data é obrigatória');
        }

        // Criar data com todos os slots vazios (disponíveis)
        const { data, error } = await supabase
          .from('slots_disponiveis')
          .insert({
            data_disponivel: dataDisponivel,
            slot_1: null,
            slot_2: null,
            slot_3: null,
            slot_4: null,
            slot_5: null,
            slot_6: null,
            slot_7: null,
            slot_8: null,
            slot_9: null,
            slot_10: null,
          })
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateSlot': {
        const { dataDisponivel, slotNumero, valor } = requestData;
        
        if (!dataDisponivel || !slotNumero) {
          throw new Error('Data e slot são obrigatórios');
        }

        const slotColumn = `slot_${slotNumero}`;
        
        const { error } = await supabase
          .from('slots_disponiveis')
          .update({ [slotColumn]: valor })
          .eq('data_disponivel', dataDisponivel);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'blockSlot': {
        const { dataDisponivel, slotNumero } = requestData;
        
        if (!dataDisponivel || !slotNumero) {
          throw new Error('Data e slot são obrigatórios');
        }

        const slotColumn = `slot_${slotNumero}`;
        
        const { error } = await supabase
          .from('slots_disponiveis')
          .update({ [slotColumn]: '-' })
          .eq('data_disponivel', dataDisponivel);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'releaseSlot': {
        const { dataDisponivel, slotNumero } = requestData;
        
        if (!dataDisponivel || !slotNumero) {
          throw new Error('Data e slot são obrigatórios');
        }

        const slotColumn = `slot_${slotNumero}`;
        
        const { error } = await supabase
          .from('slots_disponiveis')
          .update({ [slotColumn]: null })
          .eq('data_disponivel', dataDisponivel);

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
