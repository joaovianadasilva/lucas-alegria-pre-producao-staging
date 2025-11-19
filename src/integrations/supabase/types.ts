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
        }
        Insert: {
          adicional_codigo: string
          adicional_nome: string
          adicional_valor: number
          contrato_id: string
          created_at?: string | null
          id?: string
        }
        Update: {
          adicional_codigo?: string
          adicional_nome?: string
          adicional_valor?: number
          contrato_id?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adicionais_contrato_contrato_id_fkey"
            columns: ["contrato_id"]
            isOneToOne: false
            referencedRelation: "contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          confirmacao: string
          contrato_id: string | null
          created_at: string
          data_agendamento: string
          email_cliente: string
          id: string
          nome_cliente: string
          observacao: string | null
          origem: string | null
          representante_vendas: string | null
          slot_numero: number
          status: string
          tecnico_responsavel_id: string | null
          telefone_cliente: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          confirmacao?: string
          contrato_id?: string | null
          created_at?: string
          data_agendamento: string
          email_cliente: string
          id?: string
          nome_cliente: string
          observacao?: string | null
          origem?: string | null
          representante_vendas?: string | null
          slot_numero: number
          status?: string
          tecnico_responsavel_id?: string | null
          telefone_cliente?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          confirmacao?: string
          contrato_id?: string | null
          created_at?: string
          data_agendamento?: string
          email_cliente?: string
          id?: string
          nome_cliente?: string
          observacao?: string | null
          origem?: string | null
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
          updated_at: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      catalogo_cidades: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          uf: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          uf: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          uf?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      catalogo_planos: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      catalogo_representantes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      contatos_agente: {
        Row: {
          agente: string | null
          created_at: string | null
          email: string | null
          id: number
          interesse_duvida: string | null
          role: string | null
          status: string | null
          user_como_paga_viagens: string | null
          user_deal_id: string | null
          user_moment: string | null
          user_name: string | null
          user_number: string | null
          user_profile: string | null
          user_qnto_gasta_viagens: string | null
          user_quando_viaja: string | null
          user_quantas_vezes_viaja_ano: string | null
        }
        Insert: {
          agente?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          interesse_duvida?: string | null
          role?: string | null
          status?: string | null
          user_como_paga_viagens?: string | null
          user_deal_id?: string | null
          user_moment?: string | null
          user_name?: string | null
          user_number?: string | null
          user_profile?: string | null
          user_qnto_gasta_viagens?: string | null
          user_quando_viaja?: string | null
          user_quantas_vezes_viaja_ano?: string | null
        }
        Update: {
          agente?: string | null
          created_at?: string | null
          email?: string | null
          id?: number
          interesse_duvida?: string | null
          role?: string | null
          status?: string | null
          user_como_paga_viagens?: string | null
          user_deal_id?: string | null
          user_moment?: string | null
          user_name?: string | null
          user_number?: string | null
          user_profile?: string | null
          user_qnto_gasta_viagens?: string | null
          user_quando_viaja?: string | null
          user_quantas_vezes_viaja_ano?: string | null
        }
        Relationships: []
      }
      contratos: {
        Row: {
          celular: string
          cnpj: string | null
          codigo_cliente: string | null
          cpf: string | null
          created_at: string | null
          data_nascimento: string | null
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
          nome_completo: string
          observacao: string | null
          orgao_expedicao: string | null
          origem: string
          plano_codigo: string
          plano_nome: string
          plano_valor: number
          razao_social: string | null
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
          telefone: string
          tipo_cliente: string
          tipo_venda: string | null
          updated_at: string | null
        }
        Insert: {
          celular: string
          cnpj?: string | null
          codigo_cliente?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
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
          nome_completo: string
          observacao?: string | null
          orgao_expedicao?: string | null
          origem: string
          plano_codigo: string
          plano_nome: string
          plano_valor: number
          razao_social?: string | null
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
          telefone: string
          tipo_cliente: string
          tipo_venda?: string | null
          updated_at?: string | null
        }
        Update: {
          celular?: string
          cnpj?: string | null
          codigo_cliente?: string | null
          cpf?: string | null
          created_at?: string | null
          data_nascimento?: string | null
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
          nome_completo?: string
          observacao?: string | null
          orgao_expedicao?: string | null
          origem?: string
          plano_codigo?: string
          plano_nome?: string
          plano_valor?: number
          razao_social?: string | null
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
          telefone?: string
          tipo_cliente?: string
          tipo_venda?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      follow_up: {
        Row: {
          created_at: string | null
          id: number
          last_message: string | null
          user_number: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          last_message?: string | null
          user_number?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          last_message?: string | null
          user_number?: string | null
        }
        Relationships: []
      }
      historico_reagendamentos: {
        Row: {
          agendamento_id: string
          created_at: string | null
          data_anterior: string
          data_nova: string
          id: string
          motivo: string | null
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
            foreignKeyName: "historico_reagendamentos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
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
      slots_disponiveis: {
        Row: {
          created_at: string | null
          data_disponivel: string
          id: string
          slot_1: string | null
          slot_10: string | null
          slot_2: string | null
          slot_3: string | null
          slot_4: string | null
          slot_5: string | null
          slot_6: string | null
          slot_7: string | null
          slot_8: string | null
          slot_9: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_disponivel: string
          id?: string
          slot_1?: string | null
          slot_10?: string | null
          slot_2?: string | null
          slot_3?: string | null
          slot_4?: string | null
          slot_5?: string | null
          slot_6?: string | null
          slot_7?: string | null
          slot_8?: string | null
          slot_9?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_disponivel?: string
          id?: string
          slot_1?: string | null
          slot_10?: string | null
          slot_2?: string | null
          slot_3?: string | null
          slot_4?: string | null
          slot_5?: string | null
          slot_6?: string | null
          slot_7?: string | null
          slot_8?: string | null
          slot_9?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
    }
    Enums: {
      app_role: "admin" | "tecnico" | "vendedor" | "atendente"
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
      app_role: ["admin", "tecnico", "vendedor", "atendente"],
    },
  },
} as const
