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

    // Validar provedorId obrigatório
    if (!provedorId) {
      throw new Error('provedorId é obrigatório');
    }

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

        const temPlano = planoContratado && planoContratado.trim() !== '';
        const temAdicionais = adicionaisContratados && adicionaisContratados.length > 0;
        
        if (!temPlano && !temAdicionais) {
          throw new Error('É necessário selecionar pelo menos um plano ou adicional');
        }

        let planoCodigo, planoNome, planoValor;
        
        if (temPlano) {
          const planoMatch = planoContratado.match(/\[(\d+)\]\s*-\s*\[([^\]]+)\]\s*-\s*\[R\$\s*([\d,.]+)\]/);
          if (!planoMatch) {
            throw new Error('Formato de plano inválido');
          }
          planoCodigo = planoMatch[1];
          planoNome = planoMatch[2];
          planoValor = parseFloat(planoMatch[3].replace(',', '.'));

          const { data: planoData, error: planoError } = await supabase
            .from('catalogo_planos')
            .select('*')
            .eq('codigo', planoCodigo)
            .eq('ativo', true)
            .eq('provedor_id', provedorId)
            .single();

          if (planoError || !planoData) {
            throw new Error('Plano não encontrado ou inativo');
          }
        } else {
          planoCodigo = '';
          planoNome = 'Sem plano base';
          planoValor = 0;
        }

        const adicionaisProcessados = [];
        if (adicionaisContratados && adicionaisContratados.length > 0) {
          for (const adicionalStr of adicionaisContratados) {
            const adicionalMatch = adicionalStr.match(/\[(\d+)\]\s*-\s*\[([^\]]+)\]\s*-\s*\[R\$\s*([\d,.]+)\]/);
            if (adicionalMatch) {
              const adicionalCodigo = adicionalMatch[1];
              const adicionalNome = adicionalMatch[2];
              const adicionalValor = parseFloat(adicionalMatch[3].replace(',', '.'));

              const { data: adicionalData } = await supabase
                .from('catalogo_adicionais')
                .select('*')
                .eq('codigo', adicionalCodigo)
                .eq('ativo', true)
                .eq('provedor_id', provedorId)
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

        const valorTotalAdicionais = adicionaisProcessados.reduce(
          (acc, adic) => acc + adic.valor, 0
        );
        const valorTotal = planoValor + valorTotalAdicionais;

        const temAgendamento = dataAgendamento && slotAgendamento;

        if (temAgendamento) {
          const { data: slotData, error: slotError } = await supabase
            .from('slots')
            .select('*')
            .eq('data_disponivel', dataAgendamento)
            .eq('slot_numero', slotAgendamento)
            .eq('provedor_id', provedorId)
            .single();

          if (slotError || !slotData) {
            throw new Error('Vaga não encontrada para a data selecionada');
          }

          if (slotData.status !== 'disponivel') {
            throw new Error('Vaga não está disponível');
          }
        }

        // 1. Criar contrato
        const { data: contratoData, error: contratoError } = await supabase
          .from('contratos')
          .insert({
            provedor_id: provedorId,
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
            adicional_valor: adic.valor,
            provedor_id: provedorId
          }));

          const { error: adicionaisError } = await supabase
            .from('adicionais_contrato')
            .insert(adicionaisInserts);

          if (adicionaisError) {
            await supabase.from('contratos').delete().eq('id', contratoId);
            throw new Error(`Erro ao criar adicionais: ${adicionaisError.message}`);
          }
        }

        // 3. Criar agendamento vinculado ao contrato
        let agendamentoData = null;
        if (temAgendamento) {
          const { data, error: agendamentoError } = await supabase
            .from('agendamentos')
            .insert({
              provedor_id: provedorId,
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
            await supabase.from('contratos').delete().eq('id', contratoId);
            throw new Error(`Erro ao criar agendamento: ${agendamentoError.message}`);
          }
          
          agendamentoData = data;

          const { error: slotUpdateError } = await supabase
            .from('slots')
            .update({ 
              status: 'ocupado',
              agendamento_id: agendamentoData.id
            })
            .eq('data_disponivel', dataAgendamento)
            .eq('slot_numero', slotAgendamento)
            .eq('provedor_id', provedorId);

          if (slotUpdateError) {
            await supabase.from('contratos').delete().eq('id', contratoId);
            throw new Error(`Erro ao atualizar vaga: ${slotUpdateError.message}`);
          }
        }

        // 5. Registrar histórico
        await supabase.from('historico_contratos').insert({
          contrato_id: contratoId,
          provedor_id: provedorId,
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
          usuario_id: usuarioId || null,
          entidade_nome: nomeCompleto
        });

        if (adicionaisProcessados.length > 0) {
          const historicoAdicionais = adicionaisProcessados.map(adic => ({
            contrato_id: contratoId,
            provedor_id: provedorId,
            adicional_codigo: adic.codigo,
            adicional_nome: adic.nome,
            adicional_valor: adic.valor,
            tipo_acao: 'adicao',
            usuario_id: usuarioId || null,
            entidade_nome: nomeCompleto
          }));

          await supabase.from('historico_adicionais_contrato').insert(historicoAdicionais);
        }

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
          .eq('provedor_id', provedorId)
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
          .eq('provedor_id', provedorId)
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

        let query = supabase
          .from('contratos')
          .select('id, nome_completo, celular, email, cpf, codigo_contrato, codigo_cliente, created_at', { count: 'exact' })
          .eq('provedor_id', provedorId)
          .order('created_at', { ascending: false });

        if (dataInicio) {
          query = query.gte('created_at', dataInicio);
        }
        if (dataFim) {
          query = query.lte('created_at', dataFim + 'T23:59:59');
        }

        if (codigoClienteFilter === 'vazio') {
          query = query.or('codigo_cliente.is.null,codigo_cliente.eq.');
        } else if (codigoClienteFilter === 'preenchido') {
          query = query.not('codigo_cliente', 'is', null).neq('codigo_cliente', '');
        }

        if (codigoContratoFilter === 'vazio') {
          query = query.or('codigo_contrato.is.null,codigo_contrato.eq.');
        } else if (codigoContratoFilter === 'preenchido') {
          query = query.not('codigo_contrato', 'is', null).neq('codigo_contrato', '');
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, contratos: data, total: count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateContractCodes': {
        const { contratoId, codigoContrato, codigoCliente, usuarioId } = requestBody;

        if (!contratoId) {
          throw new Error('ID do contrato é obrigatório');
        }

        const { data: contratoAtual, error: fetchError } = await supabase
          .from('contratos')
          .select('codigo_contrato, codigo_cliente, nome_completo')
          .eq('id', contratoId)
          .eq('provedor_id', provedorId)
          .single();

        if (fetchError) {
          throw new Error('Contrato não encontrado');
        }

        const { error: updateError } = await supabase
          .from('contratos')
          .update({
            codigo_contrato: codigoContrato || null,
            codigo_cliente: codigoCliente || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', contratoId)
          .eq('provedor_id', provedorId);

        if (updateError) {
          throw new Error(`Erro ao atualizar contrato: ${updateError.message}`);
        }

        const historicoInserts = [];

        if (contratoAtual.codigo_contrato !== (codigoContrato || null)) {
          historicoInserts.push({
            contrato_id: contratoId,
            provedor_id: provedorId,
            tipo_acao: 'alteracao',
            campo_alterado: 'codigo_contrato',
            valor_anterior: contratoAtual.codigo_contrato || null,
            valor_novo: codigoContrato || null,
            usuario_id: usuarioId || null,
            entidade_nome: contratoAtual.nome_completo
          });
        }

        if (contratoAtual.codigo_cliente !== (codigoCliente || null)) {
          historicoInserts.push({
            contrato_id: contratoId,
            provedor_id: provedorId,
            tipo_acao: 'alteracao',
            campo_alterado: 'codigo_cliente',
            valor_anterior: contratoAtual.codigo_cliente || null,
            valor_novo: codigoCliente || null,
            usuario_id: usuarioId || null,
            entidade_nome: contratoAtual.nome_completo
          });
        }

        if (historicoInserts.length > 0) {
          await supabase.from('historico_contratos').insert(historicoInserts);
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Contrato atualizado com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'updateContractFull': {
        const { 
          contratoId, 
          usuarioId,
          planoCodigo, planoNome, planoValor,
          adicionais,
          taxaInstalacao, diaVencimento,
          nomeCompleto, tipoCliente, cpf, cnpj, rg, orgaoExpedicao,
          razaoSocial, inscricaoEstadual, dataNascimento,
          telefone, celular, email,
          residenciaRua, residenciaNumero, residenciaBairro, residenciaComplemento,
          residenciaCep, residenciaCidade, residenciaUf,
          instalacaoMesmoEndereco, instalacaoRua, instalacaoNumero, instalacaoBairro,
          instalacaoComplemento, instalacaoCep, instalacaoCidade, instalacaoUf,
          origem, representanteVendas, tipoVenda, observacao
        } = requestBody;

        if (!contratoId) {
          throw new Error('ID do contrato é obrigatório');
        }

        const { data: contratoAtual, error: fetchError } = await supabase
          .from('contratos')
          .select('*')
          .eq('id', contratoId)
          .eq('provedor_id', provedorId)
          .single();

        if (fetchError || !contratoAtual) {
          throw new Error('Contrato não encontrado');
        }

        const { data: adicionaisAtuais } = await supabase
          .from('adicionais_contrato')
          .select('*')
          .eq('contrato_id', contratoId);

        const novoPlanoValor = planoValor || 0;
        const totalAdicionais = (adicionais || []).reduce(
          (acc: number, adic: { valor: number }) => acc + (adic.valor || 0), 0
        );
        const novoValorTotal = novoPlanoValor + totalAdicionais;

        const updateData: Record<string, any> = {
          plano_codigo: planoCodigo || '',
          plano_nome: planoNome || 'Sem plano base',
          plano_valor: novoPlanoValor,
          valor_total: novoValorTotal,
          taxa_instalacao: taxaInstalacao || 0,
          dia_vencimento: diaVencimento,
          nome_completo: nomeCompleto,
          tipo_cliente: tipoCliente,
          cpf: cpf || null,
          cnpj: cnpj || null,
          rg: rg || null,
          orgao_expedicao: orgaoExpedicao || null,
          razao_social: razaoSocial || null,
          inscricao_estadual: inscricaoEstadual || null,
          data_nascimento: dataNascimento || null,
          telefone: telefone || null,
          celular: celular,
          email: email,
          residencia_rua: residenciaRua,
          residencia_numero: residenciaNumero,
          residencia_bairro: residenciaBairro,
          residencia_complemento: residenciaComplemento || null,
          residencia_cep: residenciaCep,
          residencia_cidade: residenciaCidade,
          residencia_uf: residenciaUf,
          instalacao_mesmo_endereco: instalacaoMesmoEndereco,
          instalacao_rua: instalacaoMesmoEndereco ? null : instalacaoRua,
          instalacao_numero: instalacaoMesmoEndereco ? null : instalacaoNumero,
          instalacao_bairro: instalacaoMesmoEndereco ? null : instalacaoBairro,
          instalacao_complemento: instalacaoMesmoEndereco ? null : instalacaoComplemento,
          instalacao_cep: instalacaoMesmoEndereco ? null : instalacaoCep,
          instalacao_cidade: instalacaoMesmoEndereco ? null : instalacaoCidade,
          instalacao_uf: instalacaoMesmoEndereco ? null : instalacaoUf,
          origem: origem,
          representante_vendas: representanteVendas || null,
          tipo_venda: tipoVenda || null,
          observacao: observacao || null,
          updated_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('contratos')
          .update(updateData)
          .eq('id', contratoId)
          .eq('provedor_id', provedorId);

        if (updateError) {
          throw new Error(`Erro ao atualizar contrato: ${updateError.message}`);
        }

        // Registrar histórico
        const historicoInserts = [];
        const camposComparar = [
          { campo: 'plano_codigo', anterior: contratoAtual.plano_codigo, novo: updateData.plano_codigo },
          { campo: 'plano_nome', anterior: contratoAtual.plano_nome, novo: updateData.plano_nome },
          { campo: 'plano_valor', anterior: String(contratoAtual.plano_valor), novo: String(updateData.plano_valor) },
          { campo: 'valor_total', anterior: String(contratoAtual.valor_total), novo: String(updateData.valor_total) },
          { campo: 'taxa_instalacao', anterior: String(contratoAtual.taxa_instalacao || 0), novo: String(updateData.taxa_instalacao) },
          { campo: 'dia_vencimento', anterior: contratoAtual.dia_vencimento, novo: updateData.dia_vencimento },
          { campo: 'nome_completo', anterior: contratoAtual.nome_completo, novo: updateData.nome_completo },
          { campo: 'tipo_cliente', anterior: contratoAtual.tipo_cliente, novo: updateData.tipo_cliente },
          { campo: 'cpf', anterior: contratoAtual.cpf, novo: updateData.cpf },
          { campo: 'cnpj', anterior: contratoAtual.cnpj, novo: updateData.cnpj },
          { campo: 'email', anterior: contratoAtual.email, novo: updateData.email },
          { campo: 'celular', anterior: contratoAtual.celular, novo: updateData.celular },
          { campo: 'origem', anterior: contratoAtual.origem, novo: updateData.origem },
        ];

        for (const { campo, anterior, novo } of camposComparar) {
          const anteriorStr = anterior === null ? null : String(anterior);
          const novoStr = novo === null ? null : String(novo);
          if (anteriorStr !== novoStr) {
            historicoInserts.push({
              contrato_id: contratoId,
              provedor_id: provedorId,
              tipo_acao: 'alteracao',
              campo_alterado: campo,
              valor_anterior: anteriorStr,
              valor_novo: novoStr,
              usuario_id: usuarioId || null,
              entidade_nome: contratoAtual.nome_completo
            });
          }
        }

        if (historicoInserts.length > 0) {
          await supabase.from('historico_contratos').insert(historicoInserts);
        }

        // Processar adicionais
        const adicionaisAtuaisMap = new Map(
          (adicionaisAtuais || []).map(a => [a.adicional_codigo, a])
        );
        const novosAdicionaisMap = new Map(
          (adicionais || []).map((a: { codigo: string; nome: string; valor: number }) => [a.codigo, a])
        );

        const historicoAdicionaisInserts = [];
        for (const [codigo, adicionalAtual] of adicionaisAtuaisMap) {
          if (!novosAdicionaisMap.has(codigo)) {
            historicoAdicionaisInserts.push({
              contrato_id: contratoId,
              provedor_id: provedorId,
              adicional_codigo: adicionalAtual.adicional_codigo,
              adicional_nome: adicionalAtual.adicional_nome,
              adicional_valor: adicionalAtual.adicional_valor,
              tipo_acao: 'remocao',
              usuario_id: usuarioId || null,
              entidade_nome: contratoAtual.nome_completo
            });
          }
        }

        for (const [codigo, novoAdicional] of novosAdicionaisMap) {
          if (!adicionaisAtuaisMap.has(codigo)) {
            const adicional = novoAdicional as { codigo: string; nome: string; valor: number };
            historicoAdicionaisInserts.push({
              contrato_id: contratoId,
              provedor_id: provedorId,
              adicional_codigo: adicional.codigo,
              adicional_nome: adicional.nome,
              adicional_valor: adicional.valor,
              tipo_acao: 'adicao',
              usuario_id: usuarioId || null,
              entidade_nome: contratoAtual.nome_completo
            });
          }
        }

        if (historicoAdicionaisInserts.length > 0) {
          await supabase.from('historico_adicionais_contrato').insert(historicoAdicionaisInserts);
        }

        await supabase
          .from('adicionais_contrato')
          .delete()
          .eq('contrato_id', contratoId);

        if (adicionais && adicionais.length > 0) {
          const adicionaisInserts = adicionais.map((a: { codigo: string; nome: string; valor: number }) => ({
            contrato_id: contratoId,
            provedor_id: provedorId,
            adicional_codigo: a.codigo,
            adicional_nome: a.nome,
            adicional_valor: a.valor
          }));

          await supabase.from('adicionais_contrato').insert(adicionaisInserts);
        }

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