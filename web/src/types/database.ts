export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "customer" | "shop_owner" | "courier" | "admin";
export type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_preparation"
  | "ready"
  | "picked_up"
  | "delivered"
  | "cancelled";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          role: UserRole;
          avatar_url: string | null;
          city_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      cities: {
        Row: {
          id: string;
          name: string;
          country: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cities"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["cities"]["Insert"]>;
      };
      shops: {
        Row: {
          id: string;
          owner_id: string;
          city_id: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          cover_url: string | null;
          address: string;
          phone: string;
          email: string | null;
          is_active: boolean;
          is_approved: boolean;
          rating: number | null;
          total_orders: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shops"]["Row"], "id" | "rating" | "total_orders" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["shops"]["Insert"]>;
      };
      shop_services: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          description: string | null;
          base_price: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["shop_services"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["shop_services"]["Insert"]>;
      };
      service_options: {
        Row: {
          id: string;
          service_id: string;
          label: string;
          type: "checkbox" | "radio" | "select" | "text" | "number" | "file";
          options: Json | null;
          price_modifier: number;
          is_required: boolean;
          sort_order: number;
        };
        Insert: Omit<Database["public"]["Tables"]["service_options"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["service_options"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          shop_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          stock: number | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["products"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      offers: {
        Row: {
          id: string;
          shop_id: string;
          title: string;
          description: string | null;
          discount_percent: number | null;
          discount_amount: number | null;
          valid_from: string;
          valid_until: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["offers"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["offers"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          shop_id: string;
          courier_id: string | null;
          status: OrderStatus;
          total_price: number;
          delivery_address: string;
          notes: string | null;
          whatsapp_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "whatsapp_sent" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          type: "service" | "product";
          service_id: string | null;
          product_id: string | null;
          name: string;
          quantity: number;
          unit_price: number;
          selected_options: Json | null;
          file_url: string | null;
          notes: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["order_items"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      order_status: OrderStatus;
    };
  };
}
