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
    const { action, provedorId } = requestBody;
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!provedorId) {
      throw new Error('provedorId é obrigatório');
    }

    console.log(`=== MANAGE-APPOINTMENTS: Action=${action} provedorId=${provedorId} ===`);

    switch (action) {
      case 'createAppointment': {
        const {
          tipo, dataAgendamento, slotNumero, nomeCliente, emailCliente,
          telefoneCliente, tecnicoResponsavelId, observacao, origem,
          representanteVendas, codigoCliente, usuarioId
        } = requestBody;

        // Validar tipo
        const { data: tiposData, error: tiposError } = await supabase
          .from('catalogo_tipos_agendamento')
          .select('codigo')
          .eq('ativo', true)
          .eq('provedor_id', provedorId);

        if (tiposError) throw new Error('Erro ao validar tipo de agendamento');

        const tiposValidos = tiposData?.map(t => t.codigo) || [];
        if (!tiposValidos.includes(tipo)) {
          throw new Error('Tipo de agendamento inválido');
        }

        // Verificar slot
        const { data: slotData, error: slotError } = await supabase
          .from('slots')
          .select('*')
          .eq('data_disponivel', dataAgendamento)
          .eq('slot_numero', slotNumero)
          .eq('provedor_id', provedorId)
          .maybeSingle();

        if (slotError) throw new Error('Erro ao verificar slot');
        if (!slotData) throw new Error('Slot não existe para esta data');
        if (slotData.status !== 'disponivel') {
          throw new Error(slotData.status === 'bloqueado' ? 'Slot bloqueado' : 'Slot já ocupado');
        }

        // Criar agendamento
        const { data: agendamentoData, error: agendamentoError } = await supabase
          .from('agendamentos')
          .insert({
            provedor_id: provedorId,
            tipo, data_agendamento: dataAgendamento, slot_numero: slotNumero,
            nome_cliente: nomeCliente, email_cliente: emailCliente,
            telefone_cliente: telefoneCliente, tecnico_responsavel_id: tecnicoResponsavelId,
            observacao, origem, representante_vendas: representanteVendas,
            codigo_cliente: codigoCliente, status: 'pendente', confirmacao: 'pre-agendado',
            contrato_id: null
          })
          .select()
          .single();

        if (agendamentoError) throw new Error(`Erro ao criar agendamento: ${agendamentoError.message}`);

        // Atualizar slot
        const { error: slotUpdateError } = await supabase
          .from('slots')
          .update({ status: 'ocupado', agendamento_id: agendamentoData.id })
          .eq('data_disponivel', dataAgendamento)
          .eq('slot_numero', slotNumero)
          .eq('provedor_id', provedorId);

        if (slotUpdateError) {
          await supabase.from('agendamentos').delete().eq('id', agendamentoData.id);
          throw new Error(`Erro ao atualizar slot: ${slotUpdateError.message}`);
        }

        // Histórico
        if (usuarioId) {
          await supabase.from('historico_edicoes_agendamentos').insert({
            agendamento_id: agendamentoData.id,
            provedor_id: provedorId,
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
        const { limit = 50, offset = 0, status, tipo, confirmacao, tecnicoId, dataInicio, dataFim } = requestBody;

        let query = supabase
          .from('agendamentos')
          .select(`
            *,
            tecnico:profiles!tecnico_responsavel_id(id, nome, sobrenome, telefone),
            contrato:contratos(id, plano_nome, codigo_cliente)
          `, { count: 'exact' })
          .eq('provedor_id', provedorId)
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
        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, agendamentos: data, total: count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateAppointment': {
        const { agendamentoId, updates, usuarioId } = requestBody;
        if (!agendamentoId) throw new Error('ID do agendamento é obrigatório');

        if (updates.tipo) {
          const { data: tiposData } = await supabase
            .from('catalogo_tipos_agendamento')
            .select('codigo')
            .eq('ativo', true)
            .eq('provedor_id', provedorId);
          const tiposValidos = tiposData?.map(t => t.codigo) || [];
          if (!tiposValidos.includes(updates.tipo)) throw new Error('Tipo de agendamento inválido');
        }

        if (updates.confirmacao) {
          const confirmacoesValidas = ['confirmado', 'pre-agendado', 'cancelado'];
          if (!confirmacoesValidas.includes(updates.confirmacao)) throw new Error('Valor de confirmação inválido');
        }

        const { data: dadosAtuais, error: fetchError } = await supabase
          .from('agendamentos')
          .select('tipo, status, confirmacao, tecnico_responsavel_id, origem, representante_vendas, rede, observacao, codigo_cliente')
          .eq('id', agendamentoId)
          .eq('provedor_id', provedorId)
          .single();

        if (fetchError) throw new Error('Erro ao buscar agendamento');

        const { data, error } = await supabase
          .from('agendamentos')
          .update(updates)
          .eq('id', agendamentoId)
          .eq('provedor_id', provedorId)
          .select()
          .single();

        if (error) throw error;

        // Histórico
        const camposParaVerificar = ['tipo', 'status', 'confirmacao', 'tecnico_responsavel_id', 'origem', 'representante_vendas', 'rede', 'observacao', 'codigo_cliente'];
        for (const campo of camposParaVerificar) {
          const valorAntigo = (dadosAtuais as any)[campo];
          const valorNovo = (updates as any)[campo];
          if (valorNovo !== undefined && String(valorAntigo || 'null') !== String(valorNovo || 'null')) {
            await supabase.from('historico_edicoes_agendamentos').insert({
              agendamento_id: agendamentoId,
              provedor_id: provedorId,
              campo_alterado: campo,
              valor_anterior: valorAntigo?.toString() || null,
              valor_novo: valorNovo?.toString() || null,
              usuario_id: usuarioId || null
            });
          }
        }

        return new Response(
          JSON.stringify({ success: true, agendamento: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getEditHistory': {
        const { agendamentoId } = requestBody;
        if (!agendamentoId) throw new Error('ID do agendamento é obrigatório');

        const { data: historicoEdicoes, error: histEdicoesError } = await supabase
          .from('historico_edicoes_agendamentos')
          .select(`id, campo_alterado, valor_anterior, valor_novo, created_at, usuario:profiles(id, nome, sobrenome)`)
          .eq('agendamento_id', agendamentoId)
          .eq('provedor_id', provedorId)
          .order('created_at', { ascending: false });

        if (histEdicoesError) throw histEdicoesError;

        const { data: historicoReagendamentos, error: histReagendError } = await supabase
          .from('historico_reagendamentos')
          .select(`id, data_anterior, slot_anterior, data_nova, slot_novo, motivo, created_at, usuario:profiles(id, nome, sobrenome)`)
          .eq('agendamento_id', agendamentoId)
          .eq('provedor_id', provedorId)
          .order('created_at', { ascending: false });

        if (histReagendError) throw histReagendError;

        return new Response(
          JSON.stringify({ success: true, edicoes: historicoEdicoes || [], reagendamentos: historicoReagendamentos || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'cancelAppointment': {
        const { agendamentoId, usuarioId } = requestBody;

        const { data: agendamento, error: fetchError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('id', agendamentoId)
          .eq('provedor_id', provedorId)
          .single();

        if (fetchError || !agendamento) throw new Error('Agendamento não encontrado');

        const statusAnterior = agendamento.status;

        const { error: updateError } = await supabase
          .from('agendamentos')
          .update({ status: 'cancelado' })
          .eq('id', agendamentoId)
          .eq('provedor_id', provedorId);

        if (updateError) throw updateError;

        if (statusAnterior !== 'cancelado') {
          await supabase.from('historico_edicoes_agendamentos').insert({
            agendamento_id: agendamentoId,
            provedor_id: provedorId,
            campo_alterado: 'status',
            valor_anterior: statusAnterior,
            valor_novo: 'cancelado',
            usuario_id: usuarioId || null
          });
        }

        // Liberar slot
        const { data: slotToRelease } = await supabase
          .from('slots')
          .select('id')
          .eq('agendamento_id', agendamentoId)
          .eq('provedor_id', provedorId)
          .single();

        if (slotToRelease) {
          await supabase
            .from('slots')
            .update({ status: 'disponivel', agendamento_id: null })
            .eq('id', slotToRelease.id);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'rescheduleAppointment': {
        const { agendamentoId, novaData, novoSlot, motivo, usuarioId } = requestBody;

        const { data: agendamento, error: getError } = await supabase
          .from('agendamentos')
          .select('*')
          .eq('id', agendamentoId)
          .eq('provedor_id', provedorId)
          .single();

        if (getError || !agendamento) throw new Error('Agendamento não encontrado');
        if (agendamento.status === 'cancelado') throw new Error('Não é possível reagendar um agendamento cancelado');

        const dataAnterior = agendamento.data_agendamento;
        const slotAnterior = agendamento.slot_numero;

        if (dataAnterior === novaData && slotAnterior === novoSlot) {
          throw new Error('Selecione uma data/horário diferente do atual');
        }

        const { data: novoSlotData, error: novoSlotError } = await supabase
          .from('slots')
          .select('*')
          .eq('data_disponivel', novaData)
          .eq('slot_numero', novoSlot)
          .eq('provedor_id', provedorId)
          .maybeSingle();

        if (novoSlotError) throw new Error('Erro ao verificar novo slot');
        if (!novoSlotData) throw new Error('Slot não existe para a nova data');
        if (novoSlotData.status !== 'disponivel') {
          throw new Error(novoSlotData.status === 'bloqueado' ? 'Novo slot está bloqueado' : 'Novo slot já está ocupado');
        }

        // Histórico
        await supabase.from('historico_reagendamentos').insert({
          agendamento_id: agendamentoId,
          provedor_id: provedorId,
          data_anterior: dataAnterior,
          slot_anterior: slotAnterior,
          data_nova: novaData,
          slot_novo: novoSlot,
          motivo: motivo || null,
          usuario_id: usuarioId || null
        });

        // Liberar slot antigo
        await supabase
          .from('slots')
          .update({ status: 'disponivel', agendamento_id: null })
          .eq('data_disponivel', dataAnterior)
          .eq('slot_numero', slotAnterior)
          .eq('provedor_id', provedorId);

        // Atualizar agendamento
        await supabase
          .from('agendamentos')
          .update({ data_agendamento: novaData, slot_numero: novoSlot, status: 'reprogramado', updated_at: new Date().toISOString() })
          .eq('id', agendamentoId)
          .eq('provedor_id', provedorId);

        // Ocupar novo slot
        await supabase
          .from('slots')
          .update({ status: 'ocupado', agendamento_id: agendamentoId })
          .eq('data_disponivel', novaData)
          .eq('slot_numero', novoSlot)
          .eq('provedor_id', provedorId);

        return new Response(
          JSON.stringify({ success: true, message: 'Agendamento reagendado com sucesso', agendamento: { id: agendamentoId, data_agendamento: novaData, slot_numero: novoSlot } }),
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