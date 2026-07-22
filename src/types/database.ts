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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
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
  public: {
    Tables: {
      drink_ratings: {
        Row: {
          created_at: string | null
          drink_id: string | null
          feedback_tags: string[] | null
          id: string
          rating: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          drink_id?: string | null
          feedback_tags?: string[] | null
          id?: string
          rating?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          drink_id?: string | null
          feedback_tags?: string[] | null
          id?: string
          rating?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drink_ratings_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drink_ratings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "recommendation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      drinks: {
        Row: {
          acidity_score: number | null
          availability_regions: string[] | null
          bitterness_score: number | null
          body_score: number | null
          brand: string | null
          carbonation_score: number | null
          category: string
          complexity_score: number | null
          created_at: string | null
          description: string | null
          drink_family: string | null
          flavor_tags: string[] | null
          food_pairing_tags: string[] | null
          id: string
          image_url: string | null
          intensity_score: number | null
          is_active: boolean | null
          name: string
          normalized_name: string | null
          occasion_tags: string[] | null
          price_range: string | null
          product_url: string | null
          subcategory: string | null
          sweetness_score: number | null
          updated_at: string | null
        }
        Insert: {
          acidity_score?: number | null
          availability_regions?: string[] | null
          bitterness_score?: number | null
          body_score?: number | null
          brand?: string | null
          carbonation_score?: number | null
          category: string
          complexity_score?: number | null
          created_at?: string | null
          description?: string | null
          drink_family?: string | null
          flavor_tags?: string[] | null
          food_pairing_tags?: string[] | null
          id?: string
          image_url?: string | null
          intensity_score?: number | null
          is_active?: boolean | null
          name: string
          normalized_name?: string | null
          occasion_tags?: string[] | null
          price_range?: string | null
          product_url?: string | null
          subcategory?: string | null
          sweetness_score?: number | null
          updated_at?: string | null
        }
        Update: {
          acidity_score?: number | null
          availability_regions?: string[] | null
          bitterness_score?: number | null
          body_score?: number | null
          brand?: string | null
          carbonation_score?: number | null
          category?: string
          complexity_score?: number | null
          created_at?: string | null
          description?: string | null
          drink_family?: string | null
          flavor_tags?: string[] | null
          food_pairing_tags?: string[] | null
          id?: string
          image_url?: string | null
          intensity_score?: number | null
          is_active?: boolean | null
          name?: string
          normalized_name?: string | null
          occasion_tags?: string[] | null
          price_range?: string | null
          product_url?: string | null
          subcategory?: string | null
          sweetness_score?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      recommendation_sessions: {
        Row: {
          context: string | null
          created_at: string | null
          engine_version: string | null
          id: string
          items: Json | null
          model_version: string | null
          recommended_drink_ids: string[] | null
          scores: Json | null
          surface: string | null
          taste_profile_id: string | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          engine_version?: string | null
          id?: string
          items?: Json | null
          model_version?: string | null
          recommended_drink_ids?: string[] | null
          scores?: Json | null
          surface?: string | null
          taste_profile_id?: string | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          engine_version?: string | null
          id?: string
          items?: Json | null
          model_version?: string | null
          recommended_drink_ids?: string[] | null
          scores?: Json | null
          surface?: string | null
          taste_profile_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_sessions_taste_profile_id_fkey"
            columns: ["taste_profile_id"]
            isOneToOne: false
            referencedRelation: "taste_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      taste_profiles: {
        Row: {
          acidity_preference: number | null
          archetype_id: string | null
          archetype_name: string | null
          avoided_flavor_tags: string[] | null
          bitterness_preference: number | null
          body_preference: number | null
          carbonation_preference: number | null
          complexity_preference: number | null
          confidence_score: number | null
          created_at: string | null
          favorite_flavor_tags: string[] | null
          id: string
          onboarding_answers: Json | null
          preferred_categories: string[] | null
          sweetness_preference: number | null
          total_ratings: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          acidity_preference?: number | null
          archetype_id?: string | null
          archetype_name?: string | null
          avoided_flavor_tags?: string[] | null
          bitterness_preference?: number | null
          body_preference?: number | null
          carbonation_preference?: number | null
          complexity_preference?: number | null
          confidence_score?: number | null
          created_at?: string | null
          favorite_flavor_tags?: string[] | null
          id?: string
          onboarding_answers?: Json | null
          preferred_categories?: string[] | null
          sweetness_preference?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          acidity_preference?: number | null
          archetype_id?: string | null
          archetype_name?: string | null
          avoided_flavor_tags?: string[] | null
          bitterness_preference?: number | null
          body_preference?: number | null
          carbonation_preference?: number | null
          complexity_preference?: number | null
          confidence_score?: number | null
          created_at?: string | null
          favorite_flavor_tags?: string[] | null
          id?: string
          onboarding_answers?: Json | null
          preferred_categories?: string[] | null
          sweetness_preference?: number | null
          total_ratings?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
