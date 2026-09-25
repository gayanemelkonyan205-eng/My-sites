import { sb } from './supabase-client.js';

let active=null;
const esc=(value='')=>String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const current=chat=>active===chat&&chat.box.isConnected;

export function stopChat(){
  const chat=active;
  active=null;
  if(!chat)return;
  clearInterval(chat.poll);
  clearTimeout(chat.refresh);
  if(chat.channel)sb.removeChannel(chat.channel);
  if(chat.box)chat.box.onclick=null;
  if(chat.form)chat.form.onsubmit=null;
}

function status(chat,text){
  if(current(chat)&&chat.status.textContent!==text)chat.status.textContent=text;
}

function renderReply(chat){
  const target=chat.rows?.find(row=>row.id===chat.replyTo);
  chat.replyBar.hidden=!target;
  if(target)chat.replyBar.querySelector('span').textContent=`Պատասխան՝ ${target.body||'հաղորդագրություն'}`;
}

function renderMessages(chat){
  if(!current(chat))return;
  if(chat.editId)return;
  const nearBottom=chat.box.scrollHeight-chat.box.scrollTop-chat.box.clientHeight<100;
  const query=chat.search.value.trim().toLocaleLowerCase();
  const rows=query?chat.rows.filter(row=>row.body?.toLocaleLowerCase().includes(query)):chat.rows;
  const byId=new Map(chat.rows.map(row=>[row.id,row]));
  const html=rows.map(m=>{
    const sender=chat.senders.get(m.sender_id);
    const name=m.sender_id===chat.userId?'Դուք':`${sender?.first_name||''} ${sender?.last_name||''}`.trim()||'Մասնակից';
    const time=new Intl.DateTimeFormat('hy-AM',{hour:'2-digit',minute:'2-digit'}).format(new Date(m.created_at));
    const mine=m.sender_id===chat.userId,canDelete=mine||chat.role==='SUPER_ADMIN';
    const reply=byId.get(m.reply_to_id);
    const reactions=[...chat.reactions.entries()].filter(([key])=>key.startsWith(`${m.id}:`));
    const reactionHtml=reactions.map(([key,group])=>`<button type="button" class="msg-reaction ${group.mine?'selected':''}" data-react="${esc(m.id)}" data-emoji="${esc(key.split(':').slice(1).join(':'))}" aria-label="Արձագանք ${esc(key.split(':').slice(1).join(':'))}">${esc(key.split(':').slice(1).join(':'))} ${group.count}</button>`).join('');
    return `<article class="msg ${mine?'mine':''}" data-message-id="${esc(m.id)}">
      <div class="who">${esc(name)}${chat.pins.has(m.id)?' · Ամրացված':''}</div>
      ${reply?`<div class="msg-reply">${esc(reply.body||'Հաղորդագրություն')}</div>`:''}
      <div class="msg-body">${esc(m.body||'').replace(/\n/g,'<br>')}</div>
      <div class="msg-reactions">${reactionHtml}</div>
      <div class="msg-meta"><time class="small muted">${time}${m.edited_at?' · խմբագրված':''}</time>
        <details class="msg-menu"><summary aria-label="Հաղորդագրության գործողություններ">···</summary><div class="msg-actions"><button type="button" data-reply="${esc(m.id)}">Պատասխանել</button><button type="button" data-react="${esc(m.id)}" data-emoji="👍" aria-label="Հավանել">👍</button><button type="button" data-react="${esc(m.id)}" data-emoji="❤️" aria-label="Սրտիկ">❤️</button><button type="button" data-react="${esc(m.id)}" data-emoji="😂" aria-label="Ծիծաղել">😂</button>${mine&&m.type==='TEXT'?`<button type="button" data-edit="${esc(m.id)}">Խմբագրել</button>`:''}${['ADMIN','SUPER_ADMIN'].includes(chat.role)?`<button type="button" data-pin="${esc(m.id)}">${chat.pins.has(m.id)?'Ապամրացնել':'Ամրացնել'}</button>`:''}${!mine?`<button type="button" data-report="${esc(m.id)}">Բողոքել</button>`:''}${canDelete?`<button type="button" data-delete="${esc(m.id)}" data-own="${mine}">Ջնջել</button>`:''}</div></details>
      </div></article>`;
  }).join('')||`<div class="empty">${query?'Արդյունքներ չկան':'Առաջին հաղորդագրությունը կարող է քոնը լինել'}</div>`;
  if(chat.html!==html){chat.box.innerHTML=html;chat.html=html;if(nearBottom||!chat.loaded)chat.box.scrollTop=chat.box.scrollHeight;}
  if(chat.targetId){const target=[...chat.box.querySelectorAll('[data-message-id]')].find(node=>node.dataset.messageId===chat.targetId);if(target){target.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('search-hit');chat.targetId=null}}
  const pinned=chat.rows.filter(row=>chat.pins.has(row.id));
  chat.pinHost.hidden=!pinned.length;
  chat.pinHost.textContent=pinned.length?`Ամրացված · ${(pinned.at(-1).body||'Հաղորդագրություն').slice(0,90)}`:'';
  chat.loaded=true;
  chat.scrollButton.hidden=chat.box.scrollHeight-chat.box.scrollTop-chat.box.clientHeight<120;
  renderReply(chat);
}

async function loadMessages(chat){
  if(!current(chat)||chat.loading)return;
  chat.loading=true;
  try{
    const result=await sb.from('messages').select('id,conversation_id,sender_id,type,body,reply_to_id,created_at,edited_at,deleted_at')
      .eq('conversation_id',chat.id).is('deleted_at',null).order('created_at',{ascending:false}).limit(250);
    if(result.error)throw result.error;
    const rows=(result.data||[]).slice().reverse();
    if(chat.targetId&&!rows.some(row=>row.id===chat.targetId)){
      const target=await sb.from('messages').select('id,conversation_id,sender_id,type,body,reply_to_id,created_at,edited_at,deleted_at').eq('conversation_id',chat.id).eq('id',chat.targetId).is('deleted_at',null).maybeSingle();
      if(target.data)rows.unshift(target.data);
    }
    const ids=[...new Set(rows.map(row=>row.sender_id).filter(Boolean))];
    const messageIds=rows.map(row=>row.id);
    const [people,reactions,pins]=await Promise.all([
      ids.length?sb.from('profiles').select('id,first_name,last_name').in('id',ids):Promise.resolve({data:[]}),
      messageIds.length?sb.from('message_reactions').select('message_id,user_id,emoji').in('message_id',messageIds):Promise.resolve({data:[]}),
      sb.from('pinned_messages').select('message_id').eq('conversation_id',chat.id)
    ]);
    if(!current(chat))return;
    chat.rows=rows;
    chat.senders=new Map((people.data||[]).map(person=>[person.id,person]));
    chat.reactions=new Map();
    for(const reaction of reactions.data||[]){
      const key=`${reaction.message_id}:${reaction.emoji}`;
      const group=chat.reactions.get(key)||{count:0,mine:false};
      group.count++;
      if(reaction.user_id===chat.userId)group.mine=true;
      chat.reactions.set(key,group);
    }
    chat.pins=new Set((pins.data||[]).map(pin=>pin.message_id));
    renderMessages(chat);
    status(chat,chat.online?'Առցանց':'Ավտոմատ թարմացում');
    const newest=rows.at(-1)?.id;
    if(newest&&newest!==chat.readId&&!document.hidden){
      chat.readId=newest;
      sb.from('conversation_members').update({last_read_message_id:newest,last_read_at:new Date().toISOString()}).eq('conversation_id',chat.id).eq('user_id',chat.userId).then(()=>{});
      sb.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',chat.userId).eq('kind','MESSAGE').eq('href',`/chat?conversation=${chat.id}`).is('read_at',null).then(()=>{});
    }
  }catch{
    status(chat,'Չատը չի թարմացվում։ Կրկին կփորձենք։');
  }finally{
    chat.loading=false;
    if(chat.reload&&current(chat)){chat.reload=false;refresh(chat,0);}
  }
}

function refresh(chat,delay=100){
  if(!current(chat))return;
  if(chat.editId){chat.pendingReload=true;return;}
  if(chat.loading){chat.reload=true;return;}
  clearTimeout(chat.refresh);
  chat.refresh=setTimeout(()=>loadMessages(chat),delay);
}

async function send(chat,event){
  event.preventDefault();
  if(!current(chat)||chat.sending)return;
  const input=chat.form.querySelector('[name="body"]'),button=chat.form.querySelector('button');
  const body=input.value.trim();
  if(!body)return;
  chat.sending=true;button.disabled=true;input.disabled=true;
  status(chat,'Ուղարկվում է…');
  try{
    const {error}=await sb.from('messages').insert({conversation_id:chat.id,sender_id:chat.userId,type:'TEXT',body,reply_to_id:chat.replyTo||null});
    if(error)throw error;
    if(!current(chat))return;
    input.value='';chat.replyTo=null;renderReply(chat);
    if(chat.loading)chat.reload=true;else await loadMessages(chat);
  }catch{
    status(chat,'Չուղարկվեց։ Տեքստը պահպանված է, փորձիր նորից։');
  }finally{
    chat.sending=false;button.disabled=false;input.disabled=false;
    if(current(chat))input.focus();
  }
}

async function action(chat,event){
  const button=event.target.closest('button');
  if(!button||!current(chat)||button.disabled)return;
  const id=button.dataset.reply||button.dataset.react||button.dataset.edit||button.dataset.pin||button.dataset.delete||button.dataset.report;
  if(!id)return;
  const row=chat.rows.find(item=>item.id===id);
  if(!row)return;
  if(button.dataset.reply){chat.replyTo=id;renderReply(chat);chat.form.querySelector('[name="body"]').focus();return;}
  if(button.dataset.report){
    if(row.sender_id===chat.userId)return;
    chat.reportDialog.querySelector('form').reset();
    chat.reportDialog.querySelector('[name="message_id"]').value=id;
    if(!chat.reportDialog.open)chat.reportDialog.showModal();
    return;
  }
  if(button.dataset.edit){
    if(row.sender_id!==chat.userId||row.type!=='TEXT')return;
    const message=button.closest('.msg'),body=message.querySelector('.msg-body');
    chat.editId=id;
    body.innerHTML=`<textarea class="msg-edit" aria-label="Խմբագրել հաղորդագրությունը">${esc(row.body||'')}</textarea><div class="msg-edit-actions"><button type="button" data-save-edit="${esc(id)}">Պահպանել</button><button type="button" data-cancel-edit>Չեղարկել</button></div>`;
    body.querySelector('textarea').focus();return;
  }
  if(button.dataset.react){
    const emoji=button.dataset.emoji;
    if(!['👍','❤️','😂'].includes(emoji))return;
    const mine=chat.reactions.get(`${id}:${emoji}`)?.mine;
    button.disabled=true;
    const request=mine?sb.from('message_reactions').delete().eq('message_id',id).eq('user_id',chat.userId).eq('emoji',emoji):sb.from('message_reactions').insert({message_id:id,user_id:chat.userId,emoji});
    const result=await request;
    if(result.error){button.disabled=false;status(chat,'Արձագանքը չպահպանվեց');return;}
    refresh(chat,0);return;
  }
  if(button.dataset.pin){
    if(!['ADMIN','SUPER_ADMIN'].includes(chat.role))return;
    button.disabled=true;
    const result=await sb.rpc(chat.pins.has(id)?'admin_unpin_message':'admin_pin_message',{p_message_id:id});
    if(result.error||result.data!==true){button.disabled=false;status(chat,'Ամրացումը չպահպանվեց');return;}
    refresh(chat,0);return;
  }
  if(button.dataset.delete){
    const own=row.sender_id===chat.userId;
    if(!own&&chat.role!=='SUPER_ADMIN')return;
    if(!confirm('Ջնջե՞լ այս հաղորդագրությունը։'))return;
    button.disabled=true;
    const result=await sb.rpc(own?'delete_message':'admin_delete_message',{p_message_id:id});
    if(result.error||result.data!==true){button.disabled=false;status(chat,'Հաղորդագրությունը չջնջվեց։ Փորձիր կրկին։');return;}
    refresh(chat,0);
  }
}

export function mountChat(id,userId,role='STUDENT',targetId=null){
  stopChat();
  const box=document.querySelector('#messages'),form=document.querySelector('#compose');
  if(!id||!box||!form)return;
  const header=document.createElement('div');
  header.className='chat-toolbar';
  header.innerHTML='<input class="chat-search" type="search" aria-label="Փնտրել հաղորդագրություններ" placeholder="Փնտրել հաղորդագրություններ…"><div class="chat-pinned" hidden></div><div class="chat-connection" role="status"></div><button type="button" class="chat-scroll-bottom" hidden>Վերջին հաղորդագրությունները ↓</button>';
  box.before(header);
  const replyBar=document.createElement('div');
  replyBar.className='chat-reply-bar';replyBar.hidden=true;
  replyBar.innerHTML='<span></span><button type="button" aria-label="Չեղարկել պատասխանը">×</button>';
  form.before(replyBar);
  const reportDialog=document.createElement('dialog');
  reportDialog.className='message-report-dialog';
  reportDialog.innerHTML='<form><h3>Հաղորդել հաղորդագրության մասին</h3><input type="hidden" name="message_id"><label>Պատճառ<select name="reason"><option value="SPAM">Սպամ</option><option value="HARASSMENT">Վիրավորանք կամ հետապնդում</option><option value="INAPPROPRIATE">Անպատշաճ բովանդակություն</option><option value="OTHER">Այլ պատճառ</option></select></label><label>Մանրամասներ (ըստ ցանկության)<textarea name="details" maxlength="500" rows="3"></textarea></label><div class="report-actions"><button type="button" class="btn" data-report-cancel>Չեղարկել</button><button class="btn primary">Ուղարկել</button></div></form>';
  form.after(reportDialog);
  const chat={id,userId,role,targetId,box,form,status:header.querySelector('.chat-connection'),search:header.querySelector('.chat-search'),pinHost:header.querySelector('.chat-pinned'),scrollButton:header.querySelector('.chat-scroll-bottom'),replyBar,reportDialog,rows:[],senders:new Map(),reactions:new Map(),pins:new Set(),loading:false,online:false};
  active=chat;
  reportDialog.querySelector('[data-report-cancel]').onclick=()=>reportDialog.close();
  reportDialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();
    const data=new FormData(event.currentTarget),button=event.submitter;
    button.disabled=true;
    const result=await sb.from('message_reports').insert({message_id:data.get('message_id'),reporter_id:chat.userId,reason:data.get('reason'),details:String(data.get('details')||'').trim()||null});
    button.disabled=false;
    if(!current(chat))return;
    if(result.error){status(chat,result.error.code==='23505'?'Այս հաղորդագրության մասին արդեն հայտնել եք':'Հաղորդումը չուղարկվեց։ Փորձիր կրկին։');return;}
    reportDialog.close();status(chat,'Հաղորդումն ուղարկվեց Super Admin-ին։');
  };
  form.onsubmit=event=>send(chat,event);
  chat.search.oninput=()=>renderMessages(chat);
  chat.scrollButton.onclick=()=>chat.box.scrollTo({top:chat.box.scrollHeight,behavior:'smooth'});
  box.onscroll=()=>{chat.scrollButton.hidden=chat.box.scrollHeight-chat.box.scrollTop-chat.box.clientHeight<120};
  replyBar.querySelector('button').onclick=()=>{chat.replyTo=null;renderReply(chat)};
  box.onclick=event=>{
    const save=event.target.closest('[data-save-edit]');
    if(save){
      const message=save.closest('.msg'),body=message.querySelector('textarea')?.value.trim();
      if(!body)return;
      save.disabled=true;
      sb.from('messages').update({body,edited_at:new Date().toISOString()}).eq('id',save.dataset.saveEdit).eq('sender_id',chat.userId).then(result=>{
        if(!current(chat))return;
        if(result.error){save.disabled=false;status(chat,'Խմբագրումը չպահպանվեց');return;}
        chat.editId=null;chat.pendingReload=false;
        refresh(chat,0);
      }).catch(()=>{if(current(chat)){save.disabled=false;status(chat,'Խմբագրումը չպահպանվեց')}});
      return;
    }
    if(event.target.closest('[data-cancel-edit]')){chat.editId=null;chat.html=null;renderMessages(chat);if(chat.pendingReload){chat.pendingReload=false;refresh(chat,0)}return;}
    action(chat,event).catch(()=>status(chat,'Գործողությունը չհաջողվեց։ Փորձիր կրկին։'));
  };
  status(chat,'Միացում…');
  chat.channel=sb.channel(`class-portal-chat-${id}`)
    .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`conversation_id=eq.${id}`},()=>refresh(chat))
    .on('postgres_changes',{event:'*',schema:'public',table:'message_reactions'},()=>refresh(chat))
    .on('postgres_changes',{event:'*',schema:'public',table:'pinned_messages',filter:`conversation_id=eq.${id}`},()=>refresh(chat))
    .subscribe(state=>{if(!current(chat))return;chat.online=state==='SUBSCRIBED';status(chat,chat.online?'Առցանց':'Ավտոմատ թարմացում');refresh(chat,0)});
  chat.poll=setInterval(()=>{if(!document.hidden)refresh(chat,0)},5000);
  loadMessages(chat);
}

window.addEventListener('online',()=>{if(active)refresh(active,0)});
window.addEventListener('offline',()=>{if(active){active.online=false;status(active,'Ինտերնետ կապ չկա')}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)refresh(active,0)});
