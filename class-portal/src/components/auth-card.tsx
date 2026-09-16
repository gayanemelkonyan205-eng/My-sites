import Link from "next/link";

export function AuthCard({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh px-4 py-8 sm:py-14 flex items-center justify-center">
      <section className="surface w-full max-w-md p-5 sm:p-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold muted mb-8">
          <span className="grid size-9 place-items-center rounded-xl bg-[var(--accent)] text-white">Դ</span>
          Դասարան
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm sm:text-base muted leading-6">{subtitle}</p>
        <div className="mt-7">{children}</div>
        {footer ? <div className="mt-6 border-t border-[var(--border)] pt-5 text-sm muted">{footer}</div> : null}
      </section>
    </main>
  );
}
