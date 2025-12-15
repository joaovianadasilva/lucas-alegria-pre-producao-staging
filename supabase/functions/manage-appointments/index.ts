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
          representanteVendas,
          codigoCliente,
          usuarioId
        } = requestBody;

        console.log('Creating appointment:', { tipo, dataAgendamento, slotNumero, codigoCliente });

        // Validar tipo consultando o catálogo
        const { data: tiposData, error: tiposError } = await supabase
          .from('catalogo_tipos_agendamento')
          .select('codigo')
          .eq('ativo', true);

        if (tiposError) {
          console.error('Error fetching tipos:', tiposError);
          throw new Error('Erro ao validar tipo de agendamento');
        }

        const tiposValidos = tiposData?.map(t => t.codigo) || [];
        if (!tiposValidos.includes(tipo)) {
          throw new Error('Tipo de agendamento inválido');
        }

        // Verificar disponibilidade do slot na nova tabela
        const { data: slotData, error: slotError } = await supabase
          .from('slots')
          .select('*')
          .eq('data_disponivel', dataAgendamento)
          .eq('slot_numero', slotNumero)
          .maybeSingle();

        if (slotError) {
          console.error('Slot error:', slotError);
          throw new Error('Erro ao verificar slot');
        }

        if (!slotData) {
          throw new Error('Slot não existe para esta data');
        }

        // Verificar se slot está livre
        if (slotData.status !== 'disponivel') {
          if (slotData.status === 'bloqueado') {
            throw new Error('Slot bloqueado');
          }
          throw new Error('Slot já ocupado');
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
            codigo_cliente: codigoCliente,
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

        // Atualizar slot com UUID do agendamento e status ocupado
        const { error: slotUpdateError } = await supabase
          .from('slots')
          .update({ 
            status: 'ocupado',
            agendamento_id: agendamentoData.id 
          })
          .eq('data_disponivel', dataAgendamento)
          .eq('slot_numero', slotNumero);

        if (slotUpdateError) {
          console.error('Slot update error:', slotUpdateError);
          await supabase.from('agendamentos').delete().eq('id', agendamentoData.id);
          throw new Error(`Erro ao atualizar slot: ${slotUpdateError.message}`);
        }

        // Registrar histórico de criação do agendamento
        if (usuarioId) {
          await supabase.from('historico_edicoes_agendamentos').insert({
            agendamento_id: agendamentoData.id,
            campo_alterado: 'criacao',
            valor_anterior: null,
            valor_novo: 'Agendamento criado',
            usuario_id: usuarioId
          });
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
          confirmacao,
          tecnicoId,
          dataInicio,
          dataFim
        } = requestBody;

        console.log('Listing appointments with filters:', { status, tipo, confirmacao, tecnicoId, dataInicio, dataFim });

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
        if (confirmacao) query = query.eq('confirmacao', confirmacao);
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
        const { agendamentoId, updates, usuarioId } = requestBody;

        if (!agendamentoId) {
          throw new Error('ID do agendamento é obrigatório');
        }

        // Validar tipo se presente - buscar do catálogo
        if (updates.tipo) {
          const { data: tiposData, error: tiposError } = await supabase
            .from('catalogo_tipos_agendamento')
            .select('codigo')
            .eq('ativo', true);

          if (tiposError) {
            console.error('Error fetching tipos:', tiposError);
            throw new Error('Erro ao validar tipo de agendamento');
          }

          const tiposValidos = tiposData?.map(t => t.codigo) || [];
          if (!tiposValidos.includes(updates.tipo)) {
            throw new Error('Tipo de agendamento inválido');
          }
        }

        // Validar confirmacao se presente
        if (updates.confirmacao) {
          const confirmacoesValidas = ['confirmado', 'pre-agendado', 'cancelado'];
          if (!confirmacoesValidas.includes(updates.confirmacao)) {
            throw new Error('Valor de confirmação inválido');
          }
        }

        // Buscar dados atuais ANTES do update para comparar
        const { data: dadosAtuais, error: fetchError } = await supabase
          .from('agendamentos')
          .select('tipo, status, confirmacao, tecnico_responsavel_id, origem, representante_vendas, rede, observacao, codigo_cliente')
          .eq('id', agendamentoId)
          .single();

        if (fetchError) {
          console.error('Erro ao buscar dados atuais:', fetchError);
          throw new Error('Erro ao buscar agendamento');
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

        // Registrar histórico para cada campo alterado
        const camposParaVerificar = ['tipo', 'status', 'confirmacao', 'tecnico_responsavel_id', 'origem', 'representante_vendas', 'rede', 'observacao', 'codigo_cliente'];
        
        for (const campo of camposParaVerificar) {
          const valorAntigo = (dadosAtuais as any)[campo];
          const valorNovo = (updates as any)[campo];
          
          // Só registra se o campo foi enviado no update E é diferente do valor anterior
          if (valorNovo !== undefined && String(valorAntigo || 'null') !== String(valorNovo || 'null')) {
            console.log(`Campo ${campo} alterado: ${valorAntigo} -> ${valorNovo}`);
            
            const { error: histError } = await supabase
              .from('historico_edicoes_agendamentos')
              .insert({
                agendamento_id: agendamentoId,
                campo_alterado: campo,
                valor_anterior: valorAntigo?.toString() || null,
                valor_novo: valorNovo?.toString() || null,
                usuario_id: usuarioId || null
              });
            
            if (histError) {
              console.error(`Erro ao registrar histórico de ${campo}:`, histError);
            }
          }
        }

        return new Response(
          JSON.stringify({ success: true, agendamento: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getEditHistory': {
        const { agendamentoId } = requestBody;
        
        if (!agendamentoId) {
          throw new Error('ID do agendamento é obrigatório');
        }

        console.log('Fetching edit history for:', agendamentoId);

        // Buscar histórico de edições genéricas
        const { data: historicoEdicoes, error: histEdicoesError } = await supabase
          .from('historico_edicoes_agendamentos')
          .select(`
            id,
            campo_alterado,
            valor_anterior,
            valor_novo,
            created_at,
            usuario:profiles(id, nome, sobrenome)
          `)
          .eq('agendamento_id', agendamentoId)
          .order('created_at', { ascending: false });

        if (histEdicoesError) {
          console.error('Erro ao buscar histórico de edições:', histEdicoesError);
          throw histEdicoesError;
        }

        // Buscar histórico de reagendamentos (tabela separada)
        const { data: historicoReagendamentos, error: histReagendError } = await supabase
          .from('historico_reagendamentos')
          .select(`
            id,
            data_anterior,
            slot_anterior,
            data_nova,
            slot_novo,
            motivo,
            created_at,
            usuario:profiles(id, nome, sobrenome)
          `)
          .eq('agendamento_id', agendamentoId)
          .order('created_at', { ascending: false });

        if (histReagendError) {
          console.error('Erro ao buscar histórico de reagendamentos:', histReagendError);
          throw histReagendError;
        }

        console.log('Edit history fetched:', {
          edicoes: historicoEdicoes?.length || 0,
          reagendamentos: historicoReagendamentos?.length || 0
        });

        return new Response(
          JSON.stringify({ 
            success: true, 
            edicoes: historicoEdicoes || [],
            reagendamentos: historicoReagendamentos || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancelAppointment': {
        const { agendamentoId, usuarioId } = requestBody;

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

        const statusAnterior = agendamento.status;

        // Atualizar status para cancelado
        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ status: 'cancelado' })
          .eq('id', agendamentoId);

        if (updateError) {
          console.error('Cancel error:', updateError);
          throw updateError;
        }

        // Registrar no histórico
        if (statusAnterior !== 'cancelado') {
          const { error: histError } = await supabase
            .from('historico_edicoes_agendamentos')
            .insert({
              agendamento_id: agendamentoId,
              campo_alterado: 'status',
              valor_anterior: statusAnterior,
              valor_novo: 'cancelado',
              usuario_id: usuarioId || null
            });
          
          if (histError) {
            console.error('Erro ao registrar histórico de cancelamento:', histError);
          }
        }

        // Liberar slot
        const { error: slotError } = await supabase
          .from('slots')
          .update({ 
            status: 'disponivel',
            agendamento_id: null 
          })
          .eq('data_disponivel', agendamento.data_agendamento)
          .eq('slot_numero', agendamento.slot_numero);

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
          .from('slots')
          .select('*')
          .eq('data_disponivel', novaData)
          .eq('slot_numero', novoSlot)
          .maybeSingle();

        if (novoSlotError) {
          console.error('Novo slot error:', novoSlotError);
          throw new Error('Erro ao verificar novo slot');
        }

        if (!novoSlotData) {
          throw new Error('Slot não existe para a nova data');
        }

        if (novoSlotData.status !== 'disponivel') {
          if (novoSlotData.status === 'bloqueado') {
            throw new Error('Novo slot está bloqueado');
          }
          throw new Error('Novo slot já está ocupado');
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
        const { error: liberarSlotError } = await supabase
          .from('slots')
          .update({ 
            status: 'disponivel',
            agendamento_id: null 
          })
          .eq('data_disponivel', dataAnterior)
          .eq('slot_numero', slotAnterior);

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
          .from('slots')
          .update({ 
            status: 'ocupado',
            agendamento_id: agendamentoId 
          })
          .eq('data_disponivel', novaData)
          .eq('slot_numero', novoSlot);

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
