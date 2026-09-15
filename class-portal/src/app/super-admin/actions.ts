"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/auth/viewer";
import { createAdminClient } from "@/lib/supabase/admin";

const rotateSchema = z.object({
  inviteCode: z.string().trim().min(8).max(100),
  confirmation: z.literal("ՓՈԽԵԼ")
});

export async function rotateInviteCodeAction(formData: FormData): Promise<void> {
  const viewer = await requireRole("SUPER_ADMIN");
  const parsed = rotateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/super-admin?error=invite_rotation_invalid");

  const value = createHash("sha256").update(parsed.data.inviteCode, "utf8").digest("hex");
  const admin = createAdminClient();
  const { error } = await admin.from("system_secrets").upsert({
    key: "class_invite_code_sha256",
    value,
    updated_by: viewer.id,
    updated_at: new Date().toISOString()
  });
  if (error) redirect("/super-admin?error=invite_rotation_failed");

  await admin.from("audit_logs").insert({
    actor_id: viewer.id,
    action: "security.invite_code_rotated",
    entity_type: "system_secret",
    entity_id: "class_invite_code_sha256",
    metadata: { source: "super_admin" }
  });

  revalidatePath("/super-admin");
  redirect("/super-admin?message=invite_rotated");
}
