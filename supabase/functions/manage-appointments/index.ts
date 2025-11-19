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
          observacao,
          origem,
          representanteVendas
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
            observacao,
            origem,
            representante_vendas: representanteVendas,
            status: 'pendente',
            confirmacao: 'pre-agendado',
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
            contrato:contratos(id, plano_nome, codigo_cliente)
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

        // Validar confirmacao se presente
        if (updates.confirmacao) {
          const confirmacoesValidas = ['confirmado', 'pre-agendado', 'cancelado'];
          if (!confirmacoesValidas.includes(updates.confirmacao)) {
            throw new Error('Valor de confirmação inválido');
          }
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

      case 'rescheduleAppointment': {
        const { agendamentoId, novaData, novoSlot, motivo, usuarioId } = requestBody;

        console.log('Rescheduling appointment:', agendamentoId, 'to', novaData, 'slot', novoSlot);

        // 1. Buscar agendamento atual
        const { data: agendamento, error: getError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('id', agendamentoId)
          .single();

        if (getError || !agendamento) {
          console.error('Fetch error:', getError);
          throw new Error('Agendamento não encontrado');
        }

        // Validar que não está cancelado
        if (agendamento.status === 'cancelado') {
          throw new Error('Não é possível reagendar um agendamento cancelado');
        }

        const dataAnterior = agendamento.data_agendamento;
        const slotAnterior = agendamento.slot_numero;

        // Validar que não está reagendando para o mesmo slot
        if (dataAnterior === novaData && slotAnterior === novoSlot) {
          throw new Error('Selecione uma data/horário diferente do atual');
        }

        // 2. Validar novo slot está disponível
        const { data: novoSlotData, error: novoSlotError } = await supabase
          .from('slots_disponiveis')
          .select('*')
          .eq('data_disponivel', novaData)
          .single();

        if (novoSlotError || !novoSlotData) {
          console.error('Novo slot error:', novoSlotError);
          throw new Error('Nova data não disponível no sistema');
        }

        const novoSlotColumn = `slot_${novoSlot}`;
        const novoSlotValue = novoSlotData[novoSlotColumn];

        if (novoSlotValue && novoSlotValue.trim() !== '' && novoSlotValue !== '-') {
          throw new Error('Novo horário já está ocupado');
        }

        if (novoSlotValue === '-') {
          throw new Error('Novo horário está bloqueado');
        }

        // 3. Registrar no histórico
        const { error: historicoError } = await supabase
          .from('historico_reagendamentos')
          .insert({
            agendamento_id: agendamentoId,
            data_anterior: dataAnterior,
            slot_anterior: slotAnterior,
            data_nova: novaData,
            slot_novo: novoSlot,
            motivo: motivo || null,
            usuario_id: usuarioId || null
          });

        if (historicoError) {
          console.error('Erro ao registrar histórico:', historicoError);
          throw new Error('Erro ao registrar histórico de reagendamento');
        }

        console.log('Histórico registrado com sucesso');

        // 4. Liberar slot antigo
        const slotAntigoColumn = `slot_${slotAnterior}`;
        const { error: liberarSlotError } = await supabase
          .from('slots_disponiveis')
          .update({ [slotAntigoColumn]: null })
          .eq('data_disponivel', dataAnterior);

        if (liberarSlotError) {
          console.error('Erro ao liberar slot antigo:', liberarSlotError);
          throw new Error('Erro ao liberar horário anterior');
        }

        console.log('Slot antigo liberado');

        // 5. Atualizar agendamento
        const { error: atualizarError } = await supabase
          .from('agendamentos')
          .update({
            data_agendamento: novaData,
            slot_numero: novoSlot,
            status: 'reprogramado',
            updated_at: new Date().toISOString()
          })
          .eq('id', agendamentoId);

        if (atualizarError) {
          console.error('Erro ao atualizar agendamento:', atualizarError);
          throw new Error('Erro ao atualizar agendamento');
        }

        console.log('Agendamento atualizado');

        // 6. Ocupar novo slot
        const { error: ocuparSlotError } = await supabase
          .from('slots_disponiveis')
          .update({ [novoSlotColumn]: agendamentoId })
          .eq('data_disponivel', novaData);

        if (ocuparSlotError) {
          console.error('Erro ao ocupar novo slot:', ocuparSlotError);
          throw new Error('Erro ao reservar novo horário');
        }

        console.log('Novo slot ocupado com sucesso');

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Agendamento reagendado com sucesso',
            agendamento: {
              id: agendamentoId,
              data_agendamento: novaData,
              slot_numero: novoSlot
            }
          }),
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
