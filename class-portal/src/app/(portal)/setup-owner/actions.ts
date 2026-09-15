"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
const schema = z.object({ code: z.string().trim().min(12).max(100) });
export async function bootstrapOwnerAction(formData: FormData): Promise<void> {
  await requireViewer();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/setup-owner?error=invalid_code");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bootstrap_super_admin", { p_code: parsed.data.code });
  if (error || data !== true) redirect("/setup-owner?error=invalid_code");
  redirect("/super-admin?message=owner_enabled");
}
