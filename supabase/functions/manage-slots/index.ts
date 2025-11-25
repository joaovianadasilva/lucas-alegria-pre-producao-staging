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

    console.log(`[manage-slots] Action: ${action}`, requestData);

    switch (action) {
      case 'getCalendarSlots': {
        const { dataInicio, dataFim } = requestData;
        
        if (!dataInicio || !dataFim) {
          throw new Error('Data início e fim são obrigatórias');
        }

        const { data: slots, error } = await supabase
          .from('slots')
          .select(`
            *,
            agendamentos(
              id,
              nome_cliente,
              email_cliente,
              tipo,
              status,
              confirmacao
            )
          `)
          .gte('data_disponivel', dataInicio)
          .lte('data_disponivel', dataFim)
          .order('data_disponivel', { ascending: true })
          .order('slot_numero', { ascending: true });
        
        if (error) throw error;

        // Agrupar slots por data
        const slotsByDate: { [key: string]: any[] } = {};
        
        for (const slot of slots || []) {
          const date = slot.data_disponivel;
          if (!slotsByDate[date]) {
            slotsByDate[date] = [];
          }
          slotsByDate[date].push(slot);
        }

        console.log(`[manage-slots] Found ${slots?.length || 0} slots between ${dataInicio} and ${dataFim}`);

        return new Response(
          JSON.stringify({ success: true, data: slotsByDate }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createSlotsInBulk': {
        const { dataDisponivel, quantidade } = requestData;
        
        if (!dataDisponivel || !quantidade) {
          throw new Error('Data e quantidade são obrigatórias');
        }

        if (quantidade < 1 || quantidade > 50) {
          throw new Error('Quantidade deve estar entre 1 e 50');
        }

        // Validar limite de 30 dias
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() + 30);
        const dataSelecionada = new Date(dataDisponivel);
        
        if (dataSelecionada > dataLimite) {
          throw new Error('Não é possível criar slots para mais de 30 dias no futuro');
        }

        if (dataSelecionada < new Date(new Date().setHours(0, 0, 0, 0))) {
          throw new Error('Não é possível criar slots para datas passadas');
        }

        // Buscar o maior slot_numero existente para essa data
        const { data: maxSlot, error: maxError } = await supabase
          .from('slots')
          .select('slot_numero')
          .eq('data_disponivel', dataDisponivel)
          .order('slot_numero', { ascending: false })
          .limit(1)
          .maybeSingle();

        const startSlotNumero = (maxSlot?.slot_numero || 0) + 1;

        // Criar array de novos slots
        const newSlots = Array.from({ length: quantidade }, (_, i) => ({
          data_disponivel: dataDisponivel,
          slot_numero: startSlotNumero + i,
          status: 'disponivel'
        }));

        const { data: created, error } = await supabase
          .from('slots')
          .insert(newSlots)
          .select();

        if (error) throw error;

        console.log(`[manage-slots] Created ${quantidade} slots for ${dataDisponivel}`);

        return new Response(
          JSON.stringify({ success: true, data: created }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateSlotStatus': {
        const { slotId, status } = requestData;
        
        if (!slotId || !status) {
          throw new Error('Slot ID e status são obrigatórios');
        }

        if (!['disponivel', 'bloqueado'].includes(status)) {
          throw new Error('Status inválido. Use "disponivel" ou "bloqueado"');
        }

        // Verificar se o slot existe e não está ocupado
        const { data: slot, error: checkError } = await supabase
          .from('slots')
          .select('status')
          .eq('id', slotId)
          .single();

        if (checkError) throw checkError;

        if (slot.status === 'ocupado') {
          throw new Error('Não é possível alterar status de slot ocupado');
        }

        const { error } = await supabase
          .from('slots')
          .update({ status, agendamento_id: null })
          .eq('id', slotId);

        if (error) throw error;

        console.log(`[manage-slots] Updated slot ${slotId} to status ${status}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deleteSlot': {
        const { slotId } = requestData;
        
        if (!slotId) {
          throw new Error('Slot ID é obrigatório');
        }

        // Verificar se slot não está ocupado
        const { data: slot, error: checkError } = await supabase
          .from('slots')
          .select('status')
          .eq('id', slotId)
          .single();

        if (checkError) throw checkError;

        if (slot.status === 'ocupado') {
          throw new Error('Não é possível deletar slot ocupado');
        }

        const { error } = await supabase
          .from('slots')
          .delete()
          .eq('id', slotId);

        if (error) throw error;

        console.log(`[manage-slots] Deleted slot ${slotId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getSlotsStats': {
        const { data: stats, error } = await supabase
          .rpc('get_slots_statistics');

        if (error) throw error;

        console.log('[manage-slots] Retrieved slots statistics');

        return new Response(
          JSON.stringify({ success: true, data: stats }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Manter compatibilidade com código antigo
      case 'getDatesAndSlots': {
        // Redirecionar para getCalendarSlots com período de 60 dias
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 60);

        const dataInicio = today.toISOString().split('T')[0];
        const dataFim = futureDate.toISOString().split('T')[0];

        const { data: slots, error } = await supabase
          .from('slots')
          .select('*')
          .gte('data_disponivel', dataInicio)
          .lte('data_disponivel', dataFim)
          .order('data_disponivel', { ascending: true })
          .order('slot_numero', { ascending: true });
        
        if (error) throw error;

        // Converter para formato antigo para compatibilidade
        const datesWithSlots: { [key: string]: { [key: number]: string | null } } = {};
        
        for (const slot of slots || []) {
          const date = slot.data_disponivel;
          if (!datesWithSlots[date]) {
            datesWithSlots[date] = {};
          }
          
          datesWithSlots[date][slot.slot_numero] = 
            slot.status === 'disponivel' ? null :
            slot.status === 'bloqueado' ? '-' :
            slot.agendamento_id;
        }

        return new Response(
          JSON.stringify({ success: true, data: datesWithSlots }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        throw new Error(`Ação inválida: ${action}`);
    }
  } catch (error) {
    console.error('[manage-slots] Error:', error);
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
