import { sb } from './supabase-client.js';
import { toast } from './notifications-ui.js';

let userId=null;
let channel=null;
let refreshTimer=null;
let lastCount=-1;

function ensureStyles(){
  if(document.getElementById('notification-runtime-style'))return;
  const style=document.createElement('style');
  style.id='notification-runtime-style';
  style.textContent=`
    [data-nav="notifications"]{position:relative}
    .notification-badge{position:absolute;top:4px;right:7px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ff3b30;color:#fff;font:700 11px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;text-align:center;box-shadow:0 2px 10px rgba(255,59,48,.35);pointer-events:none;z-index:5}
    .notification-badge[data-count="0"]{display:none}
    @media(max-width:900px){.notification-badge{top:2px;right:8px}}
  `;
  document.head.append(style);
}

function badgeHosts(){
  return [...document.querySelectorAll('[data-nav="notifications"]')];
}

function paint(count){
  ensureStyles();
  for(const host of badgeHosts()){
    let badge=host.querySelector('.notification-badge');
    if(!badge){
      badge=document.createElement('span');
      badge.className='notification-badge';
      host.append(badge);
    }
    badge.dataset.count=String(count);
    badge.textContent=count>99?'99+':String(count);
    host.setAttribute('aria-label',count?`Уведомления: ${count} непрочитанных`:'Уведомления');
  }
  lastCount=count;
}

async function refreshUnread(){
  if(!userId)return;
  const {count,error}=await sb.from('notifications').select('id',{count:'exact',head:true}).eq('user_id',userId).is('read_at',null);
  if(error)return;
  paint(count||0);
}

function showLiveNotification(row){
  const title=row?.title||'Новое уведомление';
  const body=String(row?.body||'').slice(0,220);
  toast(body?`${title}: ${body}`:title,'ok');
  if(document.hidden&&'Notification' in window&&Notification.permission==='granted'){
    try{
      const n=new Notification(title,{body,tag:row?.dedupe_key||row?.id||undefined});
      n.onclick=()=>{window.focus();n.close();document.querySelector('[data-nav="notifications"]')?.click()};
    }catch{}
  }
}

async function start(nextUserId){
  if(nextUserId===userId&&channel)return;
  if(channel){try{await sb.removeChannel(channel)}catch{}channel=null}
  userId=nextUserId||null;
  if(!userId){paint(0);return}
  await refreshUnread();
  channel=sb.channel(`portal-notifications-${userId}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${userId}`},payload=>{
      showLiveNotification(payload.new);
      refreshUnread();
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'notifications',filter:`user_id=eq.${userId}`},()=>refreshUnread())
    .subscribe();
}

function decorateReadAll(){
  const button=document.querySelector('#readall');
  if(!button||button.dataset.notificationRuntime==='1')return;
  button.dataset.notificationRuntime='1';
  button.addEventListener('click',()=>setTimeout(refreshUnread,250));
}

const observer=new MutationObserver(()=>{
  if(lastCount>=0)paint(lastCount);
  decorateReadAll();
});
observer.observe(document.documentElement,{subtree:true,childList:true});

sb.auth.onAuthStateChange((_event,session)=>setTimeout(()=>start(session?.user?.id||null),0));
sb.auth.getSession().then(({data})=>start(data?.session?.user?.id||null)).catch(()=>{});
window.addEventListener('focus',refreshUnread);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshUnread()});
refreshTimer=setInterval(()=>{if(!document.hidden)refreshUnread()},30000);
window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer)});
