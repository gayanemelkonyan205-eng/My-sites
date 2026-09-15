import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const targetEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL?.trim().toLowerCase();

if (!url || !secret || !targetEmail) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, or INITIAL_SUPER_ADMIN_EMAIL.");
  process.exit(1);
}

const admin = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

const { data: existingSuperAdmins, error: existingError } = await admin
  .from("profiles")
  .select("id")
  .eq("role", "SUPER_ADMIN")
  .limit(1);

if (existingError) throw existingError;
if ((existingSuperAdmins?.length ?? 0) > 0) {
  console.error("Bootstrap refused: a SUPER_ADMIN already exists. Manage roles from the protected panel.");
  process.exit(2);
}

let user = null;
for (let page = 1; page <= 20 && !user; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  user = data.users.find((candidate) => candidate.email?.toLowerCase() === targetEmail) ?? null;
  if (data.users.length < 100) break;
}

if (!user) {
  console.error("No Supabase Auth user matches INITIAL_SUPER_ADMIN_EMAIL. Register and verify that account first.");
  process.exit(3);
}

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .select("id")
  .eq("id", user.id)
  .maybeSingle();
if (profileError) throw profileError;
if (!profile) {
  console.error("The Auth user has no class profile. Finish class onboarding first.");
  process.exit(4);
}

const { error: updateError } = await admin
  .from("profiles")
  .update({ role: "SUPER_ADMIN", is_active: true })
  .eq("id", user.id);
if (updateError) throw updateError;

await admin.from("audit_logs").insert({
  actor_id: user.id,
  action: "bootstrap.super_admin",
  entity_type: "profile",
  entity_id: user.id,
  metadata: { bootstrap: true }
});

console.log(`SUPER_ADMIN bootstrap complete for ${targetEmail}. Remove INITIAL_SUPER_ADMIN_EMAIL from production environment variables now.`);
