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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_settings: {
        Row: {
          id: string
          metered_app_name: string | null
          metered_secret_key: string | null
          nextsms_password: string | null
          nextsms_sender_id: string | null
          nextsms_username: string | null
          updated_at: string | null
          zenopay_api_key: string | null
        }
        Insert: {
          id?: string
          metered_app_name?: string | null
          metered_secret_key?: string | null
          nextsms_password?: string | null
          nextsms_sender_id?: string | null
          nextsms_username?: string | null
          updated_at?: string | null
          zenopay_api_key?: string | null
        }
        Update: {
          id?: string
          metered_app_name?: string | null
          metered_secret_key?: string | null
          nextsms_password?: string | null
          nextsms_sender_id?: string | null
          nextsms_username?: string | null
          updated_at?: string | null
          zenopay_api_key?: string | null
        }
        Relationships: []
      }
      earning_history: {
        Row: {
          amount: number
          call_id: string
          caller_name: string
          created_at: string | null
          duration_minutes: number
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          call_id: string
          caller_name: string
          created_at?: string | null
          duration_minutes: number
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          call_id?: string
          caller_name?: string
          created_at?: string | null
          duration_minutes?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "earning_history_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "video_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          custom_price_per_second: number | null
          date_of_birth: string | null
          description: string | null
          force_online: boolean | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_blocked: boolean | null
          is_kyc_completed: boolean | null
          is_online: boolean | null
          last_active: string | null
          phone_number: string
          profile_picture_url: string | null
          region: string
          updated_at: string | null
          username: string | null
          video_call_enabled: boolean | null
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          custom_price_per_second?: number | null
          date_of_birth?: string | null
          description?: string | null
          force_online?: boolean | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_blocked?: boolean | null
          is_kyc_completed?: boolean | null
          is_online?: boolean | null
          last_active?: string | null
          phone_number: string
          profile_picture_url?: string | null
          region: string
          updated_at?: string | null
          username?: string | null
          video_call_enabled?: boolean | null
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          custom_price_per_second?: number | null
          date_of_birth?: string | null
          description?: string | null
          force_online?: boolean | null
          full_name?: string | null
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_blocked?: boolean | null
          is_kyc_completed?: boolean | null
          is_online?: boolean | null
          last_active?: string | null
          phone_number?: string
          profile_picture_url?: string | null
          region?: string
          updated_at?: string | null
          username?: string | null
          video_call_enabled?: boolean | null
          view_count?: number | null
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_id: string | null
          package: Database["public"]["Enums"]["subscription_package"]
          phone_number: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          package: Database["public"]["Enums"]["subscription_package"]
          phone_number: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          package?: Database["public"]["Enums"]["subscription_package"]
          phone_number?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_paid: number | null
          created_at: string | null
          end_date: string
          id: string
          is_active: boolean | null
          package: Database["public"]["Enums"]["subscription_package"]
          payment_id: string | null
          start_date: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          package: Database["public"]["Enums"]["subscription_package"]
          payment_id?: string | null
          start_date?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          package?: Database["public"]["Enums"]["subscription_package"]
          payment_id?: string | null
          start_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "subscription_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      topup_history: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          order_id: string | null
          phone_number: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          phone_number: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string | null
          phone_number?: string
          status?: string | null
          user_id?: string
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
        Relationships: []
      }
      video_calls: {
        Row: {
          caller_id: string
          created_at: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          is_confirmed: boolean | null
          price_per_second: number
          recipient_id: string
          start_time: string | null
          status: string | null
          total_charged: number | null
        }
        Insert: {
          caller_id: string
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          is_confirmed?: boolean | null
          price_per_second: number
          recipient_id: string
          start_time?: string | null
          status?: string | null
          total_charged?: number | null
        }
        Update: {
          caller_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          is_confirmed?: boolean | null
          price_per_second?: number
          recipient_id?: string
          start_time?: string | null
          status?: string | null
          total_charged?: number | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          account_balance: number | null
          active_earning: number | null
          created_at: string | null
          id: string
          total_withdrawn: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_balance?: number | null
          active_earning?: number | null
          created_at?: string | null
          id?: string
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_balance?: number | null
          active_earning?: number | null
          created_at?: string | null
          id?: string
          total_withdrawn?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      withdraw_history: {
        Row: {
          amount: number
          created_at: string | null
          fee: number
          id: string
          net_amount: number
          phone_number: string
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          fee: number
          id?: string
          net_amount: number
          phone_number: string
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          fee?: number
          id?: string
          net_amount?: number
          phone_number?: string
          status?: string | null
          user_id?: string
        }
        Relationships: []
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
    }
    Enums: {
      app_role: "admin" | "user"
      gender_type: "male" | "female"
      subscription_package: "diamond" | "platinum" | "silver"
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
      gender_type: ["male", "female"],
      subscription_package: ["diamond", "platinum", "silver"],
    },
  },
} as const
