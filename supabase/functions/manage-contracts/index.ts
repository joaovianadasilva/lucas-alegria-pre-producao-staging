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
          dataAgendamento, slotAgendamento, usuarioId,
          taxaInstalacao
        } = requestBody;

        // Validar que existe plano OU adicionais
        const temPlano = planoContratado && planoContratado.trim() !== '';
        const temAdicionais = adicionaisContratados && adicionaisContratados.length > 0;
        
        if (!temPlano && !temAdicionais) {
          throw new Error('É necessário selecionar pelo menos um plano ou adicional');
        }

        // Processar plano (se fornecido)
        let planoCodigo, planoNome, planoValor;
        
        if (temPlano) {
          // Extrair código do plano (formato: "[10001] - [Fibra 100MB] - [R$ 79.90]")
          const planoMatch = planoContratado.match(/\[(\d+)\]\s*-\s*\[([^\]]+)\]\s*-\s*\[R\$\s*([\d,.]+)\]/);
          if (!planoMatch) {
            throw new Error('Formato de plano inválido');
          }
          planoCodigo = planoMatch[1];
          planoNome = planoMatch[2];
          planoValor = parseFloat(planoMatch[3].replace(',', '.'));

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
        } else {
          // Se não tem plano, usar valores padrão para indicar "sem plano"
          planoCodigo = '';
          planoNome = 'Sem plano base';
          planoValor = 0;
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

        // Calcular valor total (plano + adicionais)
        const valorTotalAdicionais = adicionaisProcessados.reduce(
          (acc, adic) => acc + adic.valor, 0
        );
        const valorTotal = planoValor + valorTotalAdicionais;

        // Verificar se agendamento foi fornecido
        const temAgendamento = dataAgendamento && slotAgendamento;

        // Verificar disponibilidade do slot apenas se tiver agendamento
        if (temAgendamento) {
          const { data: slotData, error: slotError } = await supabase
            .from('slots')
            .select('*')
            .eq('data_disponivel', dataAgendamento)
            .eq('slot_numero', slotAgendamento)
            .single();

          if (slotError || !slotData) {
            throw new Error('Vaga não encontrada para a data selecionada');
          }

          if (slotData.status !== 'disponivel') {
            throw new Error('Vaga não está disponível');
          }
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
            valor_total: valorTotal,
            dia_vencimento: diaVencimento,
            observacao,
            taxa_instalacao: taxaInstalacao || 0,
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

        // 3. Criar agendamento vinculado ao contrato (apenas se tiver dados de agendamento)
        let agendamentoData = null;
        if (temAgendamento) {
          const { data, error: agendamentoError } = await supabase
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
            })
            .select()
            .single();

          if (agendamentoError) {
            // Rollback: deletar contrato (cascade deleta adicionais)
            await supabase.from('contratos').delete().eq('id', contratoId);
            throw new Error(`Erro ao criar agendamento: ${agendamentoError.message}`);
          }
          
          agendamentoData = data;

          // 4. Atualizar slot para vincular o agendamento
          const { error: slotUpdateError } = await supabase
            .from('slots')
            .update({ 
              status: 'ocupado',
              agendamento_id: agendamentoData.id
            })
            .eq('data_disponivel', dataAgendamento)
            .eq('slot_numero', slotAgendamento);

          if (slotUpdateError) {
            // Rollback: deletar contrato (cascade deleta agendamento e adicionais)
            await supabase.from('contratos').delete().eq('id', contratoId);
            throw new Error(`Erro ao atualizar vaga: ${slotUpdateError.message}`);
          }
        }

        // 5. Registrar histórico de criação do contrato
        await supabase.from('historico_contratos').insert({
          contrato_id: contratoId,
          tipo_acao: 'criacao',
          campo_alterado: null,
          valor_anterior: null,
          valor_novo: JSON.stringify({
            tipo_cliente: tipoCliente,
            nome_completo: nomeCompleto,
            origem,
            tipo_venda: tipoVenda,
            plano: planoNome,
            valor_total: planoValor
          }),
          usuario_id: usuarioId || null
        });

        // 6. Registrar histórico de adicionais
        if (adicionaisProcessados.length > 0) {
          const historicoAdicionais = adicionaisProcessados.map(adic => ({
            contrato_id: contratoId,
            adicional_codigo: adic.codigo,
            adicional_nome: adic.nome,
            adicional_valor: adic.valor,
            tipo_acao: 'adicao',
            usuario_id: usuarioId || null
          }));

          await supabase.from('historico_adicionais_contrato').insert(historicoAdicionais);
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

      case 'listContractsWithFilter': {
        const { 
          limit = 20, 
          offset = 0, 
          dataInicio, 
          dataFim, 
          codigoClienteFilter, 
          codigoContratoFilter 
        } = requestBody;

        console.log('listContractsWithFilter - params:', { limit, offset, dataInicio, dataFim, codigoClienteFilter, codigoContratoFilter });

        let query = supabase
          .from('contratos')
          .select('id, nome_completo, celular, email, cpf, codigo_contrato, codigo_cliente, created_at', { count: 'exact' })
          .order('created_at', { ascending: false });

        // Filtro de data
        if (dataInicio) {
          query = query.gte('created_at', dataInicio);
        }
        if (dataFim) {
          query = query.lte('created_at', dataFim + 'T23:59:59');
        }

        // Filtro de código cliente (vazio/preenchido)
        if (codigoClienteFilter === 'vazio') {
          query = query.or('codigo_cliente.is.null,codigo_cliente.eq.');
        } else if (codigoClienteFilter === 'preenchido') {
          query = query.not('codigo_cliente', 'is', null).neq('codigo_cliente', '');
        }

        // Filtro de código contrato (vazio/preenchido)
        if (codigoContratoFilter === 'vazio') {
          query = query.or('codigo_contrato.is.null,codigo_contrato.eq.');
        } else if (codigoContratoFilter === 'preenchido') {
          query = query.not('codigo_contrato', 'is', null).neq('codigo_contrato', '');
        }

        // Aplicar paginação
        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          console.error('listContractsWithFilter - error:', error);
          throw error;
        }

        console.log('listContractsWithFilter - success, count:', count);

        return new Response(
          JSON.stringify({ success: true, contratos: data, total: count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateContractCodes': {
        const { contratoId, codigoContrato, codigoCliente, usuarioId } = requestBody;

        console.log('updateContractCodes - params:', { contratoId, codigoContrato, codigoCliente, usuarioId });

        if (!contratoId) {
          throw new Error('ID do contrato é obrigatório');
        }

        // Buscar valores atuais para histórico
        const { data: contratoAtual, error: fetchError } = await supabase
          .from('contratos')
          .select('codigo_contrato, codigo_cliente')
          .eq('id', contratoId)
          .single();

        if (fetchError) {
          console.error('updateContractCodes - fetch error:', fetchError);
          throw new Error('Contrato não encontrado');
        }

        // Atualizar contrato
        const { error: updateError } = await supabase
          .from('contratos')
          .update({
            codigo_contrato: codigoContrato || null,
            codigo_cliente: codigoCliente || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', contratoId);

        if (updateError) {
          console.error('updateContractCodes - update error:', updateError);
          throw new Error(`Erro ao atualizar contrato: ${updateError.message}`);
        }

        // Registrar histórico de alterações
        const historicoInserts = [];

        if (contratoAtual.codigo_contrato !== (codigoContrato || null)) {
          historicoInserts.push({
            contrato_id: contratoId,
            tipo_acao: 'alteracao',
            campo_alterado: 'codigo_contrato',
            valor_anterior: contratoAtual.codigo_contrato || null,
            valor_novo: codigoContrato || null,
            usuario_id: usuarioId || null
          });
        }

        if (contratoAtual.codigo_cliente !== (codigoCliente || null)) {
          historicoInserts.push({
            contrato_id: contratoId,
            tipo_acao: 'alteracao',
            campo_alterado: 'codigo_cliente',
            valor_anterior: contratoAtual.codigo_cliente || null,
            valor_novo: codigoCliente || null,
            usuario_id: usuarioId || null
          });
        }

        if (historicoInserts.length > 0) {
          const { error: historicoError } = await supabase
            .from('historico_contratos')
            .insert(historicoInserts);

          if (historicoError) {
            console.error('updateContractCodes - historico error:', historicoError);
            // Não lançar erro, apenas logar - o update já foi feito
          }
        }

        console.log('updateContractCodes - success');

        return new Response(
          JSON.stringify({ success: true, message: 'Contrato atualizado com sucesso' }),
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
