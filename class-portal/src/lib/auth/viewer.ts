import "server-only";
import { redirect } from "next/navigation";
import type { Role, ViewerProfile } from "@/lib/types";
import { hasMinimumRole } from "@/lib/auth/authorization";
import { createClient } from "@/lib/supabase/server";

export async function getViewer(): Promise<ViewerProfile | null> {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data, error } = await supabase.rpc("get_my_profile");
  const profile = data?.[0];
  if (error || !profile) return null;

  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    username: profile.username,
    role: profile.role,
    avatarUrl: profile.avatar_path,
    isActive: profile.is_active
  };
}

export async function requireViewer(): Promise<ViewerProfile> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (!viewer.isActive) redirect("/blocked");
  return viewer;
}

export async function requireRole(role: Role): Promise<ViewerProfile> {
  const viewer = await requireViewer();
  if (!hasMinimumRole(viewer.role, role)) redirect("/dashboard");
  return viewer;
}
