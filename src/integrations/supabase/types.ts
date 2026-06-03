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
      autoeval_responses: {
        Row: {
          company_id: string
          created_at: string
          evidence: string | null
          id: string
          observations: string | null
          standard_id: string
          status: Database["public"]["Enums"]["compliance_status"]
          updated_at: string
          updated_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          evidence?: string | null
          id?: string
          observations?: string | null
          standard_id: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
          updated_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          evidence?: string | null
          id?: string
          observations?: string | null
          standard_id?: string
          status?: Database["public"]["Enums"]["compliance_status"]
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "autoeval_responses_standard_id_fkey"
            columns: ["standard_id"]
            isOneToOne: false
            referencedRelation: "autoeval_standards"
            referencedColumns: ["id"]
          },
        ]
      }
      autoeval_standards: {
        Row: {
          code: string
          cycle: Database["public"]["Enums"]["phva_cycle"]
          id: string
          item: string
          sort_order: number
          weight: number
        }
        Insert: {
          code: string
          cycle: Database["public"]["Enums"]["phva_cycle"]
          id?: string
          item: string
          sort_order?: number
          weight?: number
        }
        Update: {
          code?: string
          cycle?: Database["public"]["Enums"]["phva_cycle"]
          id?: string
          item?: string
          sort_order?: number
          weight?: number
        }
        Relationships: []
      }
      committee_meetings: {
        Row: {
          committee_id: string
          created_at: string
          created_by: string
          decisions: string | null
          held_at: string
          id: string
          minutes_url: string | null
          topics: string | null
        }
        Insert: {
          committee_id: string
          created_at?: string
          created_by: string
          decisions?: string | null
          held_at: string
          id?: string
          minutes_url?: string | null
          topics?: string | null
        }
        Update: {
          committee_id?: string
          created_at?: string
          created_by?: string
          decisions?: string | null
          held_at?: string
          id?: string
          minutes_url?: string | null
          topics?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "committee_meetings_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      committee_members: {
        Row: {
          committee_id: string
          created_at: string
          id: string
          position: string | null
          user_id: string
        }
        Insert: {
          committee_id: string
          created_at?: string
          id?: string
          position?: string | null
          user_id: string
        }
        Update: {
          committee_id?: string
          created_at?: string
          id?: string
          position?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "committee_members_committee_id_fkey"
            columns: ["committee_id"]
            isOneToOne: false
            referencedRelation: "committees"
            referencedColumns: ["id"]
          },
        ]
      }
      committees: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          period_end: string | null
          period_start: string | null
          type: Database["public"]["Enums"]["committee_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          period_end?: string | null
          period_start?: string | null
          type: Database["public"]["Enums"]["committee_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          period_end?: string | null
          period_start?: string | null
          type?: Database["public"]["Enums"]["committee_type"]
        }
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          nit: string | null
          sector: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          nit?: string | null
          sector?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          nit?: string | null
          sector?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          id: string
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          created_at?: string
          id?: string
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          id?: string
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          title: string
          uploaded_by: string
          url: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          title: string
          uploaded_by: string
          url?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          title?: string
          uploaded_by?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      drills: {
        Row: {
          company_id: string
          conducted_at: string | null
          created_at: string
          created_by: string
          evacuation_time_sec: number | null
          id: string
          improvements: string | null
          observations: string | null
          participants: number | null
          scenario: string
          scheduled_at: string
        }
        Insert: {
          company_id: string
          conducted_at?: string | null
          created_at?: string
          created_by: string
          evacuation_time_sec?: number | null
          id?: string
          improvements?: string | null
          observations?: string | null
          participants?: number | null
          scenario: string
          scheduled_at: string
        }
        Update: {
          company_id?: string
          conducted_at?: string | null
          created_at?: string
          created_by?: string
          evacuation_time_sec?: number | null
          id?: string
          improvements?: string | null
          observations?: string | null
          participants?: number | null
          scenario?: string
          scheduled_at?: string
        }
        Relationships: []
      }
      epp_deliveries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          delivered_at: string
          epp_item_id: string
          id: string
          observations: string | null
          quantity: number
          signature: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          delivered_at?: string
          epp_item_id: string
          id?: string
          observations?: string | null
          quantity?: number
          signature?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          delivered_at?: string
          epp_item_id?: string
          id?: string
          observations?: string | null
          quantity?: number
          signature?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epp_deliveries_epp_item_id_fkey"
            columns: ["epp_item_id"]
            isOneToOne: false
            referencedRelation: "epp_items"
            referencedColumns: ["id"]
          },
        ]
      }
      epp_items: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          lifespan_months: number | null
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          lifespan_months?: number | null
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          lifespan_months?: number | null
          name?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          company_id: string
          created_at: string
          description: string
          id: string
          immediate_actions: string | null
          location: string | null
          occurred_at: string
          reported_by: string
          severity: Database["public"]["Enums"]["severity_level"]
          status: Database["public"]["Enums"]["incident_status"]
          type: Database["public"]["Enums"]["incident_type"]
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          id?: string
          immediate_actions?: string | null
          location?: string | null
          occurred_at?: string
          reported_by: string
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
          type: Database["public"]["Enums"]["incident_type"]
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          immediate_actions?: string | null
          location?: string | null
          occurred_at?: string
          reported_by?: string
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
          type?: Database["public"]["Enums"]["incident_type"]
        }
        Relationships: [
          {
            foreignKeyName: "incidents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_findings: {
        Row: {
          action_plan: string | null
          created_at: string
          description: string
          due_date: string | null
          id: string
          inspection_id: string
          responsible: string | null
          severity: Database["public"]["Enums"]["severity_level"]
          status: Database["public"]["Enums"]["finding_status"]
        }
        Insert: {
          action_plan?: string | null
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          inspection_id: string
          responsible?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["finding_status"]
        }
        Update: {
          action_plan?: string | null
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          inspection_id?: string
          responsible?: string | null
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["finding_status"]
        }
        Relationships: [
          {
            foreignKeyName: "inspection_findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          area: string
          company_id: string
          created_at: string
          created_by: string
          id: string
          inspection_type: string
          inspector_id: string | null
          observations: string | null
          performed_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["inspection_status"]
        }
        Insert: {
          area: string
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          inspection_type: string
          inspector_id?: string | null
          observations?: string | null
          performed_at?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["inspection_status"]
        }
        Update: {
          area?: string
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          inspection_type?: string
          inspector_id?: string | null
          observations?: string | null
          performed_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["inspection_status"]
        }
        Relationships: []
      }
      medical_exams: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          performed_at: string
          provider: string | null
          restrictions: string | null
          result: string | null
          type: Database["public"]["Enums"]["exam_type"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          performed_at: string
          provider?: string | null
          restrictions?: string | null
          result?: string | null
          type: Database["public"]["Enums"]["exam_type"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          performed_at?: string
          provider?: string | null
          restrictions?: string | null
          result?: string | null
          type?: Database["public"]["Enums"]["exam_type"]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          document_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_id?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      risk_matrix: {
        Row: {
          activity: string
          company_id: string
          controls: string | null
          created_at: string
          created_by: string
          hazard: string
          id: string
          process: string
          responsible: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
        }
        Insert: {
          activity: string
          company_id: string
          controls?: string | null
          created_at?: string
          created_by: string
          hazard: string
          id?: string
          process: string
          responsible?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
        }
        Update: {
          activity?: string
          company_id?: string
          controls?: string | null
          created_at?: string
          created_by?: string
          hazard?: string
          id?: string
          process?: string
          responsible?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
        }
        Relationships: [
          {
            foreignKeyName: "risk_matrix_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_approvals: {
        Row: {
          approval_notes: string | null
          approval_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          company_id: string
          conditions_ok: boolean
          created_at: string
          ended_at: string | null
          epp_checklist: Json
          health_ok: boolean
          id: string
          latitude: number | null
          location_accuracy: number | null
          longitude: number | null
          notes: string | null
          questionnaire: Json
          selfie_path: string | null
          selfie_url: string | null
          signature: string
          started_at: string
          user_id: string
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          conditions_ok?: boolean
          created_at?: string
          ended_at?: string | null
          epp_checklist?: Json
          health_ok?: boolean
          id?: string
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          notes?: string | null
          questionnaire?: Json
          selfie_path?: string | null
          selfie_url?: string | null
          signature: string
          started_at?: string
          user_id: string
        }
        Update: {
          approval_notes?: string | null
          approval_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          conditions_ok?: boolean
          created_at?: string
          ended_at?: string | null
          epp_checklist?: Json
          health_ok?: boolean
          id?: string
          latitude?: number | null
          location_accuracy?: number | null
          longitude?: number | null
          notes?: string | null
          questionnaire?: Json
          selfie_path?: string | null
          selfie_url?: string | null
          signature?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          singleton: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          singleton?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          singleton?: boolean
          user_id?: string
        }
        Relationships: []
      }
      training_attendees: {
        Row: {
          attended: boolean
          created_at: string
          id: string
          signature: string | null
          training_id: string
          user_id: string
        }
        Insert: {
          attended?: boolean
          created_at?: string
          id?: string
          signature?: string | null
          training_id: string
          user_id: string
        }
        Update: {
          attended?: boolean
          created_at?: string
          id?: string
          signature?: string | null
          training_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_attendees_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          duration_hours: number | null
          id: string
          notes: string | null
          scheduled_at: string
          title: string
          topic: string | null
          trainer: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          duration_hours?: number | null
          id?: string
          notes?: string | null
          scheduled_at: string
          title: string
          topic?: string | null
          trainer?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          duration_hours?: number | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          title?: string
          topic?: string | null
          trainer?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_company_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "supervisor" | "worker"
      approval_status: "pendiente" | "aprobado" | "rechazado"
      committee_type: "copasst" | "convivencia" | "brigada"
      compliance_status: "no_evaluado" | "cumple" | "no_cumple" | "no_aplica"
      exam_type:
        | "ingreso"
        | "periodico"
        | "egreso"
        | "reintegro"
        | "post_incapacidad"
      finding_status: "abierto" | "en_proceso" | "cerrado"
      incident_status: "abierto" | "en_revision" | "cerrado"
      incident_type: "incidente" | "accidente" | "casi_accidente"
      inspection_status: "planeada" | "realizada" | "cerrada"
      membership_status: "pendiente" | "aprobado" | "rechazado"
      phva_cycle: "planear" | "hacer" | "verificar" | "actuar"
      risk_level: "baja" | "media" | "alta" | "critica"
      severity_level: "baja" | "media" | "alta" | "critica"
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
      app_role: ["admin", "supervisor", "worker"],
      approval_status: ["pendiente", "aprobado", "rechazado"],
      committee_type: ["copasst", "convivencia", "brigada"],
      compliance_status: ["no_evaluado", "cumple", "no_cumple", "no_aplica"],
      exam_type: [
        "ingreso",
        "periodico",
        "egreso",
        "reintegro",
        "post_incapacidad",
      ],
      finding_status: ["abierto", "en_proceso", "cerrado"],
      incident_status: ["abierto", "en_revision", "cerrado"],
      incident_type: ["incidente", "accidente", "casi_accidente"],
      inspection_status: ["planeada", "realizada", "cerrada"],
      membership_status: ["pendiente", "aprobado", "rechazado"],
      phva_cycle: ["planear", "hacer", "verificar", "actuar"],
      risk_level: ["baja", "media", "alta", "critica"],
      severity_level: ["baja", "media", "alta", "critica"],
    },
  },
} as const
