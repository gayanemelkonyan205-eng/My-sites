import { sb } from '../lib/supabase.js';
import { el,esc,fmt,toast } from '../lib/dom.js';
import { sendMessage,loadMessages,subscribeToConversation } from '../lib/chat.js';

let unsubscribe=null;

export async function renderChat({profile}){
  unsubscribe?.();unsubscribe=null;
  const conversations=await sb.from('conversations').select('*').order('updated_at',{ascending:false});
  if(conversations.error)throw conversations.error;
  const list=conversations.data||[];
  const active=list.find(x=>x.type==='CLASS')||list[0]||null;
  const node=el(`<main class="page"><header class="page-header"><div><div class="eyebrow">Messages</div><h1>Չատ</h1><p class="subtle">Դասարանի ու անձնական զրույցները՝ առանց ավելորդ էկրանների։</p></div></header>
  <section class="chat-layout">
    <aside class="chat-sidebar"><div class="row between" style="padding:6px 6px 12px"><strong>Զրույցներ</strong><button class="button ghost" data-new-direct>＋</button></div><div class="stack">${list.map(x=>`<button class="button ${x.id===active?.id?'primary':'ghost'}" style="text-align:left;justify-content:flex-start" data-conv="${x.id}">${x.type==='CLASS'?'🏫 ':x.type==='DIRECT'?'👤 ':'👥 '}${esc(x.title|| (x.type==='CLASS'?'Դասարանի չատ':'Զրույց'))}</button>`).join('')||'<div class="empty">Զրույց չկա</div>'}</div></aside>
    <section class="chat-room"><div class="chat-messages" data-messages></div><form class="chat-compose glass" data-compose><input class="input" name="body" autocomplete="off" placeholder="Հաղորդագրություն…" ${active?'':'disabled'}><button class="button primary" ${active?'':'disabled'}>Ուղարկել</button></form></section>
  </section></main>`);
  let activeId=active?.id||null;
  const box=node.querySelector('[data-messages]');
  const renderMessages=async()=>{
    if(!activeId){box.innerHTML='<div class="empty">Ընտրիր զրույց</div>';return}
    const result=await loadMessages(activeId);
    if(result.error){box.innerHTML=`<div class="empty">${esc(result.error.message)}</div>`;return}
    box.innerHTML=(result.data||[]).map(m=>`<div class="message ${m.sender_id===profile.id?'mine':''}"><div style="font-size:.72rem;font-weight:760;color:var(--muted);margin-bottom:3px">${esc(m.sender?.first_name||'')} ${esc(m.sender?.last_name||'')}</div><div>${esc(m.body||'').replace(/\n/g,'<br>')}</div><div class="subtle" style="font-size:.68rem;margin-top:4px">${fmt(m.created_at)}</div></div>`).join('')||'<div class="empty">Առաջին հաղորդագրությունը կարող է քոնը լինել ✨</div>';
    box.scrollTop=box.scrollHeight;
  };
  const subscribe=()=>{unsubscribe?.();if(activeId)unsubscribe=subscribeToConversation(activeId,()=>renderMessages())};
  await renderMessages();subscribe();
  node.querySelectorAll('[data-conv]').forEach(button=>button.addEventListener('click',async()=>{
    activeId=button.dataset.conv;node.querySelectorAll('[data-conv]').forEach(x=>{x.classList.toggle('primary',x===button);x.classList.toggle('ghost',x!==button)});await renderMessages();subscribe();
  }));
  node.querySelector('[data-compose]').addEventListener('submit',async e=>{
    e.preventDefault();const input=e.currentTarget.body,button=e.submitter,body=input.value;button.disabled=true;
    const result=await sendMessage({conversationId:activeId,userId:profile.id,body});button.disabled=false;
    if(result.error)return toast(result.error.message==='EMPTY_MESSAGE'?'Գրիր հաղորդագրություն։':result.error.message,'err');
    input.value='';await renderMessages();
  });
  return node;
}

export function cleanupChat(){unsubscribe?.();unsubscribe=null}
