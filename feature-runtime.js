import { sb } from './supabase-client.js';

const mapViewToKey={chat:'features.chat',board:'features.board',polls:'features.polls',files:'features.files',schedule:'features.schedule',homework:'features.homework',announcements:'features.announcements',notifications:'features.notifications',classmates:'features.classmates'};
let settings=null;let loading=false;let last=0;

async function load(force=false){
  if(document.querySelector('#app')?.dataset.bootState!=='PORTAL')return;
  if(loading)return;
  if(!force&&settings&&Date.now()-last<30000){apply();return}
  loading=true;
  const {data,error}=await sb.rpc('get_public_site_settings');
  loading=false;
  if(error){console.warn('site settings unavailable',error.message);return}
  settings=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));last=Date.now();apply();
}

function enabled(key){return settings?.[key]!==false}
function setClassNameSafely(value){
  const text=String(value||'').trim();
  if(!text)return;
  if(document.documentElement.dataset.className!==text)document.documentElement.dataset.className=text;
  document.querySelectorAll('span[data-class-name],b[data-class-name],small[data-class-name],[data-class-name] > [data-class-name-label]').forEach(el=>{
    // Never destroy containers. Only dedicated leaf labels may be rewritten.
    if(el.children.length===0&&el.textContent!==text)el.textContent=text;
  });
}
function apply(){
  if(!settings)return;
  setClassNameSafely(settings['class.name']);
  Object.entries(mapViewToKey).forEach(([view,key])=>{
    document.querySelectorAll(`[data-nav="${view}"]`).forEach(el=>{
      const on=enabled(key);if(el.hidden===on)el.hidden=!on;
      const hidden=on?'false':'true';if(el.getAttribute('aria-hidden')!==hidden)el.setAttribute('aria-hidden',hidden);
    });
  });
  const active=document.querySelector('.sidebar .nav [data-nav].active');
  if(active&&active.hidden)document.querySelector('.sidebar .nav [data-nav="dashboard"]')?.click();
}

const observer=new MutationObserver(()=>{if(settings)queueMicrotask(apply);else if(document.querySelector('.sidebar'))load()});
observer.observe(document.body,{subtree:true,childList:true});
window.addEventListener('portal:features-refresh',()=>load(true));
window.addEventListener('focus',()=>load());
window.addEventListener('portal:boot-state',e=>{if(e.detail.state==='PORTAL')load(true)});
setTimeout(()=>load(),900);
