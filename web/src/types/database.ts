// AUTO-GENERATED from the Supabase schema. Do not edit by hand.
// Regenerate after each migration:  cd web && bun run gen:types
// (uses `supabase gen types typescript --project-id <ref>`; the backend also
//  regenerates this via the Supabase MCP after applying migrations.)

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
      catalog_versions: {
        Row: {
          created_at: string
          created_by: string | null
          document: Json
          id: string
          label: string | null
          published_at: string | null
          shop_id: string
          status: Database["public"]["Enums"]["catalog_version_status"]
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document?: Json
          id?: string
          label?: string | null
          published_at?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["catalog_version_status"]
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document?: Json
          id?: string
          label?: string | null
          published_at?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["catalog_version_status"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "catalog_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_versions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      shop_legal: {
        Row: {
          created_at: string
          fiscal_code: string | null
          legal_address: string | null
          legal_form: string | null
          legal_name: string | null
          reg_com: string | null
          shop_id: string
          updated_at: string
          vat_number: string | null
          vat_payer: boolean
        }
        Insert: {
          created_at?: string
          fiscal_code?: string | null
          legal_address?: string | null
          legal_form?: string | null
          legal_name?: string | null
          reg_com?: string | null
          shop_id: string
          updated_at?: string
          vat_number?: string | null
          vat_payer?: boolean
        }
        Update: {
          created_at?: string
          fiscal_code?: string | null
          legal_address?: string | null
          legal_form?: string | null
          legal_name?: string | null
          reg_com?: string | null
          shop_id?: string
          updated_at?: string
          vat_number?: string | null
          vat_payer?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "shop_legal_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_permissions: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          role: Database["public"]["Enums"]["shop_role"]
          shop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          role?: Database["public"]["Enums"]["shop_role"]
          shop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          role?: Database["public"]["Enums"]["shop_role"]
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_permissions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          active_version_id: string | null
          address: string | null
          banner_path: string | null
          created_at: string
          description: string | null
          id: string
          logo_path: string | null
          name: string
          phone: string | null
          schedule: Json | null
          schedule_overrides: Json | null
        }
        Insert: {
          active_version_id?: string | null
          address?: string | null
          banner_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name: string
          phone?: string | null
          schedule?: Json | null
          schedule_overrides?: Json | null
        }
        Update: {
          active_version_id?: string | null
          address?: string | null
          banner_path?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_path?: string | null
          name?: string
          phone?: string | null
          schedule?: Json | null
          schedule_overrides?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_active_version_id_fkey"
            columns: ["active_version_id"]
            isOneToOne: false
            referencedRelation: "catalog_versions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_catalog_draft: {
        Args: { p_label?: string; p_shop_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          document: Json
          id: string
          label: string | null
          published_at: string | null
          shop_id: string
          status: Database["public"]["Enums"]["catalog_version_status"]
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "catalog_versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_shop_member: {
        Args: {
          p_min_role?: Database["public"]["Enums"]["shop_role"]
          p_shop_id: string
        }
        Returns: boolean
      }
      set_active_catalog_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
    }
    Enums: {
      catalog_version_status: "draft" | "published" | "archived"
      shop_role: "staff" | "catalog" | "owner"
      user_role: "customer" | "shop"
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
      catalog_version_status: ["draft", "published", "archived"],
      shop_role: ["staff", "catalog", "owner"],
      user_role: ["customer", "shop"],
    },
  },
} as const
