import { sb } from './supabase-client.js';
import { toast } from './notifications-ui.js';

const VAPID_PUBLIC_KEY='BMzIze7g8jb3E54_dmAtsvTyIUQ3M6L-__s_2cx2qexhDR2i13iP-YLG6LpwS1WiRmJcd05-OjIs8VMMBJs627Y';
const PUSH_CARD_ID='push-permission-card';

function decodeBase64Url(value){
  const pad='='.repeat((4-value.length%4)%4);
  const raw=atob((value+pad).replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from([...raw].map(ch=>ch.charCodeAt(0)));
}

function ensurePushStyles(){
  if(document.getElementById('push-permission-style'))return;
  const style=document.createElement('style');
  style.id='push-permission-style';
  style.textContent=`
    #${PUSH_CARD_ID}{
      position:fixed;left:50%;bottom:max(104px,calc(env(safe-area-inset-bottom) + 92px));transform:translateX(-50%);
      width:min(92vw,430px);z-index:1200;padding:16px;border:1px solid rgba(255,255,255,.16);border-radius:24px;
      background:rgba(18,18,20,.76);backdrop-filter:blur(28px) saturate(170%);-webkit-backdrop-filter:blur(28px) saturate(170%);
      box-shadow:0 18px 55px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.14);color:#fff;
      font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif
    }
    #${PUSH_CARD_ID} .push-head{display:flex;gap:12px;align-items:center;margin-bottom:10px}
    #${PUSH_CARD_ID} .push-icon{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;font-size:22px;background:linear-gradient(145deg,#2f80ff,#8d4dff);box-shadow:0 8px 24px rgba(91,85,255,.32)}
    #${PUSH_CARD_ID} b{display:block;font-size:16px;line-height:1.2}
    #${PUSH_CARD_ID} p{margin:4px 0 0;color:rgba(255,255,255,.68);font-size:13px;line-height:1.4}
    #${PUSH_CARD_ID} .push-actions{display:flex;gap:8px;margin-top:13px}
    #${PUSH_CARD_ID} button{border:0;border-radius:14px;min-height:42px;padding:0 14px;font-weight:700;font-size:14px;cursor:pointer}
    #${PUSH_CARD_ID} [data-push-allow]{flex:1;color:#fff;background:linear-gradient(135deg,#2f80ff,#7c4dff)}
    #${PUSH_CARD_ID} [data-push-later]{color:#fff;background:rgba(255,255,255,.10)}
    [data-theme="light"] #${PUSH_CARD_ID}{color:#111;background:rgba(250,250,252,.82);border-color:rgba(0,0,0,.08);box-shadow:0 18px 55px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.8)}
    [data-theme="light"] #${PUSH_CARD_ID} p{color:rgba(0,0,0,.58)}
    [data-theme="light"] #${PUSH_CARD_ID} [data-push-later]{color:#111;background:rgba(0,0,0,.07)}
    @media(min-width:901px){#${PUSH_CARD_ID}{bottom:28px}}
  `;
  document.head.append(style);
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

function removePermissionCard(){document.getElementById(PUSH_CARD_ID)?.remove()}

function showBlockedHelp(){
  removePermissionCard();
  toast('Ծանուցումները արգելափակված են։ Chrome-ում բացիր կայքի ⚙ կարգավորումները → Notifications → Allow։','err');
}

async function enablePush(button){
  if(!('Notification' in window))return toast('Այս սարքը push ծանուցումներ չի աջակցում։','err');
  if(Notification.permission==='denied')return showBlockedHelp();
  if(button)button.disabled=true;
  try{
    const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
    if(permission!=='granted'){
      if(permission==='denied')showBlockedHelp();
      else toast('Ծանուցումների թույլտվությունը դեռ չի տրվել։','err');
      return false;
    }
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
    toast('🔔 Ծանուցումները միացված են։','ok');
    if(button)button.textContent='🔔 Push միացված է';
    removePermissionCard();
    localStorage.removeItem('portal-push-later');
    return true;
  }catch(error){
    console.error('push-enable',error);
    toast('Push ծանուցումները չմիացան։','err');
    return false;
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

async function showPermissionCard(){
  if(document.getElementById(PUSH_CARD_ID))return;
  const portalReady=document.querySelector('#app')?.dataset.bootState==='PORTAL'||document.querySelector('.portal');
  if(!portalReady||!('Notification' in window))return;
  if(Notification.permission==='granted'){
    try{const subscription=await currentSubscription();if(subscription)await saveSubscription(subscription)}catch{}
    return;
  }
  if(Notification.permission==='denied')return;
  const laterUntil=Number(localStorage.getItem('portal-push-later')||0);
  if(laterUntil>Date.now())return;
  ensurePushStyles();
  const card=document.createElement('section');
  card.id=PUSH_CARD_ID;
  card.setAttribute('role','dialog');
  card.setAttribute('aria-label','Միացնել ծանուցումները');
  card.innerHTML=`
    <div class="push-head"><div class="push-icon">🔔</div><div><b>Միացնե՞լ ծանուցումները</b><p>Ստացիր նոր հաղորդագրությունների, տնայինների և կարևոր հայտարարությունների մասին ծանուցումներ։</p></div></div>
    <div class="push-actions"><button type="button" data-push-allow>Թույլատրել</button><button type="button" data-push-later>Հետո</button></div>`;
  document.body.append(card);
  card.querySelector('[data-push-allow]').onclick=()=>enablePush(card.querySelector('[data-push-allow]'));
  card.querySelector('[data-push-later]').onclick=()=>{
    localStorage.setItem('portal-push-later',String(Date.now()+24*60*60*1000));
    removePermissionCard();
  };
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

window.addEventListener('portal:boot-state',event=>{
  if(event.detail?.state==='PORTAL')setTimeout(()=>{openChatDeepLink();showPermissionCard()},500);
});
window.addEventListener('portal:push-enable',()=>enablePush(document.querySelector('#enable-push')));

const observer=new MutationObserver(()=>queueMicrotask(()=>{decorateNotifications();openChatDeepLink()}));
observer.observe(document.documentElement,{subtree:true,childList:true});
decorateNotifications();
openChatDeepLink();
setTimeout(showPermissionCard,1200);
