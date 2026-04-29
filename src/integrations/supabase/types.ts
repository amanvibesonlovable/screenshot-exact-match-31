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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      employees: {
        Row: {
          age: number | null
          area_manager: string
          branch: string
          college: string | null
          created_at: string
          doj: string
          email: string
          employee_code: string
          id: string
          name: string
          phone: string
          status: Database["public"]["Enums"]["employee_status"]
          token: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          area_manager: string
          branch: string
          college?: string | null
          created_at?: string
          doj: string
          email: string
          employee_code: string
          id?: string
          name: string
          phone: string
          status?: Database["public"]["Enums"]["employee_status"]
          token?: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          area_manager?: string
          branch?: string
          college?: string | null
          created_at?: string
          doj?: string
          email?: string
          employee_code?: string
          id?: string
          name?: string
          phone?: string
          status?: Database["public"]["Enums"]["employee_status"]
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      hr_actions: {
        Row: {
          action_type: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          employee_id: string
          id: string
          notes: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          employee_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_whitelist: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          completion_time_seconds: number
          critical_flags: Json
          employee_id: string
          final_score: number
          free_text_response: string | null
          gaming_flag: boolean
          id: string
          responses: Json
          risk_level: Database["public"]["Enums"]["risk_level"]
          scores: Json
          stage: Database["public"]["Enums"]["survey_stage"]
          submitted_at: string
        }
        Insert: {
          completion_time_seconds: number
          critical_flags?: Json
          employee_id: string
          final_score: number
          free_text_response?: string | null
          gaming_flag?: boolean
          id?: string
          responses: Json
          risk_level: Database["public"]["Enums"]["risk_level"]
          scores: Json
          stage: Database["public"]["Enums"]["survey_stage"]
          submitted_at?: string
        }
        Update: {
          completion_time_seconds?: number
          critical_flags?: Json
          employee_id?: string
          final_score?: number
          free_text_response?: string | null
          gaming_flag?: boolean
          id?: string
          responses?: Json
          risk_level?: Database["public"]["Enums"]["risk_level"]
          scores?: Json
          stage?: Database["public"]["Enums"]["survey_stage"]
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gen_survey_token: { Args: never; Returns: string }
      is_hr_user: { Args: never; Returns: boolean }
    }
    Enums: {
      employee_status: "training" | "positioned" | "exited"
      risk_level: "LOW" | "MEDIUM" | "HIGH"
      survey_stage: "15" | "30" | "45" | "60" | "90" | "180"
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
      employee_status: ["training", "positioned", "exited"],
      risk_level: ["LOW", "MEDIUM", "HIGH"],
      survey_stage: ["15", "30", "45", "60", "90", "180"],
    },
  },
} as const
