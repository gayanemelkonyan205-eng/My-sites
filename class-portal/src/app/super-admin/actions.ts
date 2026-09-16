"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
const rotateSchema = z.object({ inviteCode: z.string().trim().min(8).max(100), confirmation: z.literal("ՓՈԽԵԼ") });
const roleSchema = z.object({ userId: z.string().uuid(), role: z.enum(["STUDENT", "ADMIN", "SUPER_ADMIN"]) });
const activeSchema = z.object({ userId: z.string().uuid(), active: z.enum(["true", "false"]) });
export async function rotateInviteCodeAction(formData: FormData): Promise<void> {
  await requireRole("SUPER_ADMIN");
  const parsed = rotateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/super-admin?error=invite_rotation_invalid");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rotate_class_invite", { p_new_code: parsed.data.inviteCode });
  if (error || data !== true) redirect("/super-admin?error=invite_rotation_failed");
  revalidatePath("/super-admin"); redirect("/super-admin?message=invite_rotated");
}
export async function setUserRoleAction(formData: FormData): Promise<void> {
  await requireRole("SUPER_ADMIN");
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/super-admin?error=user_update_failed");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("super_admin_set_user_role", { p_user_id: parsed.data.userId, p_role: parsed.data.role });
  if (error || data !== true) redirect("/super-admin?error=user_update_failed");
  revalidatePath("/super-admin"); redirect("/super-admin?message=user_updated");
}
export async function setUserActiveAction(formData: FormData): Promise<void> {
  await requireRole("SUPER_ADMIN");
  const parsed = activeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/super-admin?error=user_update_failed");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("super_admin_set_user_active", { p_user_id: parsed.data.userId, p_active: parsed.data.active === "true" });
  if (error || data !== true) redirect("/super-admin?error=user_update_failed");
  revalidatePath("/super-admin"); redirect("/super-admin?message=user_updated");
}
