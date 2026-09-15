import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const origin = request.nextUrl.origin;
  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth_failed`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return NextResponse.redirect(`${origin}/login?error=oauth_failed`);

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) return NextResponse.redirect(`${origin}/complete-profile`);
  if (!profile.is_active) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/blocked`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
