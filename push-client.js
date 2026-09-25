import { sb } from './supabase-client.js';
import { toast } from './notifications-ui.js';

const VAPID_PUBLIC_KEY='BMzIze7g8jb3E54_dmAtsvTyIUQ3M6L-__s_2cx2qexhDR2i13iP-YLG6LpwS1WiRmJcd05-OjIs8VMMBJs627Y';

function decodeBase64Url(value){
  const pad='='.repeat((4-value.length%4)%4);
  const raw=atob((value+pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
}

async function saveSubscription(subscription){
  const {data:{user}}=await sb.auth.getUser();
  if(!user)return false;
  const json=subscription.toJSON();
  if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw new Error('Invalid push subscription');
  const {error}=await sb.from('push_subscriptions').upsert({
    user_id:user.id,
    endpoint:json.endpoint,
    p256dh:json.keys.p256dh,
    auth:json.keys.auth,
    user_agent:navigator.userAgent,
    updated_at:new Date().toISOString()
  },{onConflict:'endpoint'});
  if(error)throw error;
  return true;
}

async function registerWorker(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return null;
  await navigator.serviceWorker.register('./sw.js?v=2',{scope:'./'});
  return navigator.serviceWorker.ready;
}

async function currentSubscription(){
  const reg=await registerWorker();
  if(!reg)return null;
  return reg.pushManager.getSubscription();
}

async function enablePush(button){
  if(!('Notification' in window))return toast('Այս սարքը push ծանուցումներ չի աջակցում։','err');
  if(button)button.disabled=true;
  try{
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted')return toast('Push ծանուցումների թույլտվությունը չի տրվել։','err');
    const reg=await registerWorker();
    if(!reg)throw new Error('Push not supported');
    let subscription=await reg.pushManager.getSubscription();
    if(!subscription){
      subscription=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:decodeBase64Url(VAPID_PUBLIC_KEY)
      });
    }
    await saveSubscription(subscription);
    toast('Push ծանուցումները միացված են։','ok');
    if(button)button.textContent='🔔 Push միացված է';
  }catch(error){
    console.error('push-enable',error);
    toast('Push ծանուցումները չմիացան։','err');
  }finally{if(button)button.disabled=false}
}

async function decorateNotifications(){
  const readAll=document.querySelector('#readall');
  if(!readAll||document.querySelector('#enable-push'))return;
  const button=document.createElement('button');
  button.id='enable-push';
  button.className='btn';
  button.type='button';
  button.textContent='🔔 Միացնել Push';
  readAll.parentElement?.prepend(button);
  try{
    if('Notification' in window&&Notification.permission==='granted'){
      const subscription=await currentSubscription();
      if(subscription){await saveSubscription(subscription);button.textContent='🔔 Push միացված է'}
    }
  }catch(error){console.warn('push-status',error)}
  button.onclick=()=>enablePush(button);
}

let deepLinkOpened=false;
function readChatDeepLink(){
  const params=new URLSearchParams(location.search);
  if(params.get('push')!=='chat')return null;
  const conversationId=params.get('conversation')||'';
  return /^[0-9a-f-]{36}$/i.test(conversationId)?conversationId:null;
}
function openChatDeepLink(){
  if(deepLinkOpened)return;
  const conversationId=readChatDeepLink();
  if(!conversationId)return;
  const ready=document.querySelector('#app')?.dataset.bootState==='PORTAL'||document.querySelector('.portal');
  if(!ready)return;
  deepLinkOpened=true;
  window.dispatchEvent(new CustomEvent('portal:open',{detail:{view:'chat',conversationId}}));
  const clean=new URL(location.href);
  clean.searchParams.delete('push');
  clean.searchParams.delete('conversation');
  history.replaceState(history.state,'',clean.pathname+(clean.searchParams.size?`?${clean.searchParams}`:'')+clean.hash);
}

window.addEventListener('portal:boot-state',event=>{if(event.detail?.state==='PORTAL')setTimeout(openChatDeepLink,0)});
window.addEventListener('portal:push-enable',()=>enablePush(document.querySelector('#enable-push')));

const observer=new MutationObserver(()=>queueMicrotask(()=>{decorateNotifications();openChatDeepLink()}));
observer.observe(document.documentElement,{subtree:true,childList:true});
decorateNotifications();
openChatDeepLink();
