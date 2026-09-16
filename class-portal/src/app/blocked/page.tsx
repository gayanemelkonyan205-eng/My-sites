import Link from "next/link";

export default function BlockedPage() {
  return <main className="min-h-dvh grid place-items-center p-5"><section className="surface max-w-lg p-8 text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-500/10 text-2xl">!</div><h1 className="mt-5 text-2xl font-bold">Հաշիվը ժամանակավորապես արգելափակված է</h1><p className="mt-3 muted leading-6">Այս հաշիվը չի կարող օգտվել դասարանի տարածքից։ Եթե կարծում եք, որ սա սխալ է, դիմեք համակարգի ադմինիստրատորին։</p><Link href="/login" className="mt-6 inline-flex rounded-xl border border-[var(--border)] px-4 py-2 font-semibold">Վերադառնալ</Link></section></main>;
}
