import { sb } from '../lib/supabase.js';
import { el,esc,toast } from '../lib/dom.js';

const allowed=(role)=>role==='ADMIN'||role==='SUPER_ADMIN';

export async function renderAdmin({profile,onRefresh}){
  if(!allowed(profile.role))return el('<main class="page"><div class="empty">Մուտքը թույլատրված չէ</div></main>');
  const subjects=await sb.from('subjects').select('*').order('display_order').order('name');
  if(subjects.error)throw subjects.error;
  const node=el(`<main class="page"><header class="page-header"><div><div class="eyebrow">Admin Workspace</div><h1>Կառավարում</h1><p class="subtle">Ուսումնական բովանդակությունը և առարկաները՝ մեկ տեղում։</p></div></header>
  <section class="grid grid-2">
    <article class="card"><div class="row between"><div><div class="eyebrow">Subjects</div><h2 style="margin:.3rem 0">Առարկաներ</h2></div><button class="button primary" data-add-subject>＋ Ավելացնել</button></div><div class="stack" data-subject-list style="margin-top:16px">${(subjects.data||[]).map(s=>subjectRow(s)).join('')}</div></article>
    <div class="stack">
      <article class="card"><div class="eyebrow">Announcement</div><h2 style="margin:.3rem 0 1rem">Նոր հայտարարություն</h2><form data-announcement><div class="field"><label>Վերնագիր</label><input class="input" name="title" required></div><div class="field"><label>Տեքստ</label><textarea class="textarea" name="body" required></textarea></div><div class="row wrap"><label class="pill"><input type="checkbox" name="important"> Կարևոր</label><label class="pill"><input type="checkbox" name="pinned"> Ամրացված</label></div><button class="button primary" style="margin-top:14px">Հրապարակել</button></form></article>
      <article class="card"><div class="eyebrow">Homework</div><h2 style="margin:.3rem 0 1rem">Նոր տնային</h2><form data-homework><div class="field"><label>Առարկա</label><select class="select" name="subject" required>${(subjects.data||[]).filter(s=>s.is_active!==false).map(s=>`<option value="${s.id}">${esc(s.icon||'')} ${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Վերնագիր</label><input class="input" name="title" required></div><div class="field"><label>Նկարագրություն</label><textarea class="textarea" name="description"></textarea></div><div class="field"><label>Վերջնաժամկետ</label><input class="input" type="datetime-local" name="due" required></div><button class="button primary">Ավելացնել</button></form></article>
    </div>
  </section></main>`);

  node.querySelector('[data-add-subject]').addEventListener('click',()=>openSubjectEditor(null,onRefresh));
  node.querySelectorAll('[data-edit-subject]').forEach(b=>b.addEventListener('click',()=>{
    const s=(subjects.data||[]).find(x=>x.id===b.dataset.editSubject);openSubjectEditor(s,onRefresh);
  }));
  node.querySelector('[data-announcement]').addEventListener('submit',async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),button=e.submitter;button.disabled=true;
    const r=await sb.from('announcements').insert({title:f.get('title'),body:f.get('body'),is_important:f.get('important')==='on',is_pinned:f.get('pinned')==='on',author_id:profile.id});button.disabled=false;
    if(r.error)return toast(r.error.message,'err');e.currentTarget.reset();toast('Հայտարարությունը հրապարակվեց','ok');
  });
  node.querySelector('[data-homework]').addEventListener('submit',async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),button=e.submitter;button.disabled=true;
    const r=await sb.from('homework').insert({subject_id:f.get('subject'),title:f.get('title'),description:f.get('description')||null,due_at:new Date(f.get('due')).toISOString(),created_by:profile.id});button.disabled=false;
    if(r.error)return toast(r.error.message,'err');e.currentTarget.reset();toast('Տնայինը ավելացվեց','ok');
  });
  return node;
}

function subjectRow(s){return `<div class="list-item"><div class="row"><div class="avatar" style="background:${esc(s.color||'#0A84FF')}">${esc(s.icon||'📘')}</div><div><strong>${esc(s.name)}</strong><div class="subtle" style="font-size:.8rem">${esc(s.short_name||'')} · ${s.is_active===false?'Արխիվացված':'Ակտիվ'}</div></div></div><button class="button ghost" data-edit-subject="${s.id}">Խմբագրել</button></div>`}

function openSubjectEditor(subject,onRefresh){
  const overlay=document.querySelector('#overlay-root');
  const wrap=document.createElement('div');wrap.className='glass-sheet-backdrop';
  const panel=document.createElement('section');panel.className='glass-sheet glass';
  panel.innerHTML=`<div class="glass-sheet__handle"></div><div class="row between"><div><div class="eyebrow">Subject</div><h2 style="margin:.3rem 0">${subject?'Խմբագրել':'Նոր առարկա'}</h2></div><button class="button ghost" data-close>✕</button></div><form data-form style="margin-top:16px"><div class="field"><label>Անուն</label><input class="input" name="name" value="${esc(subject?.name||'')}" required></div><div class="field"><label>Կարճ անուն</label><input class="input" name="short" value="${esc(subject?.short_name||'')}"></div><div class="grid grid-2"><div class="field"><label>Emoji / Icon</label><input class="input" name="icon" value="${esc(subject?.icon||'')}"></div><div class="field"><label>Գույն</label><input class="input" type="color" name="color" value="${esc(subject?.color||'#0A84FF')}"></div></div>${subject?`<div class="field"><label>Հերթականություն</label><input class="input" type="number" min="0" name="order" value="${Number(subject.display_order||0)}"></div><label class="pill"><input type="checkbox" name="active" ${subject.is_active===false?'':'checked'}> Ակտիվ</label>`:''}<button class="button primary" style="width:100%;margin-top:16px">Պահպանել</button></form>`;
  document.body.append(wrap,panel);
  const close=()=>{wrap.remove();panel.remove()};wrap.addEventListener('click',close);panel.querySelector('[data-close]').addEventListener('click',close);
  panel.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),button=e.submitter;button.disabled=true;let r;if(subject)r=await sb.rpc('admin_update_subject',{p_id:subject.id,p_name:f.get('name'),p_short_name:f.get('short')||null,p_icon:f.get('icon')||null,p_color:f.get('color')||null,p_is_active:f.get('active')==='on',p_display_order:Number(f.get('order')||0)});else r=await sb.rpc('admin_create_subject',{p_name:f.get('name'),p_short_name:f.get('short')||null,p_icon:f.get('icon')||null,p_color:f.get('color')||null});button.disabled=false;if(r.error||!r.data)return toast(r.error?.message||'Չհաջողվեց պահպանել','err');close();toast('Առարկան պահպանվեց','ok');onRefresh?.()});
}
