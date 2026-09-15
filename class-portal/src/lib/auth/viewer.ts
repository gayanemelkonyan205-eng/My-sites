import "server-only";
import { redirect } from "next/navigation";
import { demoViewer } from "@/lib/demo-data";
import type { Role, ViewerProfile } from "@/lib/types";
import { hasMinimumRole } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function demoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export async function getViewer(): Promise<ViewerProfile | null> {
  if (demoEnabled()) return demoViewer;

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, first_name, last_name, username, role, avatar_path, is_active")
    .eq("id", authData.user.id)
    .maybeSingle();

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
