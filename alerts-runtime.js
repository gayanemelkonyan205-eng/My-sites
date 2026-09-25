import { sb } from './supabase-client.js';

let refreshTimer=null;
let refreshing=false;
let lastCount=0;

function installStyles(){
  if(document.getElementById('alerts-runtime-style'))return;
  const style=document.createElement('style');
  style.id='alerts-runtime-style';
  style.textContent=`
    [data-nav="notifications"]{position:relative}
    .alerts-badge{position:absolute;top:3px;right:6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ff453a;color:#fff;font:800 11px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;text-align:center;box-shadow:0 3px 12px rgba(255,69,58,.35);pointer-events:none;z-index:4}
    .alerts-badge[data-count="0"]{display:none}
    @media(max-width:900px){
      .mobile{overflow-x:auto!important;overflow-y:hidden!important;grid-template-columns:repeat(6,minmax(64px,1fr))!important;scrollbar-width:none}
      .mobile::-webkit-scrollbar{display:none}
      .mobile [data-nav="notifications"]{min-width:64px}
    }
  `;
  document.head.append(style);
}

function setLabel(button){
  if(!button)return;
  const span=button.querySelector('span:not(.sn-icon):not(.alerts-badge)');
  if(span){span.textContent='Alerts';return}
  const iconNode=button.querySelector('.sn-icon');
  if(iconNode){
    [...button.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).forEach(node=>node.remove());
    button.append(document.createTextNode('Alerts'));
  }
}

function ensureMobileButton(){
  const mobile=document.querySelector('.mobile');
  if(!mobile)return;
  let button=mobile.querySelector('[data-nav="notifications"]');
  if(!button){
    button=document.createElement('button');
    button.type='button';
    button.dataset.nav='notifications';
    button.innerHTML='<span class="sn-icon">🔔</span>Alerts';
    button.addEventListener('click',event=>{
      event.preventDefault();
      window.dispatchEvent(new CustomEvent('portal:open',{detail:{view:'notifications'}}));
    });
    const profile=mobile.querySelector('[data-nav="profile"]');
    profile?mobile.insertBefore(button,profile):mobile.append(button);
  }
  const desktop=document.querySelector('.sidebar [data-nav="notifications"]');
  button.classList.toggle('active',!!desktop?.classList.contains('active'));
}

function ensureLabels(){
  installStyles();
  document.querySelectorAll('[data-nav="notifications"]').forEach(setLabel);
  const active=document.querySelector('.sidebar [data-nav="notifications"]')?.classList.contains('active');
  const title=document.querySelector('#vt');
  if(active&&title&&title.textContent!=='Alerts')title.textContent='Alerts';
  ensureMobileButton();
  paintBadge(lastCount);
  decorateReadAll();
}

function badgeHosts(){return [...document.querySelectorAll('[data-nav="notifications"]')]}

function paintBadge(count){
  lastCount=Math.max(0,Number(count)||0);
  for(const host of badgeHosts()){
    let badge=host.querySelector('.alerts-badge');
    if(!badge){
      badge=document.createElement('span');
      badge.className='alerts-badge';
      host.append(badge);
    }
    badge.dataset.count=String(lastCount);
    badge.textContent=lastCount>99?'99+':String(lastCount);
    host.setAttribute('aria-label',lastCount?`Alerts: ${lastCount}`:'Alerts');
  }
}

async function refreshUnread(){
  if(refreshing||!document.querySelector('.portal'))return;
  refreshing=true;
  try{
    const {count,error}=await sb.from('notifications').select('id',{count:'exact',head:true}).is('read_at',null);
    if(!error)paintBadge(count||0);
  }finally{refreshing=false}
}

function decorateReadAll(){
  const button=document.querySelector('#readall');
  if(!button||button.dataset.alertsRuntime==='1')return;
  button.dataset.alertsRuntime='1';
  button.addEventListener('click',()=>setTimeout(refreshUnread,250));
}

async function disableLegacyPush(){
  if(!('serviceWorker' in navigator))return;
  try{
    const registrations=await navigator.serviceWorker.getRegistrations();
    for(const registration of registrations){
      try{
        const subscription=await registration.pushManager?.getSubscription?.();
        if(subscription)await subscription.unsubscribe();
      }catch{}
    }
  }catch{}
}

let scheduled=false;
const observer=new MutationObserver(()=>{
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{
    scheduled=false;
    ensureLabels();
    if(document.querySelector('.portal'))refreshUnread();
  });
});
observer.observe(document.documentElement,{subtree:true,childList:true});

window.addEventListener('focus',refreshUnread);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshUnread()});
window.addEventListener('portal:boot-state',event=>{if(event.detail?.state==='PORTAL'){ensureLabels();refreshUnread()}});

installStyles();
disableLegacyPush();
ensureLabels();
refreshUnread();
refreshTimer=setInterval(()=>{if(!document.hidden)refreshUnread()},30000);
window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer)});
