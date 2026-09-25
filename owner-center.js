import { sb } from './supabase-client.js';
import { toast } from './notifications-ui.js';

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=v=>v?new Intl.DateTimeFormat('hy-AM',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';
let ownerPromise=null;
let ownerUserId=null;

function installStyle(){
  if($('#owner-center-style'))return;
  const style=document.createElement('style');
  style.id='owner-center-style';
  style.textContent=`
    .cc-owner-tab{position:relative}
    .cc-owner-tab::after{content:'OWNER';font-size:9px;font-weight:800;letter-spacing:.08em;padding:2px 5px;border-radius:999px;background:linear-gradient(135deg,#ffd36a,#ff9f0a);color:#291900;margin-left:6px}
    .owner-hero{background:linear-gradient(145deg,rgba(255,214,102,.14),rgba(255,159,10,.05));border:1px solid rgba(255,214,102,.24)!important}
    .owner-badge{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,214,102,.28);background:rgba(255,190,48,.09);padding:7px 10px;border-radius:999px;font-weight:800;color:#ffd66b}
    .owner-user{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center}
    .owner-user small{display:block;opacity:.62;margin-top:4px}
    .owner-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
    .owner-danger{border:1px solid rgba(255,69,58,.28)!important;background:rgba(255,69,58,.09)!important;color:#ff7067!important}
    .owner-warn{border:1px solid rgba(255,159,10,.3)!important;background:rgba(255,159,10,.09)!important;color:#ffbd66!important}
    .owner-protected{opacity:.8;border-style:dashed!important}
    .owner-kpi b{font-size:28px;display:block;margin-top:6px}
    .owner-log{display:grid;gap:4px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.07)}
    .owner-log:last-child{border-bottom:0}
    .owner-log small{opacity:.58}
    .owner-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    @media(max-width:720px){.owner-user{grid-template-columns:1fr}.owner-actions{justify-content:flex-start}.owner-form-grid{grid-template-columns:1fr}.cc-owner-tab::after{display:none}}
  `;
  document.head.append(style);
}

async function isOwner(){
  if(!ownerPromise) ownerPromise=(async()=>{
    const [{data:flag,error},{data:userData}]=await Promise.all([sb.rpc('is_current_owner'),sb.auth.getUser()]);
    if(error)return false;
    ownerUserId=userData?.user?.id||null;
    return flag===true;
  })();
  return ownerPromise;
}

async function loadOwner(){
  const body=$('#cc-body');
  if(!body)return;
  body.innerHTML='<div class="cc-loading">Բեռնվում է Owner Center…</div>';
  const [profilesRes,auditRes]=await Promise.all([
    sb.from('profiles').select('id,first_name,last_name,username,role,is_active,created_at,deleted_at,delete_reason').order('first_name'),
    sb.from('audit_logs').select('action,entity_id,metadata,created_at').like('action','owner.%').order('created_at',{ascending:false}).limit(20)
  ]);
  if(profilesRes.error){body.innerHTML=`<div class="cc-empty">${esc(profilesRes.error.message)}</div>`;return}
  const users=profilesRes.data||[];
  const active=users.filter(u=>!u.deleted_at);
  const superAdmins=active.filter(u=>u.role==='SUPER_ADMIN');
  const deleted=users.filter(u=>u.deleted_at);
  const admins=active.filter(u=>u.role==='ADMIN');

  body.innerHTML=`
    <div class="cc-grid cc-stats">
      <article class="cc-stat owner-kpi"><span>Super Admin</span><b>${superAdmins.length}</b></article>
      <article class="cc-stat owner-kpi"><span>Admin</span><b>${admins.length}</b></article>
      <article class="cc-stat owner-kpi"><span>Աղբաման</span><b>${deleted.length}</b></article>
    </div>

    <article class="cc-card owner-hero">
      <div class="cc-section-head"><div><span class="owner-badge">♛ OWNER</span><h3 style="margin-top:12px">Գլխավոր սեփականատեր</h3><p class="cc-muted">Այս մակարդակը կապված է միայն քո պաշտպանված հաշվին։ Մյուս Super Admin-ները չեն կարող քեզ իջեցնել, արգելափակել կամ ջնջել։</p></div></div>
    </article>

    <div class="cc-grid cc-grid-2 cc-top-align">
      <section class="cc-card"><h3>Super Admin-ների կառավարում</h3><p class="cc-muted">Դու կարող ես իջեցնել կամ մեղմ ջնջել մյուս Super Admin-ներին։</p><div class="cc-list">${superAdmins.map(u=>ownerUserRow(u)).join('')||'<div class="cc-empty">Չկան</div>'}</div></section>
      <section class="cc-card"><h3>Ուղարկել ծանուցում</h3><p class="cc-muted">Ուղարկիր համակարգային ծանուցում ամբողջ դասարանին կամ ընտրված խմբին։</p>
        <form id="owner-notify" class="cc-form">
          <label>Ում<select name="scope" id="owner-scope"><option value="ALL">Բոլորին</option><option value="ADMINS">Admin + Super Admin</option><option value="SUPER_ADMINS">Միայն Super Admin</option><option value="USER">Մեկ օգտատիրոջ</option></select></label>
          <label id="owner-target-wrap" hidden>Օգտատեր<select name="user">${active.map(u=>`<option value="${u.id}">${esc(u.first_name)} ${esc(u.last_name)} · @${esc(u.username)}</option>`).join('')}</select></label>
          <label>Վերնագիր<input name="title" maxlength="120" required placeholder="Օր․ Կարևոր ծանուցում"></label>
          <label>Տեքստ<textarea name="body" maxlength="1000" required></textarea></label>
          <label>Հղում (ոչ պարտադիր)<input name="href" maxlength="300" placeholder="#notifications"></label>
          <button class="cc-primary">Ուղարկել</button>
        </form>
      </section>
    </div>

    <div class="cc-grid cc-grid-2 cc-top-align">
      <section class="cc-card"><h3>Մեղմ ջնջված օգտատերեր</h3><p class="cc-muted">Տվյալները չեն կորչում։ Կարող ես ցանկացած պահի վերականգնել։</p><div class="cc-list">${deleted.map(u=>deletedUserRow(u)).join('')||'<div class="cc-empty">Աղբամանը դատարկ է</div>'}</div></section>
      <section class="cc-card"><h3>Owner գործողությունների պատմություն</h3><div>${(auditRes.data||[]).map(a=>`<div class="owner-log"><b>${esc(a.action)}</b><span>${esc(a.entity_id||'')}</span><small>${fmt(a.created_at)}</small></div>`).join('')||'<div class="cc-empty">Գործողություններ դեռ չկան</div>'}</div></section>
    </div>`;

  $('#owner-scope',body).onchange=e=>{$('#owner-target-wrap',body).hidden=e.target.value!=='USER'};
  $('#owner-notify',body).onsubmit=sendNotification;
  $$('[data-owner-demote]',body).forEach(b=>b.onclick=()=>demoteUser(b.dataset.ownerDemote));
  $$('[data-owner-delete]',body).forEach(b=>b.onclick=()=>openSoftDelete(b.dataset.ownerDelete,users.find(u=>u.id===b.dataset.ownerDelete)));
  $$('[data-owner-restore]',body).forEach(b=>b.onclick=()=>restoreUser(b.dataset.ownerRestore));
}

function ownerUserRow(u){
  const mine=u.id===ownerUserId;
  return `<article class="cc-card owner-user ${mine?'owner-protected':''}"><div><b>${esc(u.first_name)} ${esc(u.last_name)} ${mine?'<span class="owner-badge" style="margin-left:6px">OWNER</span>':''}</b><small>@${esc(u.username)} · ${esc(u.role)}</small></div><div class="owner-actions">${mine?'<span class="cc-status ok">Պաշտպանված</span>':`<button class="btn owner-warn" data-owner-demote="${u.id}">Դարձնել ADMIN</button><button class="btn owner-danger" data-owner-delete="${u.id}">Մեղմ ջնջել</button>`}</div></article>`;
}
function deletedUserRow(u){return `<article class="cc-card owner-user"><div><b>${esc(u.first_name)} ${esc(u.last_name)}</b><small>@${esc(u.username)} · ${esc(u.role)} · ${fmt(u.deleted_at)}${u.delete_reason?` · ${esc(u.delete_reason)}`:''}</small></div><div class="owner-actions"><button class="btn" data-owner-restore="${u.id}">Վերականգնել</button></div></article>`}

async function demoteUser(id){
  if(!confirm('Այս Super Admin-ին դարձնե՞լ ADMIN։'))return;
  const {data,error}=await sb.rpc('super_admin_set_user_role',{p_user_id:id,p_role:'ADMIN'});
  if(error||!data)return toast(error?.message||'Չհաջողվեց','err');
  toast('Դերը փոխվեց՝ ADMIN','ok');loadOwner();
}

function openSoftDelete(id,user){
  document.querySelector('#owner-delete-modal')?.remove();
  const modal=document.createElement('div');modal.className='modal-wrap';modal.id='owner-delete-modal';
  modal.innerHTML=`<div class="modal"><div class="top"><h2>Մեղմ ջնջում</h2><button class="btn" type="button" data-close>×</button></div><p>${esc(user?`${user.first_name} ${user.last_name}`:'Օգտատեր')}</p><p class="muted">Հաշիվը կդառնա ոչ ակտիվ, բայց տվյալները կմնան և կարող են վերականգնվել։</p><form id="owner-delete-form" class="cc-form"><label>Պատճառ (ոչ պարտադիր)<textarea name="reason" maxlength="300"></textarea></label><button class="cc-danger">Տեղափոխել աղբաման</button></form></div>`;
  document.body.append(modal);
  $('[data-close]',modal).onclick=()=>modal.remove();modal.onclick=e=>{if(e.target===modal)modal.remove()};
  $('#owner-delete-form',modal).onsubmit=async e=>{e.preventDefault();const b=e.submitter;b.disabled=true;const reason=new FormData(e.currentTarget).get('reason');const {data,error}=await sb.rpc('owner_soft_delete_user',{p_user_id:id,p_reason:reason||null});b.disabled=false;if(error||!data)return toast(error?.message||'Չհաջողվեց','err');modal.remove();toast('Օգտատերը տեղափոխվեց աղբաման','ok');loadOwner()};
}

async function restoreUser(id){
  const {data,error}=await sb.rpc('owner_restore_user',{p_user_id:id});
  if(error||!data)return toast(error?.message||'Չհաջողվեց','err');
  toast('Օգտատերը վերականգնվեց','ok');loadOwner();
}

async function sendNotification(e){
  e.preventDefault();const f=new FormData(e.currentTarget),scope=f.get('scope'),btn=e.submitter;btn.disabled=true;
  const {data,error}=await sb.rpc('owner_send_notification',{p_scope:scope,p_title:f.get('title'),p_body:f.get('body'),p_href:f.get('href')||null,p_user_id:scope==='USER'?f.get('user'):null});
  btn.disabled=false;if(error||!data)return toast(error?.message||'Ծանուցումը չուղարկվեց','err');
  e.currentTarget.reset();$('#owner-target-wrap').hidden=true;toast(`Ուղարկվեց՝ ${data} օգտատիրոջ`,'ok');loadOwner();
}

async function enhance(){
  installStyle();
  const shell=$('.cc-shell[data-cc-mode="superadmin"]');
  const tabbar=shell?.querySelector('.cc-tabbar');
  if(!shell||!tabbar||tabbar.querySelector('[data-owner-tab]'))return;
  if(!await isOwner())return;
  const btn=document.createElement('button');btn.type='button';btn.dataset.ownerTab='1';btn.className='cc-owner-tab';btn.innerHTML='♛ Owner';
  btn.onclick=()=>{$$('.cc-tabbar button',shell).forEach(x=>x.classList.remove('active'));btn.classList.add('active');loadOwner()};
  tabbar.append(btn);
  const pill=shell.querySelector('.cc-role-pill');if(pill)pill.textContent='♛ OWNER · SUPER ADMIN';
}

const observer=new MutationObserver(()=>queueMicrotask(enhance));
observer.observe(document.body,{subtree:true,childList:true});
window.addEventListener('portal:boot-state',enhance);
enhance();
