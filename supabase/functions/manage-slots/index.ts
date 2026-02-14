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
    const { action, data: requestData, provedorId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!provedorId) {
      throw new Error('provedorId é obrigatório');
    }

    console.log(`[manage-slots] Action: ${action} provedorId: ${provedorId}`, requestData);

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
            agendamentos(id, nome_cliente, email_cliente, tipo, status, confirmacao)
          `)
          .eq('provedor_id', provedorId)
          .gte('data_disponivel', dataInicio)
          .lte('data_disponivel', dataFim)
          .order('data_disponivel', { ascending: true })
          .order('slot_numero', { ascending: true });
        
        if (error) throw error;

        const slotsByDate: { [key: string]: any[] } = {};
        for (const slot of slots || []) {
          const date = slot.data_disponivel;
          if (!slotsByDate[date]) slotsByDate[date] = [];
          slotsByDate[date].push(slot);
        }

        return new Response(
          JSON.stringify({ success: true, data: slotsByDate }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'createSlotsInBulk': {
        const { dataDisponivel, quantidade } = requestData;
        
        if (!dataDisponivel || !quantidade) throw new Error('Data e quantidade são obrigatórias');
        if (quantidade < 1 || quantidade > 50) throw new Error('Quantidade deve estar entre 1 e 50');

        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() + 30);
        const dataSelecionada = new Date(dataDisponivel);
        
        if (dataSelecionada > dataLimite) throw new Error('Não é possível criar slots para mais de 30 dias no futuro');
        if (dataSelecionada < new Date(new Date().setHours(0, 0, 0, 0))) throw new Error('Não é possível criar slots para datas passadas');

        const { data: maxSlot } = await supabase
          .from('slots')
          .select('slot_numero')
          .eq('data_disponivel', dataDisponivel)
          .eq('provedor_id', provedorId)
          .order('slot_numero', { ascending: false })
          .limit(1)
          .maybeSingle();

        const startSlotNumero = (maxSlot?.slot_numero || 0) + 1;

        const newSlots = Array.from({ length: quantidade }, (_, i) => ({
          data_disponivel: dataDisponivel,
          slot_numero: startSlotNumero + i,
          status: 'disponivel',
          provedor_id: provedorId
        }));

        const { data: created, error } = await supabase
          .from('slots')
          .insert(newSlots)
          .select();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, data: created }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateSlotStatus': {
        const { slotId, status } = requestData;
        
        if (!slotId || !status) throw new Error('Slot ID e status são obrigatórios');
        if (!['disponivel', 'bloqueado'].includes(status)) throw new Error('Status inválido');

        const { data: slot, error: checkError } = await supabase
          .from('slots')
          .select('status')
          .eq('id', slotId)
          .eq('provedor_id', provedorId)
          .single();

        if (checkError) throw checkError;
        if (slot.status === 'ocupado') throw new Error('Não é possível alterar status de slot ocupado');

        const { error } = await supabase
          .from('slots')
          .update({ status, agendamento_id: null })
          .eq('id', slotId)
          .eq('provedor_id', provedorId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'deleteSlot': {
        const { slotId } = requestData;
        if (!slotId) throw new Error('Slot ID é obrigatório');

        const { data: slot, error: checkError } = await supabase
          .from('slots')
          .select('status')
          .eq('id', slotId)
          .eq('provedor_id', provedorId)
          .single();

        if (checkError) throw checkError;
        if (slot.status === 'ocupado') throw new Error('Não é possível deletar slot ocupado');

        const { error } = await supabase
          .from('slots')
          .delete()
          .eq('id', slotId)
          .eq('provedor_id', provedorId);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getSlotsStats': {
        // Stats filtradas por provedor
        const today = new Date().toISOString().split('T')[0];
        const thirtyDays = new Date();
        thirtyDays.setDate(thirtyDays.getDate() + 30);
        const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

        const { data: slots, error } = await supabase
          .from('slots')
          .select('status, data_disponivel')
          .eq('provedor_id', provedorId)
          .gte('data_disponivel', today)
          .lte('data_disponivel', thirtyDaysStr);

        if (error) throw error;

        const stats = {
          total_disponiveis: slots?.filter(s => s.status === 'disponivel').length || 0,
          total_ocupados: slots?.filter(s => s.status === 'ocupado').length || 0,
          total_bloqueados: slots?.filter(s => s.status === 'bloqueado').length || 0,
        };

        return new Response(
          JSON.stringify({ success: true, data: stats }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getDatesAndSlots': {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 60);

        const dataInicio = today.toISOString().split('T')[0];
        const dataFim = futureDate.toISOString().split('T')[0];

        const { data: slots, error } = await supabase
          .from('slots')
          .select('*')
          .eq('provedor_id', provedorId)
          .gte('data_disponivel', dataInicio)
          .lte('data_disponivel', dataFim)
          .order('data_disponivel', { ascending: true })
          .order('slot_numero', { ascending: true });
        
        if (error) throw error;

        const datesWithSlots: { [key: string]: { [key: number]: string | null } } = {};
        for (const slot of slots || []) {
          const date = slot.data_disponivel;
          if (!datesWithSlots[date]) datesWithSlots[date] = {};
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
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})