export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      adicionais_contrato: {
        Row: {
          adicional_codigo: string
          adicional_nome: string
          adicional_valor: number
          contrato_id: string
          created_at: string | null
          id: string
          provedor_id: string
        }
        Insert: {
          adicional_codigo: string
          adicional_nome: string
          adicional_valor: number
          contrato_id: string
          created_at?: string | null
          id?: string
          provedor_id: string
        }
        Update: {
          adicional_codigo?: string
          adicional_nome?: string
          adicional_valor?: number
          contrato_id?: string
          created_at?: string | null
          id?: string
          provedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adicionais_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adicionais_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adicionais_contrato_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          codigo_cliente: string | null
          confirmacao: string
          contrato_id: string | null
          created_at: string
          data_agendamento: string
          email_cliente: string | null
          id: string
          nome_cliente: string
          observacao: string | null
          origem: string | null
          provedor_id: string
          rede: string | null
          representante_vendas: string | null
          slot_numero: number
          status: string
          tecnico_responsavel_id: string | null
          telefone_cliente: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          codigo_cliente?: string | null
          confirmacao?: string
          contrato_id?: string | null
          created_at?: string
          data_agendamento: string
          email_cliente?: string | null
          id?: string
          nome_cliente: string
          observacao?: string | null
          origem?: string | null
          provedor_id: string
          rede?: string | null
          representante_vendas?: string | null
          slot_numero: number
          status?: string
          tecnico_responsavel_id?: string | null
          telefone_cliente?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          codigo_cliente?: string | null
          confirmacao?: string
          contrato_id?: string | null
          created_at?: string
          data_agendamento?: string
          email_cliente?: string | null
          id?: string
          nome_cliente?: string
          observacao?: string | null
          origem?: string | null
          provedor_id?: string
          rede?: string | null
          representante_vendas?: string | null
          slot_numero?: number
          status?: string
          tecnico_responsavel_id?: string | null
          telefone_cliente?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: true
            referencedRelation: "vw_contratos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_tecnico_responsavel_id_fkey"
            columns: ["tecnico_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_adicionais: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          id: string
          nome: string
          provedor_id: string
          requer_agendamento: boolean
          updated_at: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: string
          nome: string
          provedor_id: string
          requer_agendamento?: boolean
          updated_at?: string | null
          valor: number
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: string
          nome?: string
          provedor_id?: string
          requer_agendamento?: boolean
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_adicionais_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_cidades: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          provedor_id: string
          uf: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          provedor_id: string
          uf: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          provedor_id?: string
          uf?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_cidades_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_grupos_mensagem: {
        Row: {
          created_at: string
          grupo: string
          id: number
          image_url: string | null
          message: string | null
          order: number
          provedor_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          grupo: string
          id?: number
          image_url?: string | null
          message?: string | null
          order: number
          provedor_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          grupo?: string
          id?: number
          image_url?: string | null
          message?: string | null
          order?: number
          provedor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_grupos_mensagem_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_origem_vendas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          provedor_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          provedor_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          provedor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_origem_vendas_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_planos: {
        Row: {
          acompanha_W2A_educa: boolean | null
          ativo: boolean | null
          codigo: string
          contrato_fidelidade: string | null
          created_at: string | null
          id: string
          nome: string
          provedor_id: string
          taxa_instalacao: string | null
          taxa_instalacao_especal: string | null
          taxa_instalacao_negociavel: string | null
          taxa_instalacao_padrao: string | null
          updated_at: string | null
          valor: number
          valor_pos_vencimento: string | null
          velocidade: string | null
          velocidade_download: string | null
          velocidade_upload: string | null
        }
        Insert: {
          acompanha_W2A_educa?: boolean | null
          ativo?: boolean | null
          codigo: string
          contrato_fidelidade?: string | null
          created_at?: string | null
          id?: string
          nome: string
          provedor_id: string
          taxa_instalacao?: string | null
          taxa_instalacao_especal?: string | null
          taxa_instalacao_negociavel?: string | null
          taxa_instalacao_padrao?: string | null
          updated_at?: string | null
          valor: number
          valor_pos_vencimento?: string | null
          velocidade?: string | null
          velocidade_download?: string | null
          velocidade_upload?: string | null
        }
        Update: {
          acompanha_W2A_educa?: boolean | null
          ativo?: boolean | null
          codigo?: string
          contrato_fidelidade?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          provedor_id?: string
          taxa_instalacao?: string | null
          taxa_instalacao_especal?: string | null
          taxa_instalacao_negociavel?: string | null
          taxa_instalacao_padrao?: string | null
          updated_at?: string | null
          valor?: number
          valor_pos_vencimento?: string | null
          velocidade?: string | null
          velocidade_download?: string | null
          velocidade_upload?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_planos_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_representantes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          provedor_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          provedor_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          provedor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_representantes_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_tipos_agendamento: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          id: string
          nome: string
          provedor_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: string
          nome: string
          provedor_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: string
          nome?: string
          provedor_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_tipos_agendamento_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos: {
        Row: {
          celular: string
          cnpj: string | null
          codigo_cliente: string | null
          codigo_contrato: string | null
          cpf: string | null
          created_at: string | null
          data_ativacao: string | null
          data_cancelamento: string | null
          data_nascimento: string | null
          data_pgto_primeira_mensalidade: string | null
          data_pgto_segunda_mensalidade: string | null
          data_pgto_terceira_mensalidade: string | null
          data_recebimento: string | null
          data_reembolso: string | null
          dia_vencimento: string
          email: string
          id: string
          inscricao_estadual: string | null
          instalacao_bairro: string | null
          instalacao_cep: string | null
          instalacao_cidade: string | null
          instalacao_complemento: string | null
          instalacao_mesmo_endereco: boolean
          instalacao_numero: string | null
          instalacao_rua: string | null
          instalacao_uf: string | null
          motivo_cancelamento: string | null
          nome_completo: string
          observacao: string | null
          orgao_expedicao: string | null
          origem: string
          plano_codigo: string
          plano_nome: string
          plano_valor: number
          provedor_id: string
          razao_social: string | null
          recebimento_efetivado: boolean | null
          reembolsavel: boolean | null
          reembolso_efetivado: boolean | null
          representante_vendas: string | null
          residencia_bairro: string
          residencia_cep: string
          residencia_cidade: string
          residencia_complemento: string | null
          residencia_numero: string
          residencia_rua: string
          residencia_uf: string
          rg: string | null
          status: string | null
          status_contrato: string | null
          taxa_instalacao: number | null
          telefone: string | null
          tipo_cliente: string
          tipo_venda: string | null
          updated_at: string | null
          valor_total: number
        }
        Insert: {
          celular: string
          cnpj?: string | null
          codigo_cliente?: string | null
          codigo_contrato?: string | null
          cpf?: string | null
          created_at?: string | null
          data_ativacao?: string | null
          data_cancelamento?: string | null
          data_nascimento?: string | null
          data_pgto_primeira_mensalidade?: string | null
          data_pgto_segunda_mensalidade?: string | null
          data_pgto_terceira_mensalidade?: string | null
          data_recebimento?: string | null
          data_reembolso?: string | null
          dia_vencimento: string
          email: string
          id?: string
          inscricao_estadual?: string | null
          instalacao_bairro?: string | null
          instalacao_cep?: string | null
          instalacao_cidade?: string | null
          instalacao_complemento?: string | null
          instalacao_mesmo_endereco: boolean
          instalacao_numero?: string | null
          instalacao_rua?: string | null
          instalacao_uf?: string | null
          motivo_cancelamento?: string | null
          nome_completo: string
          observacao?: string | null
          orgao_expedicao?: string | null
          origem: string
          plano_codigo: string
          plano_nome: string
          plano_valor: number
          provedor_id: string
          razao_social?: string | null
          recebimento_efetivado?: boolean | null
          reembolsavel?: boolean | null
          reembolso_efetivado?: boolean | null
          representante_vendas?: string | null
          residencia_bairro: string
          residencia_cep: string
          residencia_cidade: string
          residencia_complemento?: string | null
          residencia_numero: string
          residencia_rua: string
          residencia_uf: string
          rg?: string | null
          status?: string | null
          status_contrato?: string | null
          taxa_instalacao?: number | null
          telefone?: string | null
          tipo_cliente: string
          tipo_venda?: string | null
          updated_at?: string | null
          valor_total?: number
        }
        Update: {
          celular?: string
          cnpj?: string | null
          codigo_cliente?: string | null
          codigo_contrato?: string | null
          cpf?: string | null
          created_at?: string | null
          data_ativacao?: string | null
          data_cancelamento?: string | null
          data_nascimento?: string | null
          data_pgto_primeira_mensalidade?: string | null
          data_pgto_segunda_mensalidade?: string | null
          data_pgto_terceira_mensalidade?: string | null
          data_recebimento?: string | null
          data_reembolso?: string | null
          dia_vencimento?: string
          email?: string
          id?: string
          inscricao_estadual?: string | null
          instalacao_bairro?: string | null
          instalacao_cep?: string | null
          instalacao_cidade?: string | null
          instalacao_complemento?: string | null
          instalacao_mesmo_endereco?: boolean
          instalacao_numero?: string | null
          instalacao_rua?: string | null
          instalacao_uf?: string | null
          motivo_cancelamento?: string | null
          nome_completo?: string
          observacao?: string | null
          orgao_expedicao?: string | null
          origem?: string
          plano_codigo?: string
          plano_nome?: string
          plano_valor?: number
          provedor_id?: string
          razao_social?: string | null
          recebimento_efetivado?: boolean | null
          reembolsavel?: boolean | null
          reembolso_efetivado?: boolean | null
          representante_vendas?: string | null
          residencia_bairro?: string
          residencia_cep?: string
          residencia_cidade?: string
          residencia_complemento?: string | null
          residencia_numero?: string
          residencia_rua?: string
          residencia_uf?: string
          rg?: string | null
          status?: string | null
          status_contrato?: string | null
          taxa_instalacao?: number | null
          telefone?: string | null
          tipo_cliente?: string
          tipo_venda?: string | null
          updated_at?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_adicionais_contrato: {
        Row: {
          adicional_codigo: string
          adicional_nome: string
          adicional_valor: number
          contrato_id: string
          created_at: string | null
          entidade_nome: string | null
          id: string
          provedor_id: string
          tipo_acao: string
          usuario_id: string | null
        }
        Insert: {
          adicional_codigo: string
          adicional_nome: string
          adicional_valor: number
          contrato_id: string
          created_at?: string | null
          entidade_nome?: string | null
          id?: string
          provedor_id: string
          tipo_acao: string
          usuario_id?: string | null
        }
        Update: {
          adicional_codigo?: string
          adicional_nome?: string
          adicional_valor?: number
          contrato_id?: string
          created_at?: string | null
          entidade_nome?: string | null
          id?: string
          provedor_id?: string
          tipo_acao?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_adicionais_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_adicionais_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_adicionais_contrato_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_adicionais_contrato_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_contratos: {
        Row: {
          campo_alterado: string | null
          contrato_id: string
          created_at: string | null
          entidade_nome: string | null
          id: string
          provedor_id: string
          tipo_acao: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo_alterado?: string | null
          contrato_id: string
          created_at?: string | null
          entidade_nome?: string | null
          id?: string
          provedor_id: string
          tipo_acao: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo_alterado?: string | null
          contrato_id?: string
          created_at?: string | null
          entidade_nome?: string | null
          id?: string
          provedor_id?: string
          tipo_acao?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_contratos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_contratos_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_completos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_contratos_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_contratos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_edicoes_agendamentos: {
        Row: {
          agendamento_id: string
          campo_alterado: string
          created_at: string | null
          id: string
          provedor_id: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          agendamento_id: string
          campo_alterado: string
          created_at?: string | null
          id?: string
          provedor_id: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          agendamento_id?: string
          campo_alterado?: string
          created_at?: string | null
          id?: string
          provedor_id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_edicoes_agendamentos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_edicoes_agendamentos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_completos"
            referencedColumns: ["ultimo_agendamento_id"]
          },
          {
            foreignKeyName: "historico_edicoes_agendamentos_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_edicoes_agendamentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_reagendamentos: {
        Row: {
          agendamento_id: string
          created_at: string | null
          data_anterior: string
          data_nova: string
          id: string
          motivo: string | null
          provedor_id: string
          slot_anterior: number
          slot_novo: number
          usuario_id: string | null
        }
        Insert: {
          agendamento_id: string
          created_at?: string | null
          data_anterior: string
          data_nova: string
          id?: string
          motivo?: string | null
          provedor_id: string
          slot_anterior: number
          slot_novo: number
          usuario_id?: string | null
        }
        Update: {
          agendamento_id?: string
          created_at?: string | null
          data_anterior?: string
          data_nova?: string
          id?: string
          motivo?: string | null
          provedor_id?: string
          slot_anterior?: number
          slot_novo?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "historico_reagendamentos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_reagendamentos_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_completos"
            referencedColumns: ["ultimo_agendamento_id"]
          },
          {
            foreignKeyName: "historico_reagendamentos_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_reagendamentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          email: string
          id: string
          nome: string
          sobrenome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          email: string
          id: string
          nome: string
          sobrenome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          nome?: string
          sobrenome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      provedores: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          logo_url: string | null
          nome: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      slots: {
        Row: {
          agendamento_id: string | null
          created_at: string | null
          data_disponivel: string
          id: string
          observacao: string | null
          provedor_id: string
          slot_numero: number
          status: string
          updated_at: string | null
        }
        Insert: {
          agendamento_id?: string | null
          created_at?: string | null
          data_disponivel: string
          id?: string
          observacao?: string | null
          provedor_id: string
          slot_numero: number
          status?: string
          updated_at?: string | null
        }
        Update: {
          agendamento_id?: string | null
          created_at?: string | null
          data_disponivel?: string
          id?: string
          observacao?: string | null
          provedor_id?: string
          slot_numero?: number
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slots_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "agendamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "slots_agendamento_id_fkey"
            columns: ["agendamento_id"]
            isOneToOne: false
            referencedRelation: "vw_contratos_completos"
            referencedColumns: ["ultimo_agendamento_id"]
          },
          {
            foreignKeyName: "slots_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_provedores: {
        Row: {
          created_at: string | null
          id: string
          provedor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          provedor_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          provedor_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_provedores_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_contratos_completos: {
        Row: {
          celular: string | null
          cnpj: string | null
          codigo_cliente: string | null
          codigo_contrato: string | null
          cpf: string | null
          created_at: string | null
          data_ativacao: string | null
          data_cancelamento: string | null
          data_nascimento: string | null
          data_pgto_primeira_mensalidade: string | null
          data_pgto_segunda_mensalidade: string | null
          data_pgto_terceira_mensalidade: string | null
          data_recebimento: string | null
          data_reembolso: string | null
          dia_vencimento: string | null
          email: string | null
          id: string | null
          inscricao_estadual: string | null
          instalacao_bairro: string | null
          instalacao_cep: string | null
          instalacao_cidade: string | null
          instalacao_complemento: string | null
          instalacao_mesmo_endereco: boolean | null
          instalacao_numero: string | null
          instalacao_rua: string | null
          instalacao_uf: string | null
          motivo_cancelamento: string | null
          nome_completo: string | null
          nomes_adicionais: string | null
          observacao: string | null
          orgao_expedicao: string | null
          origem: string | null
          plano_codigo: string | null
          plano_nome: string | null
          plano_valor: number | null
          provedor_id: string | null
          razao_social: string | null
          recebimento_efetivado: boolean | null
          reembolsavel: boolean | null
          reembolso_efetivado: boolean | null
          representante_vendas: string | null
          residencia_bairro: string | null
          residencia_cep: string | null
          residencia_cidade: string | null
          residencia_complemento: string | null
          residencia_numero: string | null
          residencia_rua: string | null
          residencia_uf: string | null
          rg: string | null
          soma_adicionais: number | null
          status: string | null
          status_contrato: string | null
          taxa_instalacao: number | null
          telefone: string | null
          tipo_cliente: string | null
          tipo_venda: string | null
          ultima_data_agendamento: string | null
          ultimo_agendamento_confirmacao: string | null
          ultimo_agendamento_id: string | null
          ultimo_agendamento_status: string | null
          ultimo_agendamento_tipo: string | null
          updated_at: string | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contratos_provedor_id_fkey"
            columns: ["provedor_id"]
            isOneToOne: false
            referencedRelation: "provedores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_conversation_context: {
        Args: { p_conversation_id: string; p_max_messages?: number }
        Returns: Json
      }
      get_or_create_contact: {
        Args: { p_phone: string; p_push_name?: string }
        Returns: {
          contact_id: string
          conversation_id: string
          current_step: string
          is_new_contact: boolean
          is_new_conversation: boolean
        }[]
      }
      get_slots_statistics: { Args: never; Returns: Json }
      get_user_provedor_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      transition_step: {
        Args: {
          p_conversation_id: string
          p_step_data_merge?: Json
          p_to_step: string
          p_trigger_data?: Json
          p_trigger_type?: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "tecnico"
        | "vendedor"
        | "atendente"
        | "supervisor"
        | "provedor"
        | "vendedor_clique"
        | "vendedor_provedor"
        | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "tecnico",
        "vendedor",
        "atendente",
        "supervisor",
        "provedor",
        "vendedor_clique",
        "vendedor_provedor",
        "super_admin",
      ],
    },
  },
} as const
