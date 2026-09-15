"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { mapSignupError } from "@/lib/auth/error-codes";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });
const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  confirmPassword: z.string(),
  inviteCode: z.string().min(8).max(100)
}).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "password_mismatch" });
const completeProfileSchema = registerSchema.pick({ firstName: true, lastName: true, username: true, inviteCode: true });
const passwordSchema = z.object({ password: z.string().min(10).max(128), confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "password_mismatch" });

function appUrl(): string { return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"; }
function safeError(path: string, code: string): never { redirect(`${path}?error=${encodeURIComponent(code)}`); }

async function authenticatedProfileState() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) return null;
  return data?.[0] ?? null;
}

export async function loginAction(formData: FormData): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") redirect("/dashboard");
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) safeError("/login", "invalid_credentials");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) safeError("/login", "invalid_credentials");
  const profile = await authenticatedProfileState();
  if (!profile) redirect("/complete-profile");
  if (!profile.is_active) { await supabase.auth.signOut(); redirect("/blocked"); }
  redirect("/dashboard");
}

export async function registerAction(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) safeError("/register", "invalid_form");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback`,
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        username: parsed.data.username,
        class_portal_registration: "true",
        class_invite_code: parsed.data.inviteCode
      }
    }
  });
  if (error || !data.user) safeError("/register", mapSignupError(error?.message));
  redirect("/login?message=verify_email");
}

export async function googleLoginAction(): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") redirect("/dashboard");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${appUrl()}/auth/callback` } });
  if (error || !data.url) safeError("/login", "oauth_failed");
  redirect(data.url);
}

export async function completeGoogleProfileAction(formData: FormData): Promise<void> {
  const parsed = completeProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) safeError("/complete-profile", "invalid_form");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");
  const { data, error } = await supabase.rpc("claim_class_profile", {
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_username: parsed.data.username,
    p_invite_code: parsed.data.inviteCode
  });
  if (error || data !== true) safeError("/complete-profile", "invalid_invite");
  redirect("/dashboard");
}

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const emailResult = z.string().email().safeParse(formData.get("email"));
  if (!emailResult.success) redirect("/forgot-password?message=sent");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(emailResult.data, { redirectTo: `${appUrl()}/auth/callback?next=/reset-password` });
  redirect("/forgot-password?message=sent");
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) safeError("/reset-password", "invalid_password");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) safeError("/reset-password", "reset_failed");
  redirect("/dashboard");
}

export async function signOutAction(): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") { const supabase = await createClient(); await supabase.auth.signOut(); }
  redirect("/login");
}
