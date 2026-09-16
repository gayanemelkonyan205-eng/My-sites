import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4?bundle';

const sb=createClient('https://yknzcvooglrsvyidestj.supabase.co','sb_publishable_BntzoD9F20GkbI5A0yhmQw_1Z5-WrtJ',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const mapViewToKey={chat:'features.chat',board:'features.board',polls:'features.polls',files:'features.files',schedule:'features.schedule',homework:'features.homework',announcements:'features.announcements',notifications:'features.notifications',classmates:'features.classmates'};
let settings=null;let loading=false;let last=0;

async function load(force=false){
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
  document.documentElement.dataset.className=text;
  document.querySelectorAll('[data-class-name]').forEach(el=>{
    // Never destroy containers. Only dedicated leaf labels may be rewritten.
    if(el.children.length===0){el.textContent=text;return;}
    const label=el.querySelector(':scope > [data-class-name-label]');
    if(label)label.textContent=text;
  });
}
function apply(){
  if(!settings)return;
  setClassNameSafely(settings['class.name']);
  Object.entries(mapViewToKey).forEach(([view,key])=>{
    document.querySelectorAll(`[data-nav="${view}"]`).forEach(el=>{
      const on=enabled(key);el.hidden=!on;el.setAttribute('aria-hidden',on?'false':'true');
    });
  });
  const active=document.querySelector('.sidebar .nav [data-nav].active');
  if(active&&active.hidden)document.querySelector('.sidebar .nav [data-nav="dashboard"]')?.click();
}

const observer=new MutationObserver(()=>{if(settings)queueMicrotask(apply);else if(document.querySelector('.sidebar'))load()});
observer.observe(document.body,{subtree:true,childList:true});
window.addEventListener('portal:features-refresh',()=>load(true));
window.addEventListener('focus',()=>load());
setTimeout(()=>load(),900);
