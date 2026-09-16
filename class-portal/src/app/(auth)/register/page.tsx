import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthMessage } from "@/components/auth-message";
import { FormSubmit } from "@/components/form-submit";
import { googleLoginAction, registerAction } from "../actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <AuthCard title="Միանալ դասարանին" subtitle="Գրանցումը հասանելի է միայն մեր դասարանի հրավերի կոդով։" footer={<span>Արդեն գրանցվա՞ծ եք։ <Link className="font-semibold text-[var(--accent)]" href="/login">Մուտք գործել</Link></span>}>
      <AuthMessage error={params.error} />
      <form action={googleLoginAction} className="mb-5"><button className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-semibold hover:bg-[var(--surface-soft)]" type="submit">Շարունակել Google-ով</button></form>
      <form action={registerAction} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Անուն<input className="auth-input mt-2" name="firstName" autoComplete="given-name" required /></label>
        <label className="text-sm font-medium">Ազգանուն<input className="auth-input mt-2" name="lastName" autoComplete="family-name" required /></label>
        <label className="text-sm font-medium sm:col-span-2">Օգտանուն<input className="auth-input mt-2" name="username" autoComplete="username" required /></label>
        <label className="text-sm font-medium sm:col-span-2">Էլ․ փոստ<input className="auth-input mt-2" name="email" type="email" autoComplete="email" required /></label>
        <label className="text-sm font-medium">Գաղտնաբառ<input className="auth-input mt-2" name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
        <label className="text-sm font-medium">Կրկնել<input className="auth-input mt-2" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required /></label>
        <label className="text-sm font-medium sm:col-span-2">Դասարանի հրավերի կոդ<input className="auth-input mt-2" name="inviteCode" type="password" autoComplete="off" required /></label>
        <div className="sm:col-span-2"><FormSubmit>Ստեղծել հաշիվ</FormSubmit></div>
      </form>
    </AuthCard>
  );
}
