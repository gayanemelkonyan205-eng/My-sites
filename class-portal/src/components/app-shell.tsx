import Link from "next/link";
import {
  Bell, BookOpenCheck, CalendarDays, ClipboardList, FileText, Home, LayoutGrid,
  MessageCircle, MoreHorizontal, ShieldCheck, Users, Vote
} from "lucide-react";
import type { ViewerProfile } from "@/lib/types";
import { signOutAction } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";

const items = [
  ["/dashboard", "Գլխավոր", Home],
  ["/chat", "Չատ", MessageCircle],
  ["/board", "Դասարանի տախտակ", LayoutGrid],
  ["/schedule", "Դասացուցակ", CalendarDays],
  ["/homework", "Տնային առաջադրանքներ", BookOpenCheck],
  ["/announcements", "Հայտարարություններ", Bell],
  ["/calendar", "Օրացույց", CalendarDays],
  ["/files", "Ֆայլեր", FileText],
  ["/polls", "Հարցումներ", Vote],
  ["/classmates", "Դասընկերներ", Users],
  ["/notifications", "Ծանուցումներ", Bell]
] as const;

const mobile = [
  ["/dashboard", "Գլխավոր", Home],
  ["/chat", "Չատ", MessageCircle],
  ["/board", "Տախտակ", LayoutGrid],
  ["/homework", "ԴԶ", BookOpenCheck],
  ["/settings", "Ավելին", MoreHorizontal]
] as const;

export function AppShell({ viewer, children }: { viewer: ViewerProfile; children: React.ReactNode }) {
  const initials = `${viewer.firstName[0] ?? ""}${viewer.lastName[0] ?? ""}`;
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[270px_1fr]">
      <aside className="hidden lg:flex sticky top-0 h-dvh flex-col border-r border-[var(--border)] bg-[var(--surface)]/90 p-4 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-3 font-bold"><span className="grid size-10 place-items-center rounded-2xl bg-[var(--accent)] text-white">Դ</span><span>Դասարան</span></Link>
        <nav className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
          {items.map(([href, label, Icon]) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"><Icon className="size-4.5" />{label}</Link>)}
          {(viewer.role === "ADMIN" || viewer.role === "SUPER_ADMIN") ? <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"><ShieldCheck className="size-4.5" />Admin</Link> : null}
          {viewer.role === "SUPER_ADMIN" ? <Link href="/super-admin" className="flex items-center gap-3 rounded-xl bg-[var(--accent)]/10 px-3 py-2.5 text-sm font-semibold text-[var(--accent)]"><ClipboardList className="size-4.5" />Super Admin</Link> : null}
        </nav>
        <div className="border-t border-[var(--border)] pt-4">
          <Link href="/profile" className="flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--surface-soft)]"><span className="grid size-10 place-items-center rounded-full bg-[var(--accent)]/15 font-bold text-[var(--accent)]">{initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{viewer.firstName} {viewer.lastName}</span><span className="block truncate text-xs muted">@{viewer.username}</span></span></Link>
          <form action={signOutAction}><button className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm muted hover:bg-[var(--surface-soft)]">Դուրս գալ</button></form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/88 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="lg:hidden flex items-center gap-2 font-bold"><span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-white">Դ</span>Դասարան</div>
          <div className="hidden lg:block"><p className="text-sm font-semibold">{viewer.firstName} {viewer.lastName}</p><p className="text-xs muted">{viewer.role}</p></div>
          <div className="flex items-center gap-2"><ThemeToggle /><Link aria-label="Ծանուցումներ" href="/notifications" className="relative grid size-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"><Bell className="size-5" /><span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-[var(--danger)]" /></Link></div>
        </header>
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)]/96 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {mobile.map(([href, label, Icon]) => <Link key={href} href={href} className="flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold muted"><Icon className="size-5" /><span className="max-w-full truncate">{label}</span></Link>)}
      </nav>
    </div>
  );
}
