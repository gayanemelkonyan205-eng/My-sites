import "server-only";
import { verifyInviteCode } from "@/lib/auth/invite";
import { createAdminClient } from "@/lib/supabase/admin";

export async function verifyConfiguredInviteCode(code: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("system_secrets")
    .select("value")
    .eq("key", "class_invite_code_sha256")
    .maybeSingle();

  return verifyInviteCode(code, data?.value ?? process.env.CLASS_INVITE_CODE_SHA256);
}
