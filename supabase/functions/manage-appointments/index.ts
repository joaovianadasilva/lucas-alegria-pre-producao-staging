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
    const requestBody = await req.json();
    const { action } = requestBody;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`=== MANAGE-APPOINTMENTS: Action=${action} ===`);

    switch (action) {
      case 'createAppointment': {
        const {
          tipo,
          dataAgendamento,
          slotNumero,
          nomeCliente,
          emailCliente,
          telefoneCliente,
          tecnicoResponsavelId,
          observacao
        } = requestBody;

        console.log('Creating appointment:', { tipo, dataAgendamento, slotNumero });

        // Validar tipo
        const tiposValidos = ['instalacao', 'manutencao', 'visita_tecnica', 'suporte'];
        if (!tiposValidos.includes(tipo)) {
          throw new Error('Tipo de agendamento inválido');
        }

        // Verificar disponibilidade do slot
        const { data: slotData, error: slotError } = await supabase
          .from('slots_disponiveis')
          .select('*')
          .eq('data_disponivel', dataAgendamento)
          .single();

        if (slotError || !slotData) {
          console.error('Slot error:', slotError);
          throw new Error('Data não disponível');
        }

        const slotColumn = `slot_${slotNumero}`;
        const slotValue = slotData[slotColumn];
        
        // Verificar se slot está livre
        if (slotValue && slotValue.trim() !== '' && slotValue !== '-') {
          throw new Error('Slot já ocupado');
        }

        if (slotValue === '-') {
          throw new Error('Slot bloqueado');
        }

        // Criar agendamento
        const { data: agendamentoData, error: agendamentoError } = await supabase
          .from('agendamentos')
          .insert({
            tipo,
            data_agendamento: dataAgendamento,
            slot_numero: slotNumero,
            nome_cliente: nomeCliente,
            email_cliente: emailCliente,
            telefone_cliente: telefoneCliente,
            tecnico_responsavel_id: tecnicoResponsavelId,
            status: 'pendente',
            contrato_id: null
          })
          .select()
          .single();

        if (agendamentoError) {
          console.error('Agendamento error:', agendamentoError);
          throw new Error(`Erro ao criar agendamento: ${agendamentoError.message}`);
        }

        console.log('Agendamento criado:', agendamentoData.id);

        // Atualizar slot com UUID do agendamento
        const { error: slotUpdateError } = await supabase
          .from('slots_disponiveis')
          .update({ [slotColumn]: agendamentoData.id })
          .eq('data_disponivel', dataAgendamento);

        if (slotUpdateError) {
          console.error('Slot update error:', slotUpdateError);
          await supabase.from('agendamentos').delete().eq('id', agendamentoData.id);
          throw new Error(`Erro ao atualizar slot: ${slotUpdateError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true, agendamento: agendamentoData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listAppointments': {
        const { 
          limit = 50, 
          offset = 0, 
          status, 
          tipo, 
          tecnicoId,
          dataInicio,
          dataFim
        } = requestBody;

        console.log('Listing appointments with filters:', { status, tipo, tecnicoId, dataInicio, dataFim });

        let query = supabase
          .from('agendamentos')
          .select(`
            *,
            tecnico:profiles!tecnico_responsavel_id(id, nome, sobrenome, telefone),
            contrato:contratos(id, plano_nome)
          `, { count: 'exact' })
          .order('data_agendamento', { ascending: true })
          .order('slot_numero', { ascending: true })
          .range(offset, offset + limit - 1);

        if (status) query = query.eq('status', status);
        if (tipo) query = query.eq('tipo', tipo);
        if (tecnicoId) query = query.eq('tecnico_responsavel_id', tecnicoId);
        if (dataInicio) query = query.gte('data_agendamento', dataInicio);
        if (dataFim) query = query.lte('data_agendamento', dataFim);

        const { data, error, count } = await query;

        if (error) {
          console.error('List error:', error);
          throw error;
        }

        console.log(`Found ${count} appointments`);

        return new Response(
          JSON.stringify({ success: true, agendamentos: data, total: count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateAppointment': {
        const { agendamentoId, updates } = requestBody;

        if (!agendamentoId) {
          throw new Error('ID do agendamento é obrigatório');
        }

        console.log('Updating appointment:', agendamentoId, updates);

        const { data, error } = await supabase
          .from('agendamentos')
          .update(updates)
          .eq('id', agendamentoId)
          .select()
          .single();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }

        return new Response(
          JSON.stringify({ success: true, agendamento: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancelAppointment': {
        const { agendamentoId } = requestBody;

        console.log('Canceling appointment:', agendamentoId);

        // Buscar agendamento
        const { data: agendamento, error: fetchError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('id', agendamentoId)
          .single();

        if (fetchError || !agendamento) {
          console.error('Fetch error:', fetchError);
          throw new Error('Agendamento não encontrado');
        }

        // Atualizar status para cancelado
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ status: 'cancelado' })
          .eq('id', agendamentoId);

        if (updateError) {
          console.error('Cancel error:', updateError);
          throw updateError;
        }

        // Liberar slot
        const slotColumn = `slot_${agendamento.slot_numero}`;
        const { error: slotError } = await supabase
          .from('slots_disponiveis')
          .update({ [slotColumn]: null })
          .eq('data_disponivel', agendamento.data_agendamento);

        if (slotError) {
          console.error('Erro ao liberar slot:', slotError);
        }

        console.log('Appointment cancelled and slot released');

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
