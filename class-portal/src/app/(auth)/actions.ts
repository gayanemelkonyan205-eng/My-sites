"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyConfiguredInviteCode } from "@/lib/auth/configured-invite";
import { consumeRateLimit } from "@/lib/auth/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_.-]+$/),
  email: z.string().email(),
  password: z.string().min(10).max(128),
  confirmPassword: z.string(),
  inviteCode: z.string().min(4).max(100)
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "password_mismatch"
});

const completeProfileSchema = registerSchema.pick({
  firstName: true,
  lastName: true,
  username: true,
  inviteCode: true
});

const passwordSchema = z.object({
  password: z.string().min(10).max(128),
  confirmPassword: z.string()
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"],
  message: "password_mismatch"
});

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

function safeError(path: string, code: string): never {
  redirect(`${path}?error=${encodeURIComponent(code)}`);
}

export async function loginAction(formData: FormData): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") redirect("/dashboard");
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) safeError("/login", "invalid_credentials");

  const allowed = await consumeRateLimit("login", parsed.data.email, 10, 15 * 60);
  if (!allowed) safeError("/login", "try_later");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) safeError("/login", "invalid_credentials");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    safeError("/login", "profile_missing");
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    redirect("/blocked");
  }
  redirect("/dashboard");
}

export async function registerAction(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) safeError("/register", "invalid_form");

  const allowed = await consumeRateLimit("register", parsed.data.email, 5, 60 * 60);
  if (!allowed) safeError("/register", "try_later");
  if (!(await verifyConfiguredInviteCode(parsed.data.inviteCode))) safeError("/register", "invalid_invite");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${appUrl()}/auth/callback`,
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        username: parsed.data.username
      }
    }
  });

  if (error || !data.user) safeError("/register", "registration_failed");

  const admin = createAdminClient();
  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    username: parsed.data.username,
    role: "STUDENT",
    is_active: true
  });

  if (profileError) redirect("/login?message=verify_email");
  redirect("/login?message=verify_email");
}

export async function googleLoginAction(): Promise<void> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") redirect("/dashboard");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${appUrl()}/auth/callback` }
  });
  if (error || !data.url) safeError("/login", "oauth_failed");
  redirect(data.url);
}

export async function completeGoogleProfileAction(formData: FormData): Promise<void> {
  const parsed = completeProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) safeError("/complete-profile", "invalid_form");

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user?.email) redirect("/login");

  const allowed = await consumeRateLimit("invite", authData.user.email, 10, 15 * 60);
  if (!allowed) safeError("/complete-profile", "try_later");
  if (!(await verifyConfiguredInviteCode(parsed.data.inviteCode))) safeError("/complete-profile", "invalid_invite");

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id, is_active").eq("id", authData.user.id).maybeSingle();
  if (existing) redirect(existing.is_active ? "/dashboard" : "/blocked");

  const { error } = await admin.from("profiles").insert({
    id: authData.user.id,
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    username: parsed.data.username,
    role: "STUDENT",
    is_active: true
  });
  if (error) safeError("/complete-profile", "profile_failed");
  redirect("/dashboard");
}

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const emailResult = z.string().email().safeParse(formData.get("email"));
  if (!emailResult.success) redirect("/forgot-password?message=sent");

  const allowed = await consumeRateLimit("password-reset", emailResult.data, 5, 60 * 60);
  if (allowed) {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(emailResult.data, {
      redirectTo: `${appUrl()}/auth/callback?next=/reset-password`
    });
  }
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
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}
