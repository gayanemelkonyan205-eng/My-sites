export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: number;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: number;
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>;
        Relationships: [];
      };
      system_secrets: {
        Row: {
          key: string;
          value: string;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["system_secrets"]["Insert"]>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          username: string;
          role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
          avatar_path: string | null;
          bio: string | null;
          birthday: string | null;
          show_birthday: boolean;
          show_last_seen: boolean;
          theme_preference: "SYSTEM" | "LIGHT" | "DARK";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name: string;
          username: string;
          role?: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
          avatar_path?: string | null;
          bio?: string | null;
          birthday?: string | null;
          show_birthday?: boolean;
          show_last_seen?: boolean;
          theme_preference?: "SYSTEM" | "LIGHT" | "DARK";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_rate_limit: {
        Args: {
          p_key: string;
          p_action: string;
          p_limit: number;
          p_window_seconds: number;
        };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "STUDENT" | "ADMIN" | "SUPER_ADMIN";
    };
    CompositeTypes: Record<string, never>;
  };
};
