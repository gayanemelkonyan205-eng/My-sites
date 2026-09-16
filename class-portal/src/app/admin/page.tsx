import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/viewer";

const tools = ["Առարկաներ", "Դասացուցակ", "Տնային առաջադրանքներ", "Հայտարարություններ", "Դասարանի տախտակ", "Իրադարձություններ", "Հարցումներ", "Ֆայլեր"];

export default async function AdminPage() {
  await requireRole("ADMIN");
  return <><PageHeading title="Admin Panel" description="Դասարանի բովանդակության կառավարում՝ առանց ուսուցչի կամ գնահատականների դերերի։" /><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{tools.map((tool) => <article key={tool} className="surface p-5"><h2 className="font-bold">{tool}</h2><p className="mt-2 text-sm leading-6 muted">CRUD գործողությունները կկապվեն server-side permission checks-ի և audit log-ի հետ։</p><Link href="/dashboard" className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]">Բացել →</Link></article>)}</section></>;
}
