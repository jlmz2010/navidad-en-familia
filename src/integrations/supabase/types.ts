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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      circulos: {
        Row: {
          admin_hash: string | null
          bloqueado_hasta: string | null
          codigo: string
          creado: string
          id: string
          intentos_fallidos: number
          max_miembros: number
          nombre: string
          pin_hash: string
        }
        Insert: {
          admin_hash?: string | null
          bloqueado_hasta?: string | null
          codigo?: string
          creado?: string
          id?: string
          intentos_fallidos?: number
          max_miembros?: number
          nombre: string
          pin_hash: string
        }
        Update: {
          admin_hash?: string | null
          bloqueado_hasta?: string | null
          codigo?: string
          creado?: string
          id?: string
          intentos_fallidos?: number
          max_miembros?: number
          nombre?: string
          pin_hash?: string
        }
        Relationships: []
      }
      config: {
        Row: {
          clave_familiar: string
          id: number
        }
        Insert: {
          clave_familiar: string
          id?: number
        }
        Update: {
          clave_familiar?: string
          id?: number
        }
        Relationships: []
      }
      deseos: {
        Row: {
          apartado_por: string | null
          circulo_id: string
          creado: string
          id: string
          link: string | null
          nivel: string
          nota: string | null
          persona: string
          titulo: string
        }
        Insert: {
          apartado_por?: string | null
          circulo_id?: string
          creado?: string
          id?: string
          link?: string | null
          nivel: string
          nota?: string | null
          persona: string
          titulo: string
        }
        Update: {
          apartado_por?: string | null
          circulo_id?: string
          creado?: string
          id?: string
          link?: string | null
          nivel?: string
          nota?: string | null
          persona?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "deseos_circulo_id_fkey"
            columns: ["circulo_id"]
            isOneToOne: false
            referencedRelation: "circulos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _validar: {
        Args: { p_clave: string; p_persona: string }
        Returns: string
      }
      _validar_c: {
        Args: { p_codigo: string; p_persona?: string; p_pin: string }
        Returns: Json
      }
      apartar: {
        Args: { p_clave: string; p_id: string; p_persona: string }
        Returns: boolean
      }
      apartar_c: {
        Args: {
          p_codigo: string
          p_id: string
          p_persona: string
          p_pin: string
        }
        Returns: Json
      }
      borrar_deseo: {
        Args: { p_clave: string; p_id: string; p_persona: string }
        Returns: undefined
      }
      borrar_deseo_c: {
        Args: {
          p_codigo: string
          p_id: string
          p_persona: string
          p_pin: string
        }
        Returns: Json
      }
      crear_circulo: {
        Args: { p_nombre: string; p_pin: string }
        Returns: Json
      }
      entrar: { Args: { p_clave: string; p_persona: string }; Returns: string }
      entrar_circulo: {
        Args: { p_codigo: string; p_pin: string }
        Returns: Json
      }
      familia: {
        Args: { p_clave: string; p_persona: string }
        Returns: {
          estado: string
          id: string
          link: string
          nivel: string
          nota: string
          persona: string
          titulo: string
        }[]
      }
      familia_c: {
        Args: { p_codigo: string; p_persona: string; p_pin: string }
        Returns: Json
      }
      guardar_deseo: {
        Args: {
          p_clave: string
          p_id: string
          p_link: string
          p_nivel: string
          p_nota: string
          p_persona: string
          p_titulo: string
        }
        Returns: string
      }
      guardar_deseo_c: {
        Args: {
          p_codigo: string
          p_id: string
          p_link: string
          p_nivel: string
          p_nota: string
          p_persona: string
          p_pin: string
          p_titulo: string
        }
        Returns: Json
      }
      mi_lista: {
        Args: { p_clave: string; p_persona: string }
        Returns: {
          creado: string
          id: string
          link: string
          nivel: string
          nota: string
          titulo: string
        }[]
      }
      mi_lista_c: {
        Args: { p_codigo: string; p_persona: string; p_pin: string }
        Returns: Json
      }
      soltar: {
        Args: { p_clave: string; p_id: string; p_persona: string }
        Returns: boolean
      }
      soltar_c: {
        Args: {
          p_codigo: string
          p_id: string
          p_persona: string
          p_pin: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
