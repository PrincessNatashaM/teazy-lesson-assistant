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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      assessment_batch_items: {
        Row: {
          awarded: number | null
          batch_id: string
          confidence: number | null
          created_at: string
          error: string | null
          grade: string | null
          id: string
          max_score: number | null
          ocr_text: string | null
          percent: number | null
          result_json: Json | null
          source_file: string | null
          status: string
          student_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          awarded?: number | null
          batch_id: string
          confidence?: number | null
          created_at?: string
          error?: string | null
          grade?: string | null
          id?: string
          max_score?: number | null
          ocr_text?: string | null
          percent?: number | null
          result_json?: Json | null
          source_file?: string | null
          status?: string
          student_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          awarded?: number | null
          batch_id?: string
          confidence?: number | null
          created_at?: string
          error?: string | null
          grade?: string | null
          id?: string
          max_score?: number | null
          ocr_text?: string | null
          percent?: number | null
          result_json?: Json | null
          source_file?: string | null
          status?: string
          student_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "assessment_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_batches: {
        Row: {
          assessment_type: string | null
          avg_percent: number | null
          class_level: string
          completed_count: number
          created_at: string
          curriculum: string
          failed_count: number
          id: string
          language: string | null
          marking_scheme: string | null
          marking_style: string | null
          name: string
          question_paper: string | null
          script_count: number
          status: string
          subject: string
          subject_profile: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_type?: string | null
          avg_percent?: number | null
          class_level: string
          completed_count?: number
          created_at?: string
          curriculum: string
          failed_count?: number
          id?: string
          language?: string | null
          marking_scheme?: string | null
          marking_style?: string | null
          name: string
          question_paper?: string | null
          script_count?: number
          status?: string
          subject: string
          subject_profile?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_type?: string | null
          avg_percent?: number | null
          class_level?: string
          completed_count?: number
          created_at?: string
          curriculum?: string
          failed_count?: number
          id?: string
          language?: string | null
          marking_scheme?: string | null
          marking_style?: string | null
          name?: string
          question_paper?: string | null
          script_count?: number
          status?: string
          subject?: string
          subject_profile?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      assessment_credits: {
        Row: {
          created_at: string
          id: string
          remaining: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          remaining?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          remaining?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cached_lessons: {
        Row: {
          class_level: string
          content: string
          created_at: string
          curriculum: string
          hit_count: number
          id: string
          language: string
          subject: string
          topic_normalized: string
          updated_at: string
        }
        Insert: {
          class_level: string
          content: string
          created_at?: string
          curriculum: string
          hit_count?: number
          id?: string
          language?: string
          subject: string
          topic_normalized: string
          updated_at?: string
        }
        Update: {
          class_level?: string
          content?: string
          created_at?: string
          curriculum?: string
          hit_count?: number
          id?: string
          language?: string
          subject?: string
          topic_normalized?: string
          updated_at?: string
        }
        Relationships: []
      }
      cached_quizzes: {
        Row: {
          created_at: string
          hit_count: number
          id: string
          language: string
          lesson_hash: string
          quiz: Json
        }
        Insert: {
          created_at?: string
          hit_count?: number
          id?: string
          language?: string
          lesson_hash: string
          quiz: Json
        }
        Update: {
          created_at?: string
          hit_count?: number
          id?: string
          language?: string
          lesson_hash?: string
          quiz?: Json
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          created_at: string
          id: string
          kind: string
          lesson_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          lesson_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          lesson_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          flag: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      monthly_assessment_usage: {
        Row: {
          created_at: string
          id: string
          period_start: string
          updated_at: string
          uploads_used: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_start: string
          updated_at?: string
          uploads_used?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_start?: string
          updated_at?: string
          uploads_used?: number
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          lesson_hash: string | null
          metadata: Json | null
          paystack_reference: string
          promo_code_id: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency: string
          id?: string
          lesson_hash?: string | null
          metadata?: Json | null
          paystack_reference: string
          promo_code_id?: string | null
          purpose: Database["public"]["Enums"]["payment_purpose"]
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          lesson_hash?: string | null
          metadata?: Json | null
          paystack_reference?: string
          promo_code_id?: string | null
          purpose?: Database["public"]["Enums"]["payment_purpose"]
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          active: boolean
          applies_to: string[]
          code: string
          created_at: string
          currency: string | null
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["promo_kind"]
          max_uses: number | null
          notes: string | null
          updated_at: string
          used_count: number
          value: number
        }
        Insert: {
          active?: boolean
          applies_to?: string[]
          code: string
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["promo_kind"]
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          used_count?: number
          value?: number
        }
        Update: {
          active?: boolean
          applies_to?: string[]
          code?: string
          created_at?: string
          currency?: string | null
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["promo_kind"]
          max_uses?: number | null
          notes?: string | null
          updated_at?: string
          used_count?: number
          value?: number
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          feature_unlocked: string | null
          id: string
          payment_id: string | null
          promo_code_id: string
          purpose: Database["public"]["Enums"]["payment_purpose"] | null
          redeemed_at: string
          user_id: string
        }
        Insert: {
          feature_unlocked?: string | null
          id?: string
          payment_id?: string | null
          promo_code_id: string
          purpose?: Database["public"]["Enums"]["payment_purpose"] | null
          redeemed_at?: string
          user_id: string
        }
        Update: {
          feature_unlocked?: string | null
          id?: string
          payment_id?: string | null
          promo_code_id?: string
          purpose?: Database["public"]["Enums"]["payment_purpose"] | null
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_assessments: {
        Row: {
          assessment_type: string | null
          awarded: number | null
          class_level: string | null
          created_at: string
          curriculum: string | null
          grade: string | null
          id: string
          max_score: number | null
          percent: number | null
          result: Json
          script_text: string | null
          student_name: string | null
          subject: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_type?: string | null
          awarded?: number | null
          class_level?: string | null
          created_at?: string
          curriculum?: string | null
          grade?: string | null
          id?: string
          max_score?: number | null
          percent?: number | null
          result: Json
          script_text?: string | null
          student_name?: string | null
          subject?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_type?: string | null
          awarded?: number | null
          class_level?: string | null
          created_at?: string
          curriculum?: string | null
          grade?: string | null
          id?: string
          max_score?: number | null
          percent?: number | null
          result?: Json
          script_text?: string | null
          student_name?: string | null
          subject?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_lessons: {
        Row: {
          class_level: string | null
          content: string
          created_at: string
          curriculum: string | null
          id: string
          language: string | null
          subject: string | null
          title: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_level?: string | null
          content: string
          created_at?: string
          curriculum?: string | null
          id?: string
          language?: string | null
          subject?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_level?: string | null
          content?: string
          created_at?: string
          curriculum?: string | null
          id?: string
          language?: string | null
          subject?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_quizzes: {
        Row: {
          class_level: string | null
          created_at: string
          curriculum: string | null
          id: string
          language: string | null
          quiz: Json
          subject: string | null
          title: string
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          class_level?: string | null
          created_at?: string
          curriculum?: string | null
          id?: string
          language?: string | null
          quiz: Json
          subject?: string | null
          title: string
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          class_level?: string | null
          created_at?: string
          curriculum?: string | null
          id?: string
          language?: string | null
          quiz?: Json
          subject?: string | null
          title?: string
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          paystack_customer_code: string | null
          paystack_email_token: string | null
          paystack_subscription_code: string | null
          plan: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usage_counters: {
        Row: {
          count: number
          created_at: string
          id: string
          kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          count?: number
          created_at?: string
          id?: string
          kind: string
          updated_at?: string
          user_id: string
        }
        Update: {
          count?: number
          created_at?: string
          id?: string
          kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_assessment_upload: { Args: { _user_id: string }; Returns: Json }
      get_assessment_status: { Args: { _user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      country_code: "NG" | "GH" | "KE" | "OTHER"
      payment_purpose:
        | "download_pdf"
        | "download_docx"
        | "edit_unlock"
        | "assessment_pack_6"
        | "assessment_pack_11"
        | "subscription"
        | "sub_standard"
        | "sub_pro"
        | "assessment_pack_5"
        | "assessment_pack_10"
        | "assessment_pack_30"
      payment_status: "pending" | "success" | "failed" | "abandoned"
      promo_kind:
        | "free_access"
        | "percent_off"
        | "fixed_off"
        | "bonus_assessments"
        | "pro_days"
      subscription_status: "active" | "canceled" | "expired" | "past_due"
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
      app_role: ["admin", "user"],
      country_code: ["NG", "GH", "KE", "OTHER"],
      payment_purpose: [
        "download_pdf",
        "download_docx",
        "edit_unlock",
        "assessment_pack_6",
        "assessment_pack_11",
        "subscription",
        "sub_standard",
        "sub_pro",
        "assessment_pack_5",
        "assessment_pack_10",
        "assessment_pack_30",
      ],
      payment_status: ["pending", "success", "failed", "abandoned"],
      promo_kind: [
        "free_access",
        "percent_off",
        "fixed_off",
        "bonus_assessments",
        "pro_days",
      ],
      subscription_status: ["active", "canceled", "expired", "past_due"],
    },
  },
} as const
