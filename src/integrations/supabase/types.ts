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
      api_usage_logs: {
        Row: {
          api_service: string
          created_at: string
          date: string
          endpoint: string
          error_message: string | null
          id: string
          request_count: number
          response_status: number | null
        }
        Insert: {
          api_service: string
          created_at?: string
          date?: string
          endpoint: string
          error_message?: string | null
          id?: string
          request_count?: number
          response_status?: number | null
        }
        Update: {
          api_service?: string
          created_at?: string
          date?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          request_count?: number
          response_status?: number | null
        }
        Relationships: []
      }
      cafe_photos: {
        Row: {
          cafe_id: string | null
          id: string
          is_approved: boolean | null
          is_hero: boolean | null
          photo_url: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          cafe_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_hero?: boolean | null
          photo_url: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          cafe_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_hero?: boolean | null
          photo_url?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_photos_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      cafe_reviews: {
        Row: {
          cafe_id: string
          created_at: string | null
          id: string
          profile_photo_url: string | null
          rating: number
          review_text: string
          reviewer_name: string
          time: string
          updated_at: string | null
        }
        Insert: {
          cafe_id: string
          created_at?: string | null
          id?: string
          profile_photo_url?: string | null
          rating: number
          review_text: string
          reviewer_name: string
          time: string
          updated_at?: string | null
        }
        Update: {
          cafe_id?: string
          created_at?: string | null
          id?: string
          profile_photo_url?: string | null
          rating?: number
          review_text?: string
          reviewer_name?: string
          time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cafe_reviews_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
        ]
      }
      cafes: {
        Row: {
          address: string
          cached_weather_data: Json | null
          created_at: string
          google_photo_reference: string | null
          google_rating: number | null
          hero_photo_url: string | null
          hero_updated_at: string | null
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          neighborhood: string | null
          opening_hours: string[] | null
          parking_info: string | null
          phone_number: string | null
          photos: string[] | null
          place_id: string
          price_level: number | null
          rating: number | null
          tags: string[]
          updated_at: string
          user_rating: number | null
          weather_cached_at: string | null
          website: string | null
        }
        Insert: {
          address: string
          cached_weather_data?: Json | null
          created_at?: string
          google_photo_reference?: string | null
          google_rating?: number | null
          hero_photo_url?: string | null
          hero_updated_at?: string | null
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          neighborhood?: string | null
          opening_hours?: string[] | null
          parking_info?: string | null
          phone_number?: string | null
          photos?: string[] | null
          place_id: string
          price_level?: number | null
          rating?: number | null
          tags?: string[]
          updated_at?: string
          user_rating?: number | null
          weather_cached_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string
          cached_weather_data?: Json | null
          created_at?: string
          google_photo_reference?: string | null
          google_rating?: number | null
          hero_photo_url?: string | null
          hero_updated_at?: string | null
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          neighborhood?: string | null
          opening_hours?: string[] | null
          parking_info?: string | null
          phone_number?: string | null
          photos?: string[] | null
          place_id?: string
          price_level?: number | null
          rating?: number | null
          tags?: string[]
          updated_at?: string
          user_rating?: number | null
          weather_cached_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          cafe_id: string
          comments: number
          created_at: string
          device_id: string | null
          id: string
          image_url: string
          likes: number
          place_id: string
          rating: number
          tags: string[]
          text_review: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          cafe_id: string
          comments?: number
          created_at?: string
          device_id?: string | null
          id?: string
          image_url: string
          likes?: number
          place_id: string
          rating: number
          tags?: string[]
          text_review: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          cafe_id?: string
          comments?: number
          created_at?: string
          device_id?: string | null
          id?: string
          image_url?: string
          likes?: number
          place_id?: string
          rating?: number
          tags?: string[]
          text_review?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_history: {
        Row: {
          cafes_processed: number | null
          created_at: string | null
          error_message: string | null
          id: string
          status: string
          sync_date: string
          sync_type: string
        }
        Insert: {
          cafes_processed?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          status: string
          sync_date: string
          sync_type: string
        }
        Update: {
          cafes_processed?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          status?: string
          sync_date?: string
          sync_type?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          avatar: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          username: string | null
        }
        Insert: {
          auth_user_id?: string | null
          avatar?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          auth_user_id?: string | null
          avatar?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      favorites: {
        Row: {
          cafe_id: string
          created_at: string
          device_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          cafe_id: string
          created_at?: string
          device_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          cafe_id?: string
          created_at?: string
          device_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "favorites_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_activities: {
        Row: {
          activity_type: string
          cafe_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          activity_type: string
          cafe_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          activity_type?: string
          cafe_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_activities_cafe_id_fkey"
            columns: ["cafe_id"]
            isOneToOne: false
            referencedRelation: "cafes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      validation_logs: {
        Row: {
          action_type: string
          cafe_id: string | null
          created_at: string
          error_reason: string | null
          id: string
          ip_address: unknown | null
          place_id: string | null
          user_agent: string | null
          user_id: string | null
          validation_result: boolean
        }
        Insert: {
          action_type: string
          cafe_id?: string | null
          created_at?: string
          error_reason?: string | null
          id?: string
          ip_address?: unknown | null
          place_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          validation_result: boolean
        }
        Update: {
          action_type?: string
          cafe_id?: string | null
          created_at?: string
          error_reason?: string | null
          id?: string
          ip_address?: unknown | null
          place_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          validation_result?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_cafe_user_rating: {
        Args: { cafe_uuid: string }
        Returns: number
      }
      update_cafe_hero_image: {
        Args: { cafe_uuid: string }
        Returns: undefined
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
