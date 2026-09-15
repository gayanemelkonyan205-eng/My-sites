import Link from "next/link";
import { AuthCard } from "@/components/auth-card";
import { AuthMessage } from "@/components/auth-message";
import { FormSubmit } from "@/components/form-submit";
import { forgotPasswordAction } from "../actions";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const params = await searchParams;
  return <AuthCard title="Վերականգնել գաղտնաբառը" subtitle="Մուտքագրեք ձեր էլ․ փոստը։ Պատասխանը չի բացահայտի՝ արդյոք հաշիվը գոյություն ունի։" footer={<Link href="/login">← Վերադառնալ մուտքի էջ</Link>}>
    <AuthMessage message={params.message} />
    <form action={forgotPasswordAction} className="space-y-4">
      <label className="block text-sm font-medium">Էլ․ փոստ<input className="auth-input mt-2" name="email" type="email" autoComplete="email" required /></label>
      <FormSubmit>Ուղարկել վերականգնման հղումը</FormSubmit>
    </form>
  </AuthCard>;
}
