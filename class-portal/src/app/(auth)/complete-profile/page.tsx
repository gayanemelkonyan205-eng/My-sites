import { AuthCard } from "@/components/auth-card";
import { AuthMessage } from "@/components/auth-message";
import { FormSubmit } from "@/components/form-submit";
import { completeGoogleProfileAction } from "../actions";

export default async function CompleteProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return <AuthCard title="Հաստատել դասարանի մուտքը" subtitle="Google հաշիվը հաջողությամբ ճանաչվել է։ Այժմ հաստատեք, որ մեր դասարանից եք։">
    <AuthMessage error={params.error} />
    <form action={completeGoogleProfileAction} className="space-y-4">
      <label className="block text-sm font-medium">Անուն<input className="auth-input mt-2" name="firstName" required /></label>
      <label className="block text-sm font-medium">Ազգանուն<input className="auth-input mt-2" name="lastName" required /></label>
      <label className="block text-sm font-medium">Օգտանուն<input className="auth-input mt-2" name="username" required /></label>
      <label className="block text-sm font-medium">Հրավերի կոդ<input className="auth-input mt-2" name="inviteCode" type="password" autoComplete="off" required /></label>
      <FormSubmit>Միանալ դասարանին</FormSubmit>
    </form>
  </AuthCard>;
}
