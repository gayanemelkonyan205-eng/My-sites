export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
type UserRole = "STUDENT" | "ADMIN" | "SUPER_ADMIN";
export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: { id: number; actor_id: string | null; action: string; entity_type: string; entity_id: string | null; metadata: Json; created_at: string };
        Insert: { id?: number; actor_id?: string | null; action: string; entity_type: string; entity_id?: string | null; metadata?: Json; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["audit_logs"]["Insert"]>; Relationships: [];
      };
      profiles: {
        Row: { id: string; first_name: string; last_name: string; username: string; role: UserRole; avatar_path: string | null; bio: string | null; birthday: string | null; show_birthday: boolean; show_last_seen: boolean; theme_preference: "SYSTEM" | "LIGHT" | "DARK"; is_active: boolean; created_at: string; updated_at: string };
        Insert: { id: string; first_name: string; last_name: string; username: string; role?: UserRole; avatar_path?: string | null; bio?: string | null; birthday?: string | null; show_birthday?: boolean; show_last_seen?: boolean; theme_preference?: "SYSTEM" | "LIGHT" | "DARK"; is_active?: boolean; created_at?: string; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>; Relationships: [];
      };
      site_settings: {
        Row: { key: string; value: Json; updated_by: string | null; updated_at: string };
        Insert: { key: string; value: Json; updated_by?: string | null; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["site_settings"]["Insert"]>; Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      consume_rate_limit: { Args: { p_key: string; p_action: string; p_limit: number; p_window_seconds: number }; Returns: boolean };
      get_my_profile: { Args: never; Returns: Array<{ id: string; first_name: string; last_name: string; username: string; role: UserRole; avatar_path: string | null; is_active: boolean }> };
      claim_class_profile: { Args: { p_first_name: string; p_last_name: string; p_username: string; p_invite_code: string }; Returns: boolean };
      bootstrap_super_admin: { Args: { p_code: string }; Returns: boolean };
      rotate_class_invite: { Args: { p_new_code: string }; Returns: boolean };
      super_admin_set_user_role: { Args: { p_user_id: string; p_role: UserRole }; Returns: boolean };
      super_admin_set_user_active: { Args: { p_user_id: string; p_active: boolean }; Returns: boolean };
    };
    Enums: { user_role: UserRole };
    CompositeTypes: Record<string, never>;
  };
};
