import { PageHeading } from "@/components/page-heading";

export function SectionPlaceholder({ title, description }: { title: string; description: string }) {
  return <><PageHeading title={title} description={description} /><section className="surface p-6 sm:p-8"><div className="max-w-xl"><span className="inline-flex rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold text-[var(--accent)]">Առաջին աշխատանքային հիմք</span><h2 className="mt-4 text-lg font-bold">Բաժինը արդեն ներառված է ընդհանուր նավիգացիայում</h2><p className="mt-2 leading-7 muted">Տվյալների CRUD-ը և realtime վարքը միացվում են հաջորդ փուլերում՝ նույն Supabase permission model-ի վրա, առանց առանձին երկրորդ համակարգ ստեղծելու։</p></div></section></>;
}
