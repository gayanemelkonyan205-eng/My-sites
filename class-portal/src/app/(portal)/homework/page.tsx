import { CircleCheckBig, Clock3 } from "lucide-react";
import { PageHeading } from "@/components/page-heading";

const tasks = [
  { subject: "Ֆիզիկա", title: "Լուծել §12-ի 4–7 խնդիրները", due: "Վաղը, 18:00", done: false },
  { subject: "Հայոց լեզու", title: "Վարժություն 38", due: "Ուրբաթ", done: false },
  { subject: "Քիմիա", title: "Կրկնել օքսիդների թեման", due: "Կատարված", done: true }
];

export default function HomeworkPage() {
  return <><PageHeading title="Տնային առաջադրանքներ" description="Ձեր անձնական կատարման կարգավիճակը չի ազդում մյուս դասընկերների վրա։" /><div className="mb-4 flex gap-2 overflow-x-auto pb-1">{["Այսօր", "Վաղը", "Շաբաթ", "Բոլորը", "Չկատարված", "Կատարված"].map((x, i) => <button key={x} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold ${i === 0 ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--border)] bg-[var(--surface)]"}`}>{x}</button>)}</div><div className="space-y-3">{tasks.map((task) => <article key={task.title} className="surface flex items-start gap-4 p-4 sm:p-5"><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${task.done ? "bg-emerald-500/10 text-[var(--success)]" : "bg-[var(--accent)]/10 text-[var(--accent)]"}`}>{task.done ? <CircleCheckBig className="size-5" /> : <Clock3 className="size-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-xs font-bold text-[var(--accent)]">{task.subject}</span><span className="text-xs muted">{task.due}</span></div><h2 className="mt-1 font-semibold leading-6">{task.title}</h2></div><button className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold">{task.done ? "Կատարված" : "Նշել"}</button></article>)}</div></>;
}
