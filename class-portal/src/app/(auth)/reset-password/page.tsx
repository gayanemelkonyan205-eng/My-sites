import { AuthCard } from "@/components/auth-card";
import { AuthMessage } from "@/components/auth-message";
import { FormSubmit } from "@/components/form-submit";
import { resetPasswordAction } from "../actions";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthCard title="Նոր գաղտնաբառ" subtitle="Ընտրեք առնվազն 10 նիշ պարունակող նոր գաղտնաբառ։">
    <AuthMessage error={params.error} />
    <form action={resetPasswordAction} className="space-y-4">
      <label className="block text-sm font-medium">Նոր գաղտնաբառ<input className="auth-input mt-2" name="password" type="password" autoComplete="new-password" minLength={10} required /></label>
      <label className="block text-sm font-medium">Կրկնել<input className="auth-input mt-2" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required /></label>
      <FormSubmit>Պահպանել</FormSubmit>
    </form>
  </AuthCard>;
}
