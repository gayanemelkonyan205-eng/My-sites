import { sb } from './supabase-client.js';

let refreshTimer=null;
let refreshing=false;
let lastCount=0;

function installStyles(){
  if(document.getElementById('alerts-runtime-style'))return;
  const style=document.createElement('style');
  style.id='alerts-runtime-style';
  style.textContent=`
    [data-nav="notifications"],[data-simple-key="notifications"]{position:relative}
    .alerts-badge{position:absolute;top:3px;right:6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ff453a;color:#fff;font:800 11px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;text-align:center;box-shadow:0 3px 12px rgba(255,69,58,.35);pointer-events:none;z-index:4}
    .alerts-badge[data-count="0"]{display:none}
  `;
  document.head.append(style);
}

function setLabel(button){
  if(!button)return;
  if(button.matches('[data-simple-key="notifications"]')){
    const spans=[...button.querySelectorAll('span')].filter(span=>!span.classList.contains('sn-icon')&&!span.classList.contains('alerts-badge'));
    if(spans[0]&&spans[0].textContent!=='Ծանուցումներ')spans[0].textContent='Ծանուցումներ';
    return;
  }
  const span=button.querySelector('span:not(.sn-icon):not(.alerts-badge)');
  if(span){if(span.textContent!=='Ծանուցումներ')span.textContent='Ծանուցումներ';return}
  const iconNode=button.querySelector('.sn-icon');
  if(iconNode){
    const label=[...button.childNodes].find(node=>node.nodeType===Node.TEXT_NODE);
    if(label&&label.textContent!=='Ծանուցումներ')label.textContent='Ծանուցումներ';
  }
}

function ensureMobileButton(){
  const mobile=document.querySelector('.mobile');
  if(!mobile)return;
  const simple=mobile.querySelector('[data-simple-key="notifications"]');
  if(simple)setLabel(simple);
}

function ensureLabels(){
  installStyles();
  document.querySelectorAll('[data-nav="notifications"],[data-simple-key="notifications"]').forEach(setLabel);
  const active=document.querySelector('.sidebar [data-nav="notifications"]')?.classList.contains('active');
  const title=document.querySelector('#vt');
  if(active&&title&&title.textContent!=='Ծանուցումներ')title.textContent='Ծանուցումներ';
  ensureMobileButton();
  paintBadge(lastCount);
  decorateReadAll();
}

function badgeHosts(){
  return [...document.querySelectorAll('[data-nav="notifications"],[data-simple-key="notifications"]')];
}

function paintBadge(count){
  lastCount=Math.max(0,Number(count)||0);
  for(const host of badgeHosts()){
    let badge=host.querySelector('.alerts-badge');
    if(!badge){
      badge=document.createElement('span');
      badge.className='alerts-badge';
      host.append(badge);
    }
    const value=lastCount>99?'99+':String(lastCount);
    if(badge.dataset.count!==String(lastCount))badge.dataset.count=String(lastCount);
    if(badge.textContent!==value)badge.textContent=value;
    const label=lastCount?`Ծանուցումներ՝ ${lastCount}`:'Ծանուցումներ';
    if(host.getAttribute('aria-label')!==label)host.setAttribute('aria-label',label);
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
ensureLabels();
refreshUnread();
refreshTimer=setInterval(()=>{if(!document.hidden)refreshUnread()},30000);
window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer)});
