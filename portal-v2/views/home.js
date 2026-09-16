import { sb } from '../lib/supabase.js';
import { el,esc,fmt } from '../lib/dom.js';

export async function renderHome({profile}){
  const now=new Date().toISOString();
  const [homework,announcements,notifications,events]=await Promise.all([
    sb.from('homework').select('id,title,due_at,subject:subjects(name,short_name)').gte('due_at',now).order('due_at').limit(5),
    sb.from('announcements').select('id,title,body,is_pinned,is_important,created_at').order('is_pinned',{ascending:false}).order('created_at',{ascending:false}).limit(4),
    sb.from('notifications').select('id').is('read_at',null),
    sb.from('events').select('id,title,starts_at').gte('starts_at',now).order('starts_at').limit(3)
  ]);
  const h=homework.data||[],a=announcements.data||[],n=notifications.data||[],e=events.data||[];
  return el(`<main class="page">
    <header class="page-header"><div><div class="eyebrow">Class Portal</div><h1>Բարև, ${esc(profile.first_name)}.</h1><p class="subtle">Ամենակարևորն այսօր՝ առանց ավելորդ աղմուկի։</p></div></header>
    <section class="feature-hero">
      <article class="card hero-card"><div class="pill">Այսօր</div><div style="margin-top:auto"><div class="metric">${h.length}</div><h2 style="margin:.35rem 0">մոտակա տնային</h2><p class="subtle">Հաջորդը՝ ${h[0]?`${esc(h[0].subject?.name||'Առարկա')} · ${fmt(h[0].due_at)}`:'ամեն ինչ պատրաստ է ✨'}</p></div></article>
      <div class="stat-grid"><article class="card stat-card"><span class="subtle">Չկարդացված</span><strong class="metric" style="font-size:2.7rem">${n.length}</strong></article><article class="card stat-card"><span class="subtle">Միջոցառումներ</span><strong class="metric" style="font-size:2.7rem">${e.length}</strong></article><article class="card stat-card"><span class="subtle">Դերը</span><strong>${esc(profile.role)}</strong></article></div>
    </section>
    <section class="section grid grid-2">
      <article class="card"><div class="row between"><h2>Տնայիններ</h2><span class="pill">Մոտակա</span></div><div class="list">${h.length?h.map(x=>`<div class="list-item"><div><strong>${esc(x.title)}</strong><div class="subtle" style="font-size:.82rem;margin-top:4px">${esc(x.subject?.name||'Առարկա')} · ${fmt(x.due_at)}</div></div><span class="subject-chip">${esc(x.subject?.short_name||'ԴԶ')}</span></div>`).join(''):'<div class="empty">Մոտակա տնային չկա 🎉</div>'}</div></article>
      <article class="card"><div class="row between"><h2>Հայտարարություններ</h2><span class="pill">Վերջին</span></div><div class="list">${a.length?a.map(x=>`<div class="list-item"><div><strong>${x.is_pinned?'📌 ':''}${esc(x.title)}</strong><div class="subtle" style="font-size:.82rem;margin-top:4px">${esc(x.body||'').slice(0,110)}</div></div>${x.is_important?'<span class="pill" style="color:var(--warning)">Կարևոր</span>':''}</div>`).join(''):'<div class="empty">Դեռ հայտարարություն չկա</div>'}</div></article>
    </section>
  </main>`);
}
