import { sb } from './supabase-client.js';

let applying=false;
const clamp=(value,min,max,fallback)=>{
  const n=Number(value);
  return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
};

async function apply(){
  if(document.querySelector('#app')?.dataset.bootState!=='PORTAL')return;
  if(applying)return;
  applying=true;
  const {data,error}=await sb.rpc('get_public_site_settings');
  applying=false;
  if(error||!data)return;

  const m=Object.fromEntries(data.map(x=>[x.key,x.value]));
  const r=document.documentElement;
  const mode=m['appearance.theme_mode']||localStorage.getItem('portal-theme')||'dark';
  const resolved=mode==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
  r.dataset.theme=resolved;
  r.style.setProperty('--pm-accent',m['appearance.accent']||'#6D5DFC');
  r.style.setProperty('--pm-radius',`${clamp(m['appearance.radius'],14,30,22)}px`);
  r.style.setProperty('--pm-blur',`${clamp(m['appearance.glass_blur'],10,40,24)}px`);
  r.style.setProperty('--pm-motion',String(clamp(m['motion.speed'],.6,1.5,1)));
  r.classList.toggle('motion-off',m['motion.enabled']===false);

  const title=m['identity.site_name'];
  if(title){
    document.title=`${title} — Class Portal`;
    document.querySelectorAll('.brand b').forEach(x=>x.textContent=title);
  }
}

window.addEventListener('portal:appearance-refresh',apply);
window.addEventListener('focus',apply);
window.addEventListener('portal:boot-state',e=>{if(e.detail.state==='PORTAL')apply()});
setTimeout(apply,300);
