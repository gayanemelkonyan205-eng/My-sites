import Link from "next/link";
import { Bell, KeyRound, MoonStar, Shield } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { requireViewer } from "@/lib/auth/viewer";
export default async function Page() {
  const viewer = await requireViewer();
  return <><PageHeading title="Կարգավորումներ" description="Գաղտնիություն, թեմա, ծանուցումներ և հաշվի նախընտրություններ։" /><div className="grid gap-4 md:grid-cols-2"><section className="surface p-5"><MoonStar className="size-5 text-[var(--accent)]" /><h2 className="mt-3 font-bold">Տեսք</h2><p className="mt-2 text-sm muted">System / Light / Dark նախընտրությունները պահվում են պրոֆիլում։</p></section><section className="surface p-5"><Bell className="size-5 text-[var(--accent)]" /><h2 className="mt-3 font-bold">Ծանուցումներ</h2><p className="mt-2 text-sm muted">Browser permission-ը երբեք չի հարցվում ինքնաբերաբար։</p></section><section className="surface p-5"><Shield className="size-5 text-[var(--accent)]" /><h2 className="mt-3 font-bold">Անվտանգություն</h2><p className="mt-2 text-sm muted">Դեր՝ {viewer.role}։ Role և account active վիճակը սովորական պրոֆիլի ձևից փոխել հնարավոր չէ։</p></section>{viewer.role !== "SUPER_ADMIN" ? <Link href="/setup-owner" className="surface block p-5 transition hover:-translate-y-0.5"><KeyRound className="size-5 text-[var(--accent)]" /><h2 className="mt-3 font-bold">Owner setup</h2><p className="mt-2 text-sm muted">Միայն առաջին համակարգի սեփականատիրոջ մեկանգամյա bootstrap-ի համար։</p></Link> : null}</div></>;
}
