import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export async function consumeRateLimit(action: string, identity: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return true;

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = createHash("sha256").update(`${action}|${forwarded}|${identity.toLowerCase()}`).digest("hex");
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_key: key,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });
  if (error) return false;
  return data === true;
}
