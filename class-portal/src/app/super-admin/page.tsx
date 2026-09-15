import { Database, FileClock, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/viewer";
import { rotateInviteCodeAction } from "./actions";

const cards = [
  ["Օգտատերեր", "Դերեր, արգելափակում, ակտիվություն", UsersRound],
  ["Database Manager", "Թույլատրված application տվյալների անվտանգ CRUD", Database],
  ["Site Settings", "Անվանում, դասարան, բրենդ, feature controls", Settings2],
  ["Audit Log", "Կարևոր ադմինիստրատիվ գործողությունների պատմություն", FileClock],
  ["Անվտանգություն", "Հիմնական կարգավիճակ և վերահսկման կետեր", ShieldCheck]
] as const;

export default async function SuperAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  await requireRole("SUPER_ADMIN");
  const params = await searchParams;
  return <><PageHeading title="Super Admin" description="Համակարգի առավելագույն application-level կառավարում՝ առանց browser SQL console-ի և առանց գաղտնիքների արտահոսքի։" />
    {params.message === "invite_rotated" ? <p className="mb-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-[var(--success)]">Հրավերի կոդը փոխվել է։ Հին կոդն այլևս չի աշխատում։</p> : null}
    {params.error ? <p className="mb-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-[var(--danger)]">Գործողությունը չհաջողվեց։ Ստուգեք նոր կոդը և հաստատումը։</p> : null}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(([title, text, Icon]) => <section key={title} className="surface p-5"><span className="grid size-11 place-items-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]"><Icon className="size-5" /></span><h2 className="mt-4 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 muted">{text}</p></section>)}</div>
    <section className="surface mt-5 max-w-2xl p-5 sm:p-6"><h2 className="text-lg font-bold">Փոխել դասարանի հրավերի կոդը</h2><p className="mt-2 text-sm leading-6 muted">Պահվում է միայն SHA-256 hash-ը։ Նոր կոդը հիշեք կամ պահեք անվտանգ վայրում․ այստեղ այն կրկին չի ցուցադրվի։</p><form action={rotateInviteCodeAction} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium sm:col-span-2">Նոր հրավերի կոդ<input name="inviteCode" minLength={8} required autoComplete="off" className="auth-input mt-2" /></label><label className="text-sm font-medium sm:col-span-2">Վտանգավոր գործողության հաստատում<input name="confirmation" required placeholder="Գրեք՝ ՓՈԽԵԼ" className="auth-input mt-2" /></label><button type="submit" className="rounded-xl bg-[var(--danger)] px-4 py-3 font-semibold text-white sm:col-span-2">Փոխել կոդը</button></form></section>
  </>;
}
