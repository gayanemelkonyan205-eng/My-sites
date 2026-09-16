import { sb } from '../lib/supabase.js';
import { el,esc,fmt,toast } from '../lib/dom.js';

const isAdmin=role=>role==='ADMIN'||role==='SUPER_ADMIN';

export async function renderAdminRequests({profile,onRefresh}){
  if(!isAdmin(profile.role))return el('<main class="page"><div class="empty">Մուտքը թույլատրված չէ</div></main>');
  const [requests,students]=await Promise.all([
    sb.from('admin_role_requests').select('*,target:profiles!admin_role_requests_target_user_id_fkey(first_name,last_name,username,role),requester:profiles!admin_role_requests_requested_by_fkey(first_name,last_name,username)').order('created_at',{ascending:false}),
    sb.from('profiles').select('id,first_name,last_name,username,role,is_active').eq('role','STUDENT').eq('is_active',true).order('first_name')
  ]);
  if(requests.error)throw requests.error;
  const pending=(requests.data||[]).filter(r=>r.status==='PENDING');
  const node=el(`<main class="page"><header class="page-header"><div><div class="eyebrow">Admin Consensus</div><h1>Admin Requests</h1><p class="subtle">Մեկ Admin-ը առաջարկում է, մյուս Admin-ը հաստատում կամ մերժում է։</p></div></header>
  <section class="grid grid-2"><article class="card"><div class="eyebrow">Նոր առաջարկ</div><h2 style="margin:.3rem 0 1rem">Առաջարկել Admin</h2><form data-create-request><div class="field"><label>Աշակերտ</label><select class="select" name="target" required><option value="">Ընտրել…</option>${(students.data||[]).map(s=>`<option value="${s.id}">${esc(s.first_name)} ${esc(s.last_name)} · @${esc(s.username)}</option>`).join('')}</select></div><button class="button primary">Ստեղծել առաջարկ</button></form><p class="subtle" style="font-size:.82rem;margin-top:12px">Քո առաջարկը համարվում է առաջին համաձայնությունը։ Պետք է մեկ այլ Admin-ի հաստատումը։</p></article>
  <article class="card"><div class="eyebrow">Սպասող</div><h2 style="margin:.3rem 0 1rem">${pending.length} առաջարկ</h2><div class="stack">${pending.map(r=>requestCard(r,profile)).join('')||'<div class="empty">Սպասող առաջարկ չկա</div>'}</div></article></section>
  <section class="section"><h2>Պատմություն</h2><div class="stack">${(requests.data||[]).filter(r=>r.status!=='PENDING').map(r=>`<div class="list-item"><div><strong>${esc(r.target?.first_name||'')} ${esc(r.target?.last_name||'')}</strong><div class="subtle" style="font-size:.8rem">${esc(r.status)} · ${fmt(r.resolved_at||r.created_at)}</div></div><span class="pill">${esc(r.status)}</span></div>`).join('')||'<div class="empty">Պատմություն դեռ չկա</div>'}</div></section></main>`);

  node.querySelector('[data-create-request]').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),button=e.submitter;button.disabled=true;const r=await sb.rpc('create_admin_role_request',{p_target_user_id:f.get('target')});button.disabled=false;if(r.error||!r.data)return toast(r.error?.message||'Չհաջողվեց ստեղծել առաջարկը','err');toast('Առաջարկը ստեղծվեց','ok');onRefresh?.()});
  node.querySelectorAll('[data-vote]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;const r=await sb.rpc('vote_admin_role_request',{p_request_id:button.dataset.request,p_decision:button.dataset.vote});button.disabled=false;if(r.error||r.data!==true)return toast(r.error?.message||'Քվեարկությունը չհաջողվեց','err');toast(button.dataset.vote==='APPROVE'?'Admin-ը հաստատվեց':'Առաջարկը մերժվեց','ok');onRefresh?.()}));
  node.querySelectorAll('[data-cancel]').forEach(button=>button.addEventListener('click',async()=>{button.disabled=true;const r=await sb.rpc('cancel_admin_role_request',{p_request_id:button.dataset.cancel});button.disabled=false;if(r.error||r.data!==true)return toast(r.error?.message||'Չհաջողվեց','err');toast('Առաջարկը չեղարկվեց','ok');onRefresh?.()}));
  return node;
}

function requestCard(r,profile){const own=r.requested_by===profile.id;return `<div class="list-item" style="display:block"><div class="row between wrap"><div><strong>${esc(r.target?.first_name||'')} ${esc(r.target?.last_name||'')}</strong><div class="subtle" style="font-size:.8rem">@${esc(r.target?.username||'')} · առաջարկել է ${esc(r.requester?.first_name||'')} ${esc(r.requester?.last_name||'')}</div></div><span class="pill">${fmt(r.created_at)}</span></div><div class="row wrap" style="margin-top:12px">${own?`<button class="button ghost" data-cancel="${r.id}">Չեղարկել</button><span class="subtle" style="font-size:.8rem">Քո առաջարկին դու չես քվեարկում</span>`:`<button class="button primary" data-vote="APPROVE" data-request="${r.id}">Հաստատել</button><button class="button danger" data-vote="REJECT" data-request="${r.id}">Մերժել</button>`}</div></div>`}
