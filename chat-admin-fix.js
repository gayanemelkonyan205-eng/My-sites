import { sb } from './supabase-client.js';
import { toast } from './notifications-ui.js';

const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=v=>v?new Intl.DateTimeFormat('hy-AM',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';
const track=(event,properties={})=>window.dispatchEvent(new CustomEvent('portal:track',{detail:{event,properties}}));

async function getProfile(){const {data,error}=await sb.rpc('get_my_profile');if(error)throw error;return Array.isArray(data)?data[0]:data}

async function renderAdminChat(){
  const body=$('#cc-body');if(!body)return;
  body.innerHTML='<div class="cc-loading">Բեռնվում է…</div>';
  const profile=await getProfile();
  if(!['ADMIN','SUPER_ADMIN'].includes(profile?.role)){body.innerHTML='<div class="cc-empty">Admin իրավունք չկա</div>';return}
  const [convs,users]=await Promise.all([
    sb.from('conversations').select('id,type,title,updated_at').order('updated_at',{ascending:false}),
    sb.from('profiles').select('id,first_name,last_name,username').eq('is_active',true).order('first_name')
  ]);
  if(convs.error)throw convs.error;if(users.error)throw users.error;
  const list=convs.data||[];
  body.innerHTML=`<div class="cc-grid cc-grid-2 cc-top-align">
    <article class="cc-card"><h3>Նոր խմբային չատ</h3><p class="cc-muted">Ստեղծիր առանձին խումբ դասարանի անդամների համար։</p><form id="ccaf-group" class="cc-form"><label>Անվանում<input name="title" required maxlength="80"></label><label>Անդամներ<select name="members" multiple size="9">${(users.data||[]).filter(u=>u.id!==profile.id).map(u=>`<option value="${u.id}">${esc(u.first_name)} ${esc(u.last_name)} · @${esc(u.username)}</option>`).join('')}</select></label><button class="cc-primary">Ստեղծել խումբ</button></form></article>
    <article class="cc-card"><div class="cc-section-head"><div><h3>Չատի մոդերացիա</h3><p class="cc-muted">Ջնջում, վերականգնում և ամրացում։</p></div><select id="ccaf-conv">${list.map(c=>`<option value="${c.id}">${c.type==='CLASS'?'Դասարան':c.type==='DIRECT'?'Անձնական':'Խումբ'} · ${esc(c.title||c.type)}</option>`).join('')}</select></div><div id="ccaf-pins"></div><div id="ccaf-messages" class="cc-mini-messages"></div></article>
  </div>`;

  $('#ccaf-group',body).onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const ids=[...e.currentTarget.members.selectedOptions].map(o=>o.value);const btn=e.submitter;btn.disabled=true;const r=await sb.rpc('create_group_conversation',{p_title:String(f.get('title')).trim(),p_member_ids:ids});btn.disabled=false;if(r.error||!r.data)return toast(r.error?.message||'Խումբը չստեղծվեց','err');track('group_chat_created');toast('Խումբը ստեղծվեց','ok');await renderAdminChat()};

  async function load(){
    const convId=$('#ccaf-conv',body)?.value;const host=$('#ccaf-messages',body);const pinHost=$('#ccaf-pins',body);if(!convId||!host)return;
    host.innerHTML='<div class="cc-loading">Բեռնվում է…</div>';
    const [msgRes,pinRes]=await Promise.all([
      sb.from('messages').select('id,sender_id,body,created_at,deleted_at').eq('conversation_id',convId).order('created_at',{ascending:false}).limit(60),
      sb.from('pinned_messages').select('message_id,pinned_at').eq('conversation_id',convId).order('pinned_at',{ascending:false})
    ]);
    if(msgRes.error){host.innerHTML=`<div class="cc-empty">${esc(msgRes.error.message)}</div>`;return}
    const messages=msgRes.data||[];const senderIds=[...new Set(messages.map(m=>m.sender_id).filter(Boolean))];
    let senderMap=new Map();
    if(senderIds.length){const p=await sb.from('profiles').select('id,first_name,last_name').in('id',senderIds);if(!p.error)senderMap=new Map((p.data||[]).map(x=>[x.id,x]));}
    const pinned=new Set((pinRes.data||[]).map(x=>x.message_id));
    if(pinHost){const pinnedRows=messages.filter(m=>pinned.has(m.id)&&!m.deleted_at);pinHost.innerHTML=pinnedRows.length?`<div class="ccaf-pinned"><b>Ամրացված</b>${pinnedRows.map(m=>`<button data-unpin="${m.id}">${esc((m.body||'').slice(0,70))}<span>×</span></button>`).join('')}</div>`:'';}
    host.innerHTML=messages.map(m=>{const s=senderMap.get(m.sender_id);const name=s?`${s.first_name||''} ${s.last_name||''}`.trim():'Մասնակից';return `<div class="cc-message ${m.deleted_at?'deleted':''}"><div><b>${esc(name)}</b><span>${esc(m.body||'')}</span><small>${fmt(m.created_at)}${pinned.has(m.id)?' · Ամրացված':''}</small></div><div>${m.deleted_at&&profile.role==='SUPER_ADMIN'?`<button data-restore="${m.id}">Վերականգնել</button>`:!m.deleted_at?`${pinned.has(m.id)?`<button data-unpin="${m.id}">Ապամրացնել</button>`:`<button data-pin="${m.id}">Ամրացնել</button>`}${profile.role==='SUPER_ADMIN'?`<button class="cc-danger-mini" data-delete-message="${m.id}">Ջնջել</button>`:''}`:''}</div></div>`}).join('')||'<div class="cc-empty">Հաղորդագրություններ չկան</div>';

    $$('[data-delete-message]',body).forEach(b=>b.onclick=async()=>{if(!confirm('Ջնջե՞լ այս հաղորդագրությունը։'))return;b.disabled=true;const r=await sb.rpc('admin_delete_message',{p_message_id:b.dataset.deleteMessage});if(r.error||!r.data){b.disabled=false;return toast(r.error?.message||'Չհաջողվեց','err')}track('message_moderated');await load()});
    $$('[data-pin]',body).forEach(b=>b.onclick=async()=>{const r=await sb.rpc('admin_pin_message',{p_message_id:b.dataset.pin});if(r.error||!r.data)return toast(r.error?.message||'Չհաջողվեց','err');toast('Ամրացվեց','ok');await load()});
    $$('[data-unpin]',body).forEach(b=>b.onclick=async()=>{const r=await sb.rpc('admin_unpin_message',{p_message_id:b.dataset.unpin});if(r.error||!r.data)return toast(r.error?.message||'Չհաջողվեց','err');toast('Ամրացումը հանվեց','ok');await load()});
    $$('[data-restore]',body).forEach(b=>b.onclick=async()=>{const r=await sb.rpc('super_admin_restore_message',{p_message_id:b.dataset.restore});if(r.error||!r.data)return toast(r.error?.message||'Չհաջողվեց','err');await load()});
  }
  $('#ccaf-conv',body).onchange=load;await load();
}

document.addEventListener('click',event=>{
  const button=event.target.closest('.cc-tabbar [data-cc-tab="chat"]');if(!button)return;
  const shell=button.closest('.cc-shell');if(!shell)return;
  event.preventDefault();event.stopImmediatePropagation();
  $$('.cc-tabbar button',shell).forEach(x=>x.classList.toggle('active',x===button));
  renderAdminChat().catch(error=>toast(error.message||String(error),'err'));
},true);

const style=document.createElement('style');style.textContent=`.ccaf-pinned{margin:12px 0;display:flex;align-items:center;gap:8px;overflow:auto}.ccaf-pinned>b{font-size:12px;white-space:nowrap}.ccaf-pinned button{border:0;border-radius:999px;padding:8px 10px;background:var(--soft);color:inherit;white-space:nowrap}.ccaf-pinned button span{margin-left:8px;opacity:.6}`;document.head.append(style);
