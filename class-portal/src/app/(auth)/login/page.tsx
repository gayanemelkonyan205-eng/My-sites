import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthMessage } from "@/components/auth-message";
import { FormSubmit } from "@/components/form-submit";
import { googleLoginAction, loginAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return (
    <AuthCard title="Բարի վերադարձ" subtitle="Մուտք գործեք ձեր դասարանի փակ տարածք։" footer={<span>Հաշիվ չունե՞ք։ <Link className="font-semibold text-[var(--accent)]" href="/register">Գրանցվել</Link></span>}>
      <AuthMessage error={params.error} message={params.message} />
      <form action={googleLoginAction} className="mb-5">
        <button className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-semibold hover:bg-[var(--surface-soft)]" type="submit">Շարունակել Google-ով</button>
      </form>
      <div className="mb-5 flex items-center gap-3 text-xs muted"><span className="h-px flex-1 bg-[var(--border)]" />կամ<span className="h-px flex-1 bg-[var(--border)]" /></div>
      <form action={loginAction} className="space-y-4">
        <label className="block text-sm font-medium">Էլ․ փոստ<input className="auth-input mt-2" name="email" type="email" autoComplete="email" required /></label>
        <label className="block text-sm font-medium">Գաղտնաբառ<input className="auth-input mt-2" name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
        <div className="flex justify-end"><Link href="/forgot-password" className="text-sm font-semibold text-[var(--accent)]">Մոռացե՞լ եք գաղտնաբառը</Link></div>
        <FormSubmit>Մուտք գործել</FormSubmit>
      </form>
    </AuthCard>
  );
}
