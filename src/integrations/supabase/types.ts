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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          changed_at: string
          entity_id: string
          entity_type: string
          field_changed: string
          id: string
          new_value: string | null
          note: string | null
          old_value: string | null
          project_id: string
        }
        Insert: {
          changed_at?: string
          entity_id: string
          entity_type: string
          field_changed: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          project_id: string
        }
        Update: {
          changed_at?: string
          entity_id?: string
          entity_type?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_egp: number
          category: string | null
          created_at: string
          date: string
          id: string
          missing_receipt: boolean
          notes: string | null
          paid_by_partner_id: string
          project_id: string
          receipt_urls: string[] | null
          updated_at: string
        }
        Insert: {
          amount_egp: number
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          missing_receipt?: boolean
          notes?: string | null
          paid_by_partner_id: string
          project_id: string
          receipt_urls?: string[] | null
          updated_at?: string
        }
        Update: {
          amount_egp?: number
          category?: string | null
          created_at?: string
          date?: string
          id?: string
          missing_receipt?: boolean
          notes?: string | null
          paid_by_partner_id?: string
          project_id?: string
          receipt_urls?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_paid_by_partner_id_fkey"
            columns: ["paid_by_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      import_message_hashes: {
        Row: {
          created_at: string
          expense_id: string | null
          id: string
          import_run_id: string | null
          message_hash: string
          project_id: string
        }
        Insert: {
          created_at?: string
          expense_id?: string | null
          id?: string
          import_run_id?: string | null
          message_hash: string
          project_id: string
        }
        Update: {
          created_at?: string
          expense_id?: string | null
          id?: string
          import_run_id?: string | null
          message_hash?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_message_hashes_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_message_hashes_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_message_hashes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      import_runs: {
        Row: {
          created_at: string
          expenses_imported: number | null
          filename: string | null
          id: string
          project_id: string
          receipts_matched: number | null
          receipts_unmatched: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expenses_imported?: number | null
          filename?: string | null
          id?: string
          project_id: string
          receipts_matched?: number | null
          receipts_unmatched?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          expenses_imported?: number | null
          filename?: string | null
          id?: string
          project_id?: string
          receipts_matched?: number | null
          receipts_unmatched?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          project_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          project_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
          whatsapp_group_name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
          whatsapp_group_name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
          whatsapp_group_name?: string | null
        }
        Relationships: []
      }
      receipt_inbox: {
        Row: {
          assigned_expense_id: string | null
          created_at: string
          id: string
          import_run_id: string | null
          original_filename: string | null
          project_id: string
          storage_path: string
          timestamp: string | null
          whatsapp_sender: string | null
        }
        Insert: {
          assigned_expense_id?: string | null
          created_at?: string
          id?: string
          import_run_id?: string | null
          original_filename?: string | null
          project_id: string
          storage_path: string
          timestamp?: string | null
          whatsapp_sender?: string | null
        }
        Update: {
          assigned_expense_id?: string | null
          created_at?: string
          id?: string
          import_run_id?: string | null
          original_filename?: string | null
          project_id?: string
          storage_path?: string
          timestamp?: string | null
          whatsapp_sender?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_inbox_assigned_expense_id_fkey"
            columns: ["assigned_expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_inbox_import_run_id_fkey"
            columns: ["import_run_id"]
            isOneToOne: false
            referencedRelation: "import_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_inbox_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sender_mappings: {
        Row: {
          id: string
          ignored: boolean | null
          partner_id: string | null
          project_id: string
          whatsapp_name: string
        }
        Insert: {
          id?: string
          ignored?: boolean | null
          partner_id?: string | null
          project_id: string
          whatsapp_name: string
        }
        Update: {
          id?: string
          ignored?: boolean | null
          partner_id?: string | null
          project_id?: string
          whatsapp_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "sender_mappings_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sender_mappings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
