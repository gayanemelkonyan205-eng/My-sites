import { sb } from '../lib/supabase.js';
import { el,esc,fmt,toast } from '../lib/dom.js';

const dayNames=['','Երկուշաբթի','Երեքշաբթի','Չորեքշաբթի','Հինգշաբթի','Ուրբաթ','Շաբաթ'];

export async function renderStudy({profile}){
  const [schedule,homework,completion]=await Promise.all([
    sb.from('schedule_entries').select('*,subject:subjects(id,name,short_name,icon,color,is_active)').order('weekday').order('lesson_number'),
    sb.from('homework').select('*,subject:subjects(id,name,short_name,icon,color)').order('due_at'),
    sb.from('homework_completion').select('homework_id').eq('student_id',profile.id)
  ]);
  const done=new Set((completion.data||[]).map(x=>x.homework_id));
  const node=el(`<main class="page"><header class="page-header"><div><div class="eyebrow">Study</div><h1>Ուսում</h1><p class="subtle">Դասացուցակն ու տնայինները՝ մեկ հանգիստ տարածքում։</p></div></header>
  <section class="section"><div class="row between wrap"><h2>Այս շաբաթ</h2><span class="pill">${(schedule.data||[]).length} դաս</span></div><div class="grid grid-2">${[1,2,3,4,5].map(day=>`<article class="card"><div class="row between"><h3 style="margin:0">${dayNames[day]}</h3><span class="pill">${(schedule.data||[]).filter(x=>x.weekday===day).length}</span></div><div class="timeline" style="margin-top:14px">${(schedule.data||[]).filter(x=>x.weekday===day).map(x=>`<div class="timeline-row"><div class="timeline-time">${esc((x.start_time||'').slice(0,5))}</div><div class="list-item" style="display:block"><strong>${x.subject?.icon?`${esc(x.subject.icon)} `:''}${esc(x.subject?.name||'Առարկա')}</strong><div class="subtle" style="font-size:.8rem;margin-top:4px">${x.room?`Սենյակ ${esc(x.room)}`:''}</div></div></div>`).join('')||'<div class="empty">Դաս չկա</div>'}</div></article>`).join('')}</div></section>
  <section class="section"><div class="row between wrap"><h2>Տնայիններ</h2><span class="pill">${(homework.data||[]).length}</span></div><div class="grid grid-2">${(homework.data||[]).map(x=>`<article class="card" data-homework="${x.id}"><div class="row between"><span class="subject-chip">${x.subject?.icon?`${esc(x.subject.icon)} `:''}${esc(x.subject?.short_name||x.subject?.name||'ԴԶ')}</span>${done.has(x.id)?'<span class="pill" style="color:var(--success)">Արված է</span>':''}</div><h3 style="margin:14px 0 6px">${esc(x.title)}</h3><p class="subtle">${esc(x.description||'')}</p><div class="subtle" style="font-size:.82rem">Վերջնաժամկետ՝ ${fmt(x.due_at)}</div><button class="button ${done.has(x.id)?'ghost':'primary'}" data-toggle-homework="${x.id}" data-done="${done.has(x.id)}" style="margin-top:14px">${done.has(x.id)?'Չեղարկել':'Նշել արված'}</button></article>`).join('')||'<div class="empty">Տնայիններ չկան</div>'}</div></section></main>`);
  node.querySelectorAll('[data-toggle-homework]').forEach(button=>button.addEventListener('click',async()=>{
    button.disabled=true;const id=button.dataset.toggleHomework;let result;
    if(button.dataset.done==='true')result=await sb.from('homework_completion').delete().eq('homework_id',id).eq('student_id',profile.id);
    else result=await sb.from('homework_completion').insert({homework_id:id,student_id:profile.id,completed_at:new Date().toISOString()});
    button.disabled=false;if(result.error)return toast(result.error.message,'err');
    button.dataset.done=button.dataset.done==='true'?'false':'true';button.textContent=button.dataset.done==='true'?'Չեղարկել':'Նշել արված';button.classList.toggle('primary',button.dataset.done!=='true');button.classList.toggle('ghost',button.dataset.done==='true');
  }));
  return node;
}
