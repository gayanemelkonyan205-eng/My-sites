import Link from "next/link";
import { Bell, BookOpenCheck, CalendarDays, FileText, LayoutGrid, MessageCircle, Users, Vote } from "lucide-react";
import { dashboardDemo } from "@/lib/demo-data";
import { requireViewer } from "@/lib/auth/viewer";

const shortcuts = [
  ["/chat", "Չատ", "3 չկարդացված", MessageCircle],
  ["/board", "Դասարանի տախտակ", "2 նոր գրառում", LayoutGrid],
  ["/schedule", "Դասացուցակ", "Հաջորդը՝ Ֆիզիկա", CalendarDays],
  ["/homework", "Տնային առաջադրանքներ", "2 ակտիվ", BookOpenCheck],
  ["/announcements", "Հայտարարություններ", "1 կարևոր", Bell],
  ["/files", "Ֆայլեր", "Դասարանի նյութեր", FileText],
  ["/polls", "Հարցումներ", "1 ակտիվ", Vote],
  ["/classmates", "Դասընկերներ", "Մեր դասարանը", Users]
] as const;

export default async function DashboardPage() {
  const viewer = await requireViewer();
  const today = new Intl.DateTimeFormat("hy-AM", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return <div className="space-y-7">
    <section className="flex flex-col gap-2"><p className="text-sm font-semibold text-[var(--accent)]">{today}</p><h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Բարի օր, {viewer.firstName} 👋</h1><p className="muted">Ահա այսօրվա ամենակարևոր տեղեկությունները ձեր դասարանի համար։</p></section>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
      {shortcuts.map(([href, title, meta, Icon]) => <Link key={href} href={href} className="surface group min-w-0 p-4 transition hover:-translate-y-0.5 hover:border-[var(--accent)]"><span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]"><Icon className="size-5" /></span><h2 className="mt-4 truncate text-sm font-bold">{title}</h2><p className="mt-1 truncate text-xs muted">{meta}</p></Link>)}
    </section>
    <section className="grid gap-5 xl:grid-cols-[1.3fr_.9fr]">
      <div className="surface p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[var(--accent)]">Այսօր</p><h2 className="text-xl font-bold">Դասերը</h2></div><Link href="/schedule" className="text-sm font-semibold text-[var(--accent)]">Ամբողջ դասացուցակը</Link></div><div className="mt-5 space-y-3">{dashboardDemo.lessons.map((lesson, index) => <div key={lesson.time} className={`flex items-center gap-4 rounded-2xl border p-4 ${index === 1 ? "border-[var(--accent)] bg-[var(--accent)]/6" : "border-[var(--border)]"}`}><time className="w-14 text-sm font-bold">{lesson.time}</time><div className="min-w-0"><p className="font-semibold">{lesson.subject}</p><p className="truncate text-sm muted">{lesson.room}</p></div>{index === 1 ? <span className="ml-auto rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-bold text-white">Հաջորդը</span> : null}</div>)}</div></div>
      <div className="surface p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">Մոտակա ԴԶ</h2><Link href="/homework" className="text-sm font-semibold text-[var(--accent)]">Բոլորը</Link></div><div className="mt-5 space-y-4">{dashboardDemo.homework.map((item) => <article key={item.title} className="rounded-2xl bg-[var(--surface-soft)] p-4"><div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-[var(--accent)]">{item.subject}</span><span className="text-xs muted">{item.due}</span></div><p className="mt-2 font-semibold leading-6">{item.title}</p></article>)}</div></div>
    </section>
    <section className="grid gap-5 md:grid-cols-3">
      <article className="surface p-5"><span className="text-xs font-bold text-[var(--danger)]">ԿԱՐԵՎՈՐ</span><h2 className="mt-2 font-bold">Վերջին հայտարարություն</h2><p className="mt-2 text-sm leading-6 muted">{dashboardDemo.announcement}</p></article>
      <article className="surface p-5"><span className="text-xs font-bold text-[var(--accent)]">ՕՐԱՑՈՒՅՑ</span><h2 className="mt-2 font-bold">Մոտակա իրադարձություն</h2><p className="mt-2 text-sm leading-6 muted">{dashboardDemo.event}</p></article>
      <article className="surface p-5"><span className="text-xs font-bold text-[var(--success)]">ՀԱՐՑՈՒՄ</span><h2 className="mt-2 font-bold">Ակտիվ հարցում</h2><p className="mt-2 text-sm leading-6 muted">{dashboardDemo.poll}</p></article>
    </section>
  </div>;
}
