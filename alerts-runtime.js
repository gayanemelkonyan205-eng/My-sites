import { sb } from './supabase-client.js';

let refreshTimer=null;
let refreshing=false;
let rendering=false;
let lastCount=0;

const esc=(value='')=>String(value).replace(/[&<>'\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[ch]));
const fmt=value=>value?new Intl.DateTimeFormat('hy-AM',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';

function installStyles(){
  if(document.getElementById('alerts-runtime-style'))return;
  const style=document.createElement('style');
  style.id='alerts-runtime-style';
  style.textContent=`
    [data-nav="notifications"],[data-simple-key="notifications"]{position:relative}
    .alerts-badge{position:absolute;top:3px;right:6px;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:#ff453a;color:#fff;font:800 11px/18px -apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;text-align:center;box-shadow:0 3px 12px rgba(255,69,58,.35);pointer-events:none;z-index:4}
    .alerts-badge[data-count="0"]{display:none}
    .alerts-legacy-list .item{align-items:flex-start}
    .alerts-legacy-list .title{font-weight:750}
  `;
  document.head.append(style);
}

function setLabel(button){
  if(!button)return;
  if(button.matches('[data-simple-key="notifications"]')){
    const spans=[...button.querySelectorAll('span')].filter(span=>!span.classList.contains('sn-icon')&&!span.classList.contains('alerts-badge'));
    if(spans[0])spans[0].textContent='Alerts';
    return;
  }
  const span=button.querySelector('span:not(.sn-icon):not(.alerts-badge)');
  if(span)span.textContent='Alerts';
}

function alertsActive(){
  return document.querySelector('.sidebar [data-nav="notifications"].active')||document.querySelector('.mobile [data-simple-key="notifications"].active');
}

function hidePushUi(){
  document.querySelectorAll('#view .settings-card').forEach(card=>{
    const heading=card.querySelector('h3')?.textContent?.trim()||'';
    if(heading==='Push-уведомления')card.remove();
    if(heading==='Հիշեցումներ'){
      const h=card.querySelector('h3');if(h)h.textContent='Alerts';
      const p=card.querySelector('p');if(p)p.textContent='Внутренние уведомления портала без push.';
      const b=card.querySelector('button');if(b)b.textContent='Открыть Alerts';
    }
  });
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

function ensureLabels(){
  installStyles();
  document.querySelectorAll('[data-nav="notifications"],[data-simple-key="notifications"]').forEach(setLabel);
  const title=document.querySelector('#vt');
  if(alertsActive()&&title)title.textContent='Alerts';
  paintBadge(lastCount);
  hidePushUi();
}

function badgeHosts(){return [...document.querySelectorAll('[data-nav="notifications"],[data-simple-key="notifications"]')];}

function paintBadge(count){
  lastCount=Math.max(0,Number(count)||0);
  for(const host of badgeHosts()){
    let badge=host.querySelector('.alerts-badge');
    if(!badge){badge=document.createElement('span');badge.className='alerts-badge';host.append(badge);}
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
  }finally{refreshing=false;}
}

async function renderAlerts(force=false){
  if(rendering||!alertsActive())return;
  const view=document.querySelector('#view');
  if(!view||(!force&&view.dataset.legacyAlerts==='1'))return;
  rendering=true;
  try{
    const {data,error}=await sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(100);
    if(error)throw error;
    if(!view.isConnected||!alertsActive())return;
    view.dataset.legacyAlerts='1';
    view.innerHTML=`<div class="section-actions"><button id="readall" class="btn" type="button">Прочитать всё</button></div><div class="list alerts-legacy-list">${(data||[]).map(n=>`<div class="item"><div><div class="title">${n.read_at?'':'● '}${esc(n.title)}</div><div class="small muted">${esc(n.body||'')} · ${fmt(n.created_at)}</div></div></div>`).join('')||'<div class="empty">Alerts пока нет</div>'}</div>`;
    const title=document.querySelector('#vt');if(title)title.textContent='Alerts';
    const readAll=view.querySelector('#readall');
    if(readAll)readAll.onclick=async()=>{
      readAll.disabled=true;
      const {error:updateError}=await sb.from('notifications').update({read_at:new Date().toISOString()}).is('read_at',null);
      readAll.disabled=false;
      if(updateError)return;
      view.dataset.legacyAlerts='';
      await renderAlerts(true);
      await refreshUnread();
    };
  }catch(error){
    console.warn('[Alerts]',error);
  }finally{rendering=false;}
}

let scheduled=false;
const observer=new MutationObserver(()=>{
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{
    scheduled=false;
    ensureLabels();
    if(document.querySelector('.portal')){
      refreshUnread();
      renderAlerts();
    }
  });
});
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});

window.addEventListener('focus',()=>{refreshUnread();renderAlerts(true)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshUnread();renderAlerts(true)}});
window.addEventListener('portal:boot-state',event=>{if(event.detail?.state==='PORTAL'){ensureLabels();refreshUnread();renderAlerts(true)}});

installStyles();
disableLegacyPush();
ensureLabels();
refreshUnread();
renderAlerts();
refreshTimer=setInterval(()=>{if(!document.hidden)refreshUnread()},30000);
window.addEventListener('beforeunload',()=>{if(refreshTimer)clearInterval(refreshTimer)});
