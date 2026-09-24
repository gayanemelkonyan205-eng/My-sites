import { sb } from './supabase-client.js';

let active = null;
const escapeHtml = (value='') => String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const current = chat => active===chat && chat.box.isConnected;

function ensureDeleteStyles(){
  if(document.getElementById('chat-delete-style'))return;
  const style=document.createElement('style');
  style.id='chat-delete-style';
  style.textContent=`
    .msg{position:relative}
    .msg-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:3px}
    .msg-delete{appearance:none;border:0;background:transparent;color:inherit;opacity:.46;cursor:pointer;padding:3px 6px;border-radius:8px;font:600 12px/1 system-ui,sans-serif;transition:opacity .15s ease,background .15s ease,transform .15s ease}
    .msg-delete:hover,.msg-delete:focus-visible{opacity:1;background:color-mix(in srgb,currentColor 10%,transparent);outline:none}
    .msg-delete:active{transform:scale(.94)}
    .msg-delete:disabled{opacity:.25;cursor:wait}
  `;
  document.head.append(style);
}

export function stopChat() {
  const previous=active;
  active=null;
  if(!previous)return;
  clearInterval(previous.poll);
  clearTimeout(previous.refresh);
  if(previous.channel)sb.removeChannel(previous.channel);
  if(previous.box)previous.box.onclick=null;
  if(previous.form)previous.form.onsubmit=null;
}

function status(chat,text) {
  if(current(chat)&&chat.status.textContent!==text)chat.status.textContent=text;
}

async function resolvePermissions(chat){
  try{
    const {data,error}=await sb.rpc('get_my_profile');
    if(error||!current(chat))return;
    const profile=Array.isArray(data)?data[0]:data;
    chat.isSuper=profile?.role==='SUPER_ADMIN';
    chat.html=null;
    refresh(chat,0);
  }catch{
    // Own-message deletion still works even if role lookup temporarily fails.
  }
}

async function loadMessages(chat) {
  if(!current(chat)||chat.loading)return;
  chat.loading=true;
  try {
    const {data,error}=await sb.from('messages')
      .select('id,conversation_id,sender_id,body,created_at,deleted_at')
      .eq('conversation_id',chat.id).is('deleted_at',null)
      .order('created_at',{ascending:false}).limit(250);
    if(error)throw error;
    const rows=(data||[]).slice().reverse();
    const ids=[...new Set(rows.map(m=>m.sender_id).filter(Boolean))];
    let senders=new Map();
    if(ids.length){
      const result=await sb.from('profiles').select('id,first_name,last_name').in('id',ids);
      if(!result.error)senders=new Map((result.data||[]).map(p=>[p.id,p]));
    }
    if(!current(chat))return;
    const nearBottom=chat.box.scrollHeight-chat.box.scrollTop-chat.box.clientHeight<100;
    const html=rows.map(m=>{
      const sender=senders.get(m.sender_id);
      const own=m.sender_id===chat.userId;
      const name=own?'Դուք':`${sender?.first_name||''} ${sender?.last_name||''}`.trim()||'Մասնակից';
      const time=new Intl.DateTimeFormat('hy-AM',{dateStyle:'medium',timeStyle:'short'}).format(new Date(m.created_at));
      const canDelete=own||chat.isSuper;
      const deleteButton=canDelete?`<button class="msg-delete" type="button" data-delete-message="${escapeHtml(m.id)}" aria-label="Ջնջել հաղորդագրությունը" title="Ջնջել">Ջնջել</button>`:'';
      return `<div class="msg ${own?'mine':''}" data-message-id="${escapeHtml(m.id)}"><div class="msg-head"><div class="who">${escapeHtml(name)}</div>${deleteButton}</div>${escapeHtml(m.body||'').replace(/\n/g,'<br>')}<div class="small muted">${time}</div></div>`;
    }).join('')||'<div class="empty">Առաջին հաղորդագրությունը կարող է քոնը լինել ✨</div>';
    if(chat.html!==html){chat.box.innerHTML=html;chat.html=html;if(nearBottom||!chat.loaded)chat.box.scrollTop=chat.box.scrollHeight;}
    chat.loaded=true;
    status(chat,chat.online?'Առցանց':'Ավտոմատ թարմացում');
  }catch{
    status(chat,'Չատը չի թարմացվում։ Կրկին կփորձենք։');
  }finally{
    chat.loading=false;
    if(chat.reload&&current(chat)){chat.reload=false;refresh(chat,0);}
  }
}

function refresh(chat,delay=100) {
  if(!current(chat))return;
  if(chat.loading){chat.reload=true;return;}
  clearTimeout(chat.refresh);
  chat.refresh=setTimeout(()=>loadMessages(chat),delay);
}

async function deleteMessage(chat,messageId,button){
  if(!current(chat)||chat.deleting)return;
  const row=button.closest('.msg');
  const own=row?.classList.contains('mine');
  const question=own?'Ջնջե՞լ քո հաղորդագրությունը։':'Ջնջե՞լ այս հաղորդագրությունը որպես Super Admin։';
  if(!window.confirm(question))return;
  chat.deleting=messageId;
  button.disabled=true;
  status(chat,'Ջնջվում է…');
  try{
    const {data,error}=await sb.rpc('delete_message',{p_message_id:messageId});
    if(error||data!==true)throw error||new Error('delete_failed');
    row?.remove();
    chat.html=null;
    status(chat,'Հաղորդագրությունը ջնջված է');
    refresh(chat,0);
  }catch{
    if(current(chat)){
      button.disabled=false;
      status(chat,'Չհաջողվեց ջնջել հաղորդագրությունը։');
    }
  }finally{
    chat.deleting=null;
  }
}

async function send(chat,event) {
  event.preventDefault();
  if(!current(chat)||chat.sending)return;
  const input=chat.form.querySelector('[name="body"]'),button=chat.form.querySelector('button');
  const body=input.value.trim();
  if(!body)return;
  chat.sending=true;button.disabled=true;input.disabled=true;
  status(chat,'Ուղարկվում է…');
  try{
    const {error}=await sb.from('messages').insert({conversation_id:chat.id,sender_id:chat.userId,type:'TEXT',body});
    if(error)throw error;
    if(!current(chat))return;
    input.value='';
    if(chat.loading)chat.reload=true;else await loadMessages(chat);
  }catch{
    status(chat,'Չուղարկվեց։ Տեքստը պահպանված է, փորձիր նորից։');
  }finally{
    chat.sending=false;button.disabled=false;input.disabled=false;
    if(current(chat))input.focus();
  }
}

export function mountChat(id,userId) {
  stopChat();
  ensureDeleteStyles();
  const box=document.querySelector('#messages'),form=document.querySelector('#compose');
  if(!id||!box||!form)return;
  const badge=document.createElement('div');badge.className='chat-connection';badge.setAttribute('role','status');
  box.before(badge);
  const chat={id,userId,box,form,status:badge,loading:false,online:false,isSuper:false,deleting:null};
  active=chat;
  form.onsubmit=event=>send(chat,event);
  box.onclick=event=>{
    const button=event.target.closest('[data-delete-message]');
    if(!button||!current(chat))return;
    deleteMessage(chat,button.dataset.deleteMessage,button);
  };
  status(chat,'Միացում…');
  chat.channel=sb.channel(`class-portal-chat-${id}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`conversation_id=eq.${id}`},()=>refresh(chat))
    .subscribe(state=>{
      if(!current(chat))return;
      chat.online=state==='SUBSCRIBED';
      status(chat,chat.online?'Առցանց':'Ավտոմատ թարմացում');
      refresh(chat,0);
    });
  chat.poll=setInterval(()=>{if(!document.hidden)refresh(chat,0)},5000);
  loadMessages(chat);
  resolvePermissions(chat);
}

window.addEventListener('online',()=>{if(active)refresh(active,0)});
window.addEventListener('offline',()=>{if(active){active.online=false;status(active,'Ինտերնետ կապ չկա')}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)refresh(active,0)});
