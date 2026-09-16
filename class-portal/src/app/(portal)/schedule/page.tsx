import { PageHeading } from "@/components/page-heading";

const days = [
  ["Երկուշաբթի", ["Հայոց լեզու", "Ֆիզիկա", "Մաթեմատիկա", "Պատմություն"]],
  ["Երեքշաբթի", ["Քիմիա", "Անգլերեն", "Երկրաչափություն", "Կենսաբանություն"]],
  ["Չորեքշաբթի", ["Ֆիզիկա", "Հայ գրականություն", "Մաթեմատիկա", "Ինֆորմատիկա"]]
] as const;

export default function SchedulePage() {
  return <><PageHeading title="Դասացուցակ" description="Շաբաթվա դասերը՝ հարմար քարտերով նաև հեռախոսում։" /><div className="grid gap-4 lg:grid-cols-3">{days.map(([day, lessons]) => <section key={day} className="surface p-5"><h2 className="font-bold">{day}</h2><ol className="mt-4 space-y-2">{lessons.map((lesson, i) => <li key={lesson} className="flex items-center gap-3 rounded-xl bg-[var(--surface-soft)] p-3"><span className="grid size-7 place-items-center rounded-lg bg-[var(--surface)] text-xs font-bold">{i + 1}</span><span className="font-medium">{lesson}</span></li>)}</ol></section>)}</div></>;
}
