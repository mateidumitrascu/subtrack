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
      dismissed_recommendations: {
        Row: {
          dismissed_at: string
          recommendation_id: string
          user_id: string
        }
        Insert: {
          dismissed_at?: string
          recommendation_id: string
          user_id?: string
        }
        Update: {
          dismissed_at?: string
          recommendation_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_reads: {
        Row: {
          notification_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: string
          read_at?: string
          user_id?: string
        }
        Update: {
          notification_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pauses: {
        Row: {
          from_date: string
          id: number
          subscription_id: string
          to_date: string | null
          user_id: string
        }
        Insert: {
          from_date: string
          id?: never
          subscription_id: string
          to_date?: string | null
          user_id: string
        }
        Update: {
          from_date?: string
          id?: never
          subscription_id?: string
          to_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pauses_subscription_id_user_id_fkey"
            columns: ["subscription_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      price_points: {
        Row: {
          amount: number
          effective_date: string
          is_plan_change: boolean
          subscription_id: string
          user_id: string
        }
        Insert: {
          amount: number
          effective_date: string
          is_plan_change?: boolean
          subscription_id: string
          user_id: string
        }
        Update: {
          amount?: number
          effective_date?: string
          is_plan_change?: boolean
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_points_subscription_id_user_id_fkey"
            columns: ["subscription_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          base_currency: Database["public"]["Enums"]["currency_code"]
          created_at: string
          default_reminder_days: number
          display_name: string | null
          id: string
          is_student: boolean
          lang: Database["public"]["Enums"]["app_language"]
          notify_digest: boolean
          notify_email: boolean
          notify_push: boolean
          rate_eur: number
          rate_usd: number
          timezone: string
          updated_at: string
        }
        Insert: {
          base_currency?: Database["public"]["Enums"]["currency_code"]
          created_at?: string
          default_reminder_days?: number
          display_name?: string | null
          id: string
          is_student?: boolean
          lang?: Database["public"]["Enums"]["app_language"]
          notify_digest?: boolean
          notify_email?: boolean
          notify_push?: boolean
          rate_eur?: number
          rate_usd?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          base_currency?: Database["public"]["Enums"]["currency_code"]
          created_at?: string
          default_reminder_days?: number
          display_name?: string | null
          id?: string
          is_student?: boolean
          lang?: Database["public"]["Enums"]["app_language"]
          notify_digest?: boolean
          notify_email?: boolean
          notify_push?: boolean
          rate_eur?: number
          rate_usd?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      schedule_segments: {
        Row: {
          cycle: Database["public"]["Enums"]["billing_cycle"]
          from_date: string
          start_date: string
          subscription_id: string
          user_id: string
        }
        Insert: {
          cycle: Database["public"]["Enums"]["billing_cycle"]
          from_date: string
          start_date: string
          subscription_id: string
          user_id: string
        }
        Update: {
          cycle?: Database["public"]["Enums"]["billing_cycle"]
          from_date?: string
          start_date?: string
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_segments_subscription_id_user_id_fkey"
            columns: ["subscription_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
      service_offers: {
        Row: {
          currency: Database["public"]["Enums"]["currency_code"]
          cycle: Database["public"]["Enums"]["billing_cycle"]
          kind: Database["public"]["Enums"]["offer_kind"]
          plan: string | null
          price: number
          service_id: string
        }
        Insert: {
          currency: Database["public"]["Enums"]["currency_code"]
          cycle: Database["public"]["Enums"]["billing_cycle"]
          kind: Database["public"]["Enums"]["offer_kind"]
          plan?: string | null
          price: number
          service_id: string
        }
        Update: {
          currency?: Database["public"]["Enums"]["currency_code"]
          cycle?: Database["public"]["Enums"]["billing_cycle"]
          kind?: Database["public"]["Enums"]["offer_kind"]
          plan?: string | null
          price?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_offers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "catalog_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_offers_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: Database["public"]["Enums"]["service_category"]
          color: string | null
          created_at: string
          id: string
          name: string
          overlap: Database["public"]["Enums"]["overlap_group"] | null
          popular_rank: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["service_category"]
          color?: string | null
          created_at?: string
          id: string
          name: string
          overlap?: Database["public"]["Enums"]["overlap_group"] | null
          popular_rank?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["service_category"]
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          overlap?: Database["public"]["Enums"]["overlap_group"] | null
          popular_rank?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          category: Database["public"]["Enums"]["service_category"]
          created_at: string
          created_on: string
          currency: Database["public"]["Enums"]["currency_code"]
          id: string
          name: string
          notes: string | null
          payment_method: string | null
          plan: string | null
          reminder_days: number
          service_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
          usage: Database["public"]["Enums"]["usage_frequency"]
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          created_on?: string
          currency: Database["public"]["Enums"]["currency_code"]
          id?: string
          name: string
          notes?: string | null
          payment_method?: string | null
          plan?: string | null
          reminder_days?: number
          service_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          usage?: Database["public"]["Enums"]["usage_frequency"]
          user_id?: string
        }
        Update: {
          cancelled_at?: string | null
          category?: Database["public"]["Enums"]["service_category"]
          created_at?: string
          created_on?: string
          currency?: Database["public"]["Enums"]["currency_code"]
          id?: string
          name?: string
          notes?: string | null
          payment_method?: string | null
          plan?: string | null
          reminder_days?: number
          service_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
          usage?: Database["public"]["Enums"]["usage_frequency"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "catalog_services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      catalog_services: {
        Row: {
          annual: Json | null
          category: Database["public"]["Enums"]["service_category"] | null
          cheaper: Json | null
          color: string | null
          defaults: Json | null
          id: string | null
          name: string | null
          overlap: Database["public"]["Enums"]["overlap_group"] | null
          popular_rank: number | null
          student: Json | null
        }
        Insert: {
          annual?: never
          category?: Database["public"]["Enums"]["service_category"] | null
          cheaper?: never
          color?: string | null
          defaults?: never
          id?: string | null
          name?: string | null
          overlap?: Database["public"]["Enums"]["overlap_group"] | null
          popular_rank?: number | null
          student?: never
        }
        Update: {
          annual?: never
          category?: Database["public"]["Enums"]["service_category"] | null
          cheaper?: never
          color?: string | null
          defaults?: never
          id?: string | null
          name?: string | null
          overlap?: Database["public"]["Enums"]["overlap_group"] | null
          popular_rank?: number | null
          student?: never
        }
        Relationships: []
      }
      price_changes: {
        Row: {
          change_date: string | null
          new_amount: number | null
          old_amount: number | null
          pct: number | null
          subscription_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_points_subscription_id_user_id_fkey"
            columns: ["subscription_id", "user_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id", "user_id"]
          },
        ]
      }
    }
    Functions: {
      add_cycle: {
        Args: {
          p_cycle: Database["public"]["Enums"]["billing_cycle"]
          p_date: string
          p_n: number
        }
        Returns: string
      }
      cancel_subscription: {
        Args: { p_id: string; p_today?: string }
        Returns: Json
      }
      charge_dates: {
        Args: { p_from: string; p_subscription_id: string; p_to: string }
        Returns: string[]
      }
      clear_my_data: { Args: never; Returns: undefined }
      convert_amount: {
        Args: {
          p_amount: number
          p_from: Database["public"]["Enums"]["currency_code"]
          p_rate_eur: number
          p_rate_usd: number
          p_to: Database["public"]["Enums"]["currency_code"]
        }
        Returns: number
      }
      create_subscription: {
        Args: { p_input: Json; p_today?: string }
        Returns: Json
      }
      current_terms: {
        Args: { p_subscription_id: string; p_today: string }
        Returns: {
          cycle: Database["public"]["Enums"]["billing_cycle"]
          next_date: string
          price: number
        }[]
      }
      cycle_at: {
        Args: { p_date: string; p_subscription_id: string }
        Returns: Database["public"]["Enums"]["billing_cycle"]
      }
      delete_subscription: { Args: { p_id: string }; Returns: Json }
      effective_status: {
        Args: {
          p_status: Database["public"]["Enums"]["subscription_status"]
          p_today: string
          p_trial_ends_at: string
        }
        Returns: Database["public"]["Enums"]["subscription_status"]
      }
      get_charges: {
        Args: { p_from: string; p_to: string }
        Returns: {
          amount: number
          amount_base: number
          base_currency: Database["public"]["Enums"]["currency_code"]
          charge_date: string
          currency: Database["public"]["Enums"]["currency_code"]
          subscription_id: string
          user_id: string
        }[]
      }
      get_subscription: { Args: { p_id: string }; Returns: Json }
      get_subscriptions: { Args: never; Returns: Json }
      import_subscriptions: { Args: { p_subscriptions: Json }; Returns: Json }
      next_charge: {
        Args: { p_subscription_id: string; p_today: string }
        Returns: string
      }
      pause_subscription: {
        Args: { p_id: string; p_today?: string }
        Returns: Json
      }
      price_at: {
        Args: { p_date: string; p_subscription_id: string }
        Returns: number
      }
      restore_subscription: { Args: { p_snapshot: Json }; Returns: Json }
      resume_subscription: {
        Args: { p_id: string; p_today?: string }
        Returns: Json
      }
      seed_demo_data: { Args: { p_today?: string }; Returns: Json }
      switch_plan: {
        Args: {
          p_cycle: Database["public"]["Enums"]["billing_cycle"]
          p_id: string
          p_plan: string
          p_price: number
          p_today?: string
        }
        Returns: Json
      }
      update_subscription: {
        Args: { p_id: string; p_input: Json; p_today?: string }
        Returns: Json
      }
    }
    Enums: {
      app_language: "ro" | "en"
      billing_cycle: "weekly" | "monthly" | "quarterly" | "yearly"
      currency_code: "RON" | "EUR" | "USD"
      offer_kind: "default" | "student" | "cheaper" | "annual"
      overlap_group: "music" | "video" | "cloud"
      service_category:
        | "video"
        | "music"
        | "software"
        | "cloud"
        | "gaming"
        | "education"
        | "fitness"
        | "other"
      subscription_status: "active" | "trial" | "paused" | "cancelled"
      usage_frequency: "daily" | "weekly" | "monthly" | "rarely"
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
    Enums: {
      app_language: ["ro", "en"],
      billing_cycle: ["weekly", "monthly", "quarterly", "yearly"],
      currency_code: ["RON", "EUR", "USD"],
      offer_kind: ["default", "student", "cheaper", "annual"],
      overlap_group: ["music", "video", "cloud"],
      service_category: [
        "video",
        "music",
        "software",
        "cloud",
        "gaming",
        "education",
        "fitness",
        "other",
      ],
      subscription_status: ["active", "trial", "paused", "cancelled"],
      usage_frequency: ["daily", "weekly", "monthly", "rarely"],
    },
  },
} as const
