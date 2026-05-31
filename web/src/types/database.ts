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
      message_reads: {
        Row: {
          last_read_at: string
          order_id: string
          profile_id: string
        }
        Insert: {
          last_read_at?: string
          order_id: string
          profile_id: string
        }
        Update: {
          last_read_at?: string
          order_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reads_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          order_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          order_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          order_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          active: boolean
          code: string | null
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          name: string
          scope: Database["public"]["Enums"]["offer_scope"]
          shop_id: string
          stackable: boolean
          starts_at: string | null
          target_id: string | null
          trigger: Database["public"]["Enums"]["offer_trigger"]
          type: Database["public"]["Enums"]["offer_type"]
        }
        Insert: {
          active?: boolean
          code?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          name: string
          scope: Database["public"]["Enums"]["offer_scope"]
          shop_id: string
          stackable?: boolean
          starts_at?: string | null
          target_id?: string | null
          trigger?: Database["public"]["Enums"]["offer_trigger"]
          type: Database["public"]["Enums"]["offer_type"]
        }
        Update: {
          active?: boolean
          code?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          id?: string
          name?: string
          scope?: Database["public"]["Enums"]["offer_scope"]
          shop_id?: string
          stackable?: boolean
          starts_at?: string | null
          target_id?: string | null
          trigger?: Database["public"]["Enums"]["offer_trigger"]
          type?: Database["public"]["Enums"]["offer_type"]
        }
        Relationships: [
          {
            foreignKeyName: "offers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          answers: Json
          created_at: string
          files: Json
          id: string
          item_id: string
          item_title: string
          kind: Database["public"]["Enums"]["item_kind"]
          line_total: number
          order_id: string
          price_breakdown: Json
          quantity: number
        }
        Insert: {
          answers?: Json
          created_at?: string
          files?: Json
          id?: string
          item_id: string
          item_title: string
          kind: Database["public"]["Enums"]["item_kind"]
          line_total?: number
          order_id: string
          price_breakdown?: Json
          quantity?: number
        }
        Update: {
          answers?: Json
          created_at?: string
          files?: Json
          id?: string
          item_id?: string
          item_title?: string
          kind?: Database["public"]["Enums"]["item_kind"]
          line_total?: number
          order_id?: string
          price_breakdown?: Json
          quantity?: number
        }
        Relationships: [
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
          applied_offers: Json
          archived_at: string | null
          catalog_version_id: string | null
          completed_at: string | null
          contact_phone: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          discount: number
          fulfilment: Database["public"]["Enums"]["fulfilment_type"]
          handled_by: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_ref: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          service_fee: number
          shipping_fee: number
          shop_id: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          whatsapp_sent: boolean
        }
        Insert: {
          applied_offers?: Json
          archived_at?: string | null
          catalog_version_id?: string | null
          completed_at?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          discount?: number
          fulfilment?: Database["public"]["Enums"]["fulfilment_type"]
          handled_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          service_fee?: number
          shipping_fee?: number
          shop_id: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Update: {
          applied_offers?: Json
          archived_at?: string | null
          catalog_version_id?: string | null
          completed_at?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          discount?: number
          fulfilment?: Database["public"]["Enums"]["fulfilment_type"]
          handled_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          service_fee?: number
          shipping_fee?: number
          shop_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          whatsapp_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "orders_catalog_version_id_fkey"
            columns: ["catalog_version_id"]
            isOneToOne: false
            referencedRelation: "catalog_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
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
      review_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          review_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          review_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_replies_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: number
          shop_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["review_target"]
        }
        Insert: {
          author_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: number
          shop_id: string
          target_id: string
          target_type: Database["public"]["Enums"]["review_target"]
        }
        Update: {
          author_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: number
          shop_id?: string
          target_id?: string
          target_type?: Database["public"]["Enums"]["review_target"]
        }
        Relationships: [
          {
            foreignKeyName: "reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
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
          delivery_fee: number
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
          delivery_fee?: number
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
          delivery_fee?: number
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
      is_admin: { Args: never; Returns: boolean }
      is_shop_member: {
        Args: {
          p_min_role?: Database["public"]["Enums"]["shop_role"]
          p_shop_id: string
        }
        Returns: boolean
      }
      offer_is_live: {
        Args: { o: Database["public"]["Tables"]["offers"]["Row"] }
        Returns: boolean
      }
      set_active_catalog_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      shop_conversations: {
        Args: never
        Returns: {
          customer_id: string
          customer_name: string
          last_at: string
          last_body: string
          last_sender: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          unread: number
        }[]
      }
      shop_unread_count: { Args: never; Returns: number }
      validate_offer_code: {
        Args: { p_code: string; p_shop_id: string }
        Returns: {
          active: boolean
          code: string | null
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          id: string
          name: string
          scope: Database["public"]["Enums"]["offer_scope"]
          shop_id: string
          stackable: boolean
          starts_at: string | null
          target_id: string | null
          trigger: Database["public"]["Enums"]["offer_trigger"]
          type: Database["public"]["Enums"]["offer_type"]
        }
        SetofOptions: {
          from: "*"
          to: "offers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      catalog_version_status: "draft" | "published" | "archived"
      fulfilment_type: "delivery" | "pickup"
      item_kind: "service" | "product"
      message_kind: "order" | "complaint"
      offer_scope: "product" | "category" | "cart"
      offer_trigger: "automatic" | "code"
      offer_type: "percent" | "fixed" | "bxgy" | "free_shipping"
      order_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "in_progress"
        | "in_delivery"
        | "done"
      payment_method: "cash_in_store" | "cash_on_delivery" | "online"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      review_target: "shop" | "employee" | "item"
      shop_role: "staff" | "catalog" | "owner"
      user_role: "customer" | "shop" | "admin"
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
      fulfilment_type: ["delivery", "pickup"],
      item_kind: ["service", "product"],
      message_kind: ["order", "complaint"],
      offer_scope: ["product", "category", "cart"],
      offer_trigger: ["automatic", "code"],
      offer_type: ["percent", "fixed", "bxgy", "free_shipping"],
      order_status: [
        "pending",
        "accepted",
        "rejected",
        "in_progress",
        "in_delivery",
        "done",
      ],
      payment_method: ["cash_in_store", "cash_on_delivery", "online"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      review_target: ["shop", "employee", "item"],
      shop_role: ["staff", "catalog", "owner"],
      user_role: ["customer", "shop", "admin"],
    },
  },
} as const
