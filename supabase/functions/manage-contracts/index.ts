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

    switch (action) {
      case 'createContract': {
        const {
          codigoCliente, origem, tipoVenda, representanteVendas, tipoCliente, nomeCompleto, cpf, rg, orgaoExpedicao,
          dataNascimento, telefone, celular, email,
          residenciaRua, residenciaNumero, residenciaBairro, residenciaComplemento,
          residenciaCep, residenciaCidade, residenciaUf,
          instalacaoMesmoEndereco, instalacaoRua, instalacaoNumero, instalacaoBairro,
          instalacaoComplemento, instalacaoCep, instalacaoCidade, instalacaoUf,
          cnpj, razaoSocial, inscricaoEstadual,
          planoContratado, adicionaisContratados, diaVencimento, observacao,
          dataAgendamento, slotAgendamento
        } = requestBody;

        // Extrair código do plano (formato: "[10001] - [Fibra 100MB] - [R$ 79.90]")
        const planoMatch = planoContratado.match(/\[(\d+)\]\s*-\s*\[([^\]]+)\]\s*-\s*\[R\$\s*([\d,.]+)\]/);
        if (!planoMatch) {
          throw new Error('Formato de plano inválido');
        }
        const planoCodigo = planoMatch[1];
        const planoNome = planoMatch[2];
        const planoValor = parseFloat(planoMatch[3].replace(',', '.'));

        // Buscar detalhes do plano no catálogo (para validação)
        const { data: planoData, error: planoError } = await supabase
          .from('catalogo_planos')
          .select('*')
          .eq('codigo', planoCodigo)
          .eq('ativo', true)
          .single();

        if (planoError || !planoData) {
          throw new Error('Plano não encontrado ou inativo');
        }

        // Processar adicionais contratados
        const adicionaisProcessados = [];
        if (adicionaisContratados && adicionaisContratados.length > 0) {
          for (const adicionalStr of adicionaisContratados) {
            const adicionalMatch = adicionalStr.match(/\[(\d+)\]\s*-\s*\[([^\]]+)\]\s*-\s*\[R\$\s*([\d,.]+)\]/);
            if (adicionalMatch) {
              const adicionalCodigo = adicionalMatch[1];
              const adicionalNome = adicionalMatch[2];
              const adicionalValor = parseFloat(adicionalMatch[3].replace(',', '.'));

              // Validar adicional no catálogo
              const { data: adicionalData } = await supabase
                .from('catalogo_adicionais')
                .select('*')
                .eq('codigo', adicionalCodigo)
                .eq('ativo', true)
                .single();

              if (adicionalData) {
                adicionaisProcessados.push({
                  codigo: adicionalCodigo,
                  nome: adicionalNome,
                  valor: adicionalValor
                });
              }
            }
          }
        }

        // Verificar disponibilidade do slot
        const { data: slotData, error: slotError } = await supabase
          .from('slots_disponiveis')
          .select('*')
          .eq('data_disponivel', dataAgendamento)
          .single();

        if (slotError || !slotData) {
          throw new Error('Data de agendamento não encontrada');
        }

        const slotColumn = `slot_${slotAgendamento}`;
        const slotValue = slotData[slotColumn];
        
        if (slotValue && slotValue.trim() !== '') {
          throw new Error('Slot não está disponível');
        }

        // TRANSAÇÃO: Criar contrato + adicionais + agendamento + atualizar slot
        
        // 1. Criar contrato
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .insert({
            codigo_cliente: null,
            origem,
            tipo_venda: tipoVenda,
            representante_vendas: representanteVendas,
            tipo_cliente: tipoCliente,
            nome_completo: nomeCompleto,
            cpf,
            rg,
            orgao_expedicao: orgaoExpedicao,
            data_nascimento: dataNascimento,
            telefone,
            celular,
            email,
            residencia_rua: residenciaRua,
            residencia_numero: residenciaNumero,
            residencia_bairro: residenciaBairro,
            residencia_complemento: residenciaComplemento,
            residencia_cep: residenciaCep,
            residencia_cidade: residenciaCidade,
            residencia_uf: residenciaUf,
            instalacao_mesmo_endereco: instalacaoMesmoEndereco === 'S',
            instalacao_rua: instalacaoRua,
            instalacao_numero: instalacaoNumero,
            instalacao_bairro: instalacaoBairro,
            instalacao_complemento: instalacaoComplemento,
            instalacao_cep: instalacaoCep,
            instalacao_cidade: instalacaoCidade,
            instalacao_uf: instalacaoUf,
            cnpj,
            razao_social: razaoSocial,
            inscricao_estadual: inscricaoEstadual,
            plano_codigo: planoCodigo,
            plano_nome: planoNome,
            plano_valor: planoValor,
            dia_vencimento: diaVencimento,
            observacao,
            status: 'pendente'
          })
          .select()
          .single();

        if (contratoError) {
          throw new Error(`Erro ao criar contrato: ${contratoError.message}`);
        }

        const contratoId = contratoData.id;

        // 2. Criar adicionais do contrato
        if (adicionaisProcessados.length > 0) {
          const adicionaisInserts = adicionaisProcessados.map(adic => ({
            contrato_id: contratoId,
            adicional_codigo: adic.codigo,
            adicional_nome: adic.nome,
            adicional_valor: adic.valor
          }));

          const { error: adicionaisError } = await supabase
            .from('adicionais_contrato')
            .insert(adicionaisInserts);

          if (adicionaisError) {
            // Rollback: deletar contrato
            await supabase.from('contratos').delete().eq('id', contratoId);
            throw new Error(`Erro ao criar adicionais: ${adicionaisError.message}`);
          }
        }

        // 3. Criar agendamento vinculado ao contrato
        const { error: agendamentoError } = await supabase
          .from('agendamentos')
          .insert({
            contrato_id: contratoId,
            data_agendamento: dataAgendamento,
            slot_numero: slotAgendamento,
            nome_cliente: nomeCompleto,
            email_cliente: email,
            telefone_cliente: telefone,
            status: 'pendente',
            confirmacao: 'pre-agendado'
          });

        if (agendamentoError) {
          // Rollback: deletar contrato (cascade deleta adicionais)
          await supabase.from('contratos').delete().eq('id', contratoId);
          throw new Error(`Erro ao criar agendamento: ${agendamentoError.message}`);
        }

        // 4. Atualizar slot como ocupado
        const { error: slotUpdateError } = await supabase
          .from('slots_disponiveis')
          .update({ [slotColumn]: `${nomeCompleto} - ${email}` })
          .eq('data_disponivel', dataAgendamento);

        if (slotUpdateError) {
          // Rollback: deletar contrato (cascade deleta agendamento e adicionais)
          await supabase.from('contratos').delete().eq('id', contratoId);
          throw new Error(`Erro ao atualizar slot: ${slotUpdateError.message}`);
        }

        // Sucesso!
        return new Response(
          JSON.stringify({ 
            success: true, 
            contratoId,
            numeroContrato: contratoId.substring(0, 8).toUpperCase(),
            data: contratoData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'getContract': {
        const { contratoId } = requestBody;
        
        if (!contratoId) {
          throw new Error('ID do contrato é obrigatório');
        }

        const { data: contrato, error: contratoError } = await supabase
          .from('contratos')
          .select(`
            *,
            adicionais_contrato (*),
            agendamentos (*)
          `)
          .eq('id', contratoId)
          .single();

        if (contratoError) throw contratoError;

        return new Response(
          JSON.stringify({ success: true, contrato }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'listContracts': {
        const { limit = 50, offset = 0, status } = requestBody;

        let query = supabase
          .from('contratos')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, contratos: data, total: count }),
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
