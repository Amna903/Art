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
      artworks: {
        Row: {
          artist_id: string
          country: string | null
          created_at: string
          description: string | null
          dimensions: string | null
          id: string
          image_url: string
          medium: string | null
          price_usd: number
          slug: string
          status: Database["public"]["Enums"]["artwork_status"]
          title: string
          updated_at: string
          year: number | null
        }
        Insert: {
          artist_id: string
          country?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string
          medium?: string | null
          price_usd?: number
          slug: string
          status?: Database["public"]["Enums"]["artwork_status"]
          title: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          artist_id?: string
          country?: string | null
          created_at?: string
          description?: string | null
          dimensions?: string | null
          id?: string
          image_url?: string
          medium?: string | null
          price_usd?: number
          slug?: string
          status?: Database["public"]["Enums"]["artwork_status"]
          title?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          cover_image_url: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          cover_image_url?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          cover_image_url?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      collection_artworks: {
        Row: {
          collection_id: string
          artwork_id: string
          created_at: string
        }
        Insert: {
          collection_id: string
          artwork_id: string
          created_at?: string
        }
        Update: {
          collection_id?: string
          artwork_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_artworks_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_artworks_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      country_sounds: {
        Row: {
          audio_url: string
          country_slug: string
          created_at: string
          title: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          audio_url: string
          country_slug: string
          created_at?: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          audio_url?: string
          country_slug?: string
          created_at?: string
          title?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          id: string
          artwork_slug: string
          artwork_title: string
          artist_name: string | null
          name: string
          email: string
          message: string | null
          status: Database["public"]["Enums"]["enquiry_status"]
          user_id: string | null
          quoted_price: number | null
          quote_token: string | null
          quote_token_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          artwork_slug: string
          artwork_title: string
          artist_name?: string | null
          name: string
          email: string
          message?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          user_id?: string | null
          quoted_price?: number | null
          quote_token?: string | null
          quote_token_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          artwork_slug?: string
          artwork_title?: string
          artist_name?: string | null
          name?: string
          email?: string
          message?: string | null
          status?: Database["public"]["Enums"]["enquiry_status"]
          user_id?: string | null
          quoted_price?: number | null
          quote_token?: string | null
          quote_token_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      exhibitions: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          cover_image_url: string
          location: string | null
          date_label: string | null
          status: Database["public"]["Enums"]["exhibition_status"]
          country: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          cover_image_url?: string
          location?: string | null
          date_label?: string | null
          status?: Database["public"]["Enums"]["exhibition_status"]
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          cover_image_url?: string
          location?: string | null
          date_label?: string | null
          status?: Database["public"]["Enums"]["exhibition_status"]
          country?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          artwork_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          artwork_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          artwork_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_posts: {
        Row: {
          id: string
          title: string
          slug: string
          category: string
          excerpt: string | null
          content: string
          cover_image_url: string
          read_minutes: number | null
          country: string | null
          is_pinned: boolean
          quote_author: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          category?: string
          excerpt?: string | null
          content?: string
          cover_image_url?: string
          read_minutes?: number | null
          country?: string | null
          is_pinned?: boolean
          quote_author?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          category?: string
          excerpt?: string | null
          content?: string
          cover_image_url?: string
          read_minutes?: number | null
          country?: string | null
          is_pinned?: boolean
          quote_author?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          artist_id: string
          artwork_id: string
          created_at: string
          id: string
          order_id: string
          price_usd: number
        }
        Insert: {
          artist_id: string
          artwork_id: string
          created_at?: string
          id?: string
          order_id: string
          price_usd: number
        }
        Update: {
          artist_id?: string
          artwork_id?: string
          created_at?: string
          id?: string
          order_id?: string
          price_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_artwork_id_fkey"
            columns: ["artwork_id"]
            isOneToOne: false
            referencedRelation: "artworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"]
          total_usd: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          total_usd?: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          total_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      page_blocks: {
        Row: {
          id: string
          page: string
          block_key: string
          value: string
          alt_text: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          page: string
          block_key: string
          value?: string
          alt_text?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          page?: string
          block_key?: string
          value?: string
          alt_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
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
      followed_artists: {
        Row: {
          id: string
          user_id: string
          artist_slug: string
          artist_name: string
          artist_image: string | null
          technique: string | null
          country_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          artist_slug: string
          artist_name: string
          artist_image?: string | null
          technique?: string | null
          country_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          artist_slug?: string
          artist_name?: string
          artist_image?: string | null
          technique?: string | null
          country_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      saved_artworks: {
        Row: {
          id: string
          user_id: string
          artwork_slug: string
          artwork_title: string
          artist_name: string | null
          artwork_image: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          artwork_slug: string
          artwork_title: string
          artist_name?: string | null
          artwork_image?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          artwork_slug?: string
          artwork_title?: string
          artist_name?: string | null
          artwork_image?: string | null
          created_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          id: string
          artwork_slug: string
          user_id: string | null
          author_name: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          artwork_slug: string
          user_id?: string | null
          author_name: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          artwork_slug?: string
          user_id?: string | null
          author_name?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_top_requested_artwork_slugs: {
        Args: { limit_count?: number }
        Returns: {
          artwork_slug: string
          request_count: number
        }[]
      }
      get_quote_by_token: {
        Args: { p_token: string }
        Returns: {
          id: string
          artwork_title: string
          artist_name: string | null
          name: string
          quoted_price: number | null
          status: Database["public"]["Enums"]["enquiry_status"]
          quote_token_expires_at: string | null
        }[]
      }
      get_my_primary_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      set_my_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: void
      }
    }
    Enums: {
      app_role: "admin" | "artist" | "client"
      artwork_status: "draft" | "published" | "sold" | "archived"
      enquiry_status: "new" | "contacted" | "quoted" | "closed"
      exhibition_status: "upcoming" | "current" | "past"
      order_status: "pending" | "paid" | "shipped" | "completed" | "cancelled"
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
      app_role: ["admin", "artist", "client"],
      artwork_status: ["draft", "published", "sold", "archived"],
      enquiry_status: ["new", "contacted", "quoted", "closed"],
      order_status: ["pending", "paid", "shipped", "completed", "cancelled"],
    },
  },
} as const
