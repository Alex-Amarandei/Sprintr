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
      addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          is_default: boolean
          label: string | null
          lat: number | null
          lng: number | null
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string | null
          lat?: number | null
          lng?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: { created_at: string; shop_id: string; user_id: string }
        Insert: { created_at?: string; shop_id: string; user_id: string }
        Update: { created_at?: string; shop_id?: string; user_id?: string }
        Relationships: [
          {
            foreignKeyName: "favorites_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
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
          commission: number
          completed_at: string | null
          contact_phone: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          discount: number
          eta_minutes: number | null
          fulfilment: Database["public"]["Enums"]["fulfilment_type"]
          handled_by: string | null
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_ref: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payout: number
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
          commission?: number
          completed_at?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number
          eta_minutes?: number | null
          fulfilment?: Database["public"]["Enums"]["fulfilment_type"]
          handled_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payout?: number
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
          commission?: number
          completed_at?: string | null
          contact_phone?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          discount?: number
          eta_minutes?: number | null
          fulfilment?: Database["public"]["Enums"]["fulfilment_type"]
          handled_by?: string | null
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_ref?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payout?: number
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
      shop_invitations: {
        Row: {
          created_at: string
          email: string
          invited_by: string | null
          role: Database["public"]["Enums"]["shop_role"]
          shop_id: string
        }
        Insert: {
          created_at?: string
          email: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["shop_role"]
          shop_id: string
        }
        Update: {
          created_at?: string
          email?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["shop_role"]
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_invitations_shop_id_fkey"
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
          commission_rate: number
          created_at: string
          default_eta_minutes: number | null
          delivery_fee: number
          description: string | null
          email: string | null
          id: string
          lat: number | null
          lng: number | null
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
          commission_rate?: number
          created_at?: string
          default_eta_minutes?: number | null
          delivery_fee?: number
          description?: string | null
          email?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
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
          commission_rate?: number
          created_at?: string
          default_eta_minutes?: number | null
          delivery_fee?: number
          description?: string | null
          email?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
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
      stripe_events: {
        Row: { id: string; processed_at: string; type: string }
        Insert: { id: string; processed_at?: string; type: string }
        Update: { id?: string; processed_at?: string; type?: string }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_shop_member: {
        Args: {
          p_email: string
          p_role: Database["public"]["Enums"]["shop_role"]
          p_shop_id: string
        }
        Returns: string
      }
      can_read_customer: { Args: { p_customer: string }; Returns: boolean }
      cancel_shop_invitation: {
        Args: { p_email: string; p_shop_id: string }
        Returns: undefined
      }
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
      customer_stats: {
        Args: never
        Returns: {
          orders_count: number
          total_saved: number
          total_spent: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_shop_member: {
        Args: {
          p_min_role?: Database["public"]["Enums"]["shop_role"]
          p_shop_id: string
        }
        Returns: boolean
      }
      list_shop_invitations: {
        Args: { p_shop_id: string }
        Returns: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["shop_role"]
        }[]
      }
      list_shop_members: {
        Args: { p_shop_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          profile_id: string
          role: Database["public"]["Enums"]["shop_role"]
        }[]
      }
      mark_order_read: { Args: { p_order_id: string }; Returns: undefined }
      offer_is_live: {
        Args: { o: Database["public"]["Tables"]["offers"]["Row"] }
        Returns: boolean
      }
      remove_shop_member: {
        Args: { p_profile_id: string; p_shop_id: string }
        Returns: undefined
      }
      set_active_catalog_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      set_shop_member_role: {
        Args: {
          p_profile_id: string
          p_role: Database["public"]["Enums"]["shop_role"]
          p_shop_id: string
        }
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
      shop_revenue_daily: {
        Args: { p_days?: number; p_shop_id: string }
        Returns: {
          day: string
          revenue: number
        }[]
      }
      shop_stats: {
        Args: { p_shop_id: string }
        Returns: {
          avg_rating: number
          commission_total: number
          done: number
          in_progress: number
          orders_total: number
          payout_total: number
          pending: number
          revenue_today: number
          revenue_total: number
          reviews_count: number
        }[]
      }
      shop_status_counts: {
        Args: { p_shop_id: string }
        Returns: {
          count: number
          status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      shop_top_items: {
        Args: { p_limit?: number; p_shop_id: string }
        Returns: {
          avg_rating: number
          item_id: string
          kind: Database["public"]["Enums"]["item_kind"]
          orders: number
          qty: number
          revenue: number
          title: string
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
