import { sb } from './supabase-client.js';

let applying=false;
async function apply(){
  if(document.querySelector('#app')?.dataset.bootState!=='PORTAL')return;
  if(applying)return;applying=true;
  const {data,error}=await sb.rpc('get_public_site_settings');applying=false;
  if(error||!data)return;
  const m=Object.fromEntries(data.map(x=>[x.key,x.value]));const r=document.documentElement;
  const mode=m['appearance.theme_mode']||localStorage.getItem('portal-theme')||'dark';
  const resolved=mode==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
  r.dataset.theme=resolved;
  r.style.setProperty('--lg-accent',m['appearance.accent']||'#0A84FF');
  r.style.setProperty('--lg-radius-lg',`${Number(m['appearance.radius']||24)}px`);
  r.style.setProperty('--lg-blur',`${Number(m['appearance.glass_blur']||28)}px`);
  r.style.setProperty('--cc-glass-opacity',String(m['appearance.glass_opacity']??.58));
  r.style.setProperty('--cc-motion-speed',String(m['motion.speed']||1));
  r.style.setProperty('--cc-spring-strength',String(m['motion.spring_strength']||1));
  r.classList.toggle('motion-off',m['motion.enabled']===false);
  r.classList.toggle('soft-gradient',m['appearance.background_style']==='soft-gradient');
  const title=m['identity.site_name'];
  if(title){document.title=`${title} — Class Portal`;document.querySelectorAll('.brand b').forEach(x=>x.textContent=title)}
}
window.addEventListener('portal:appearance-refresh',apply);
window.addEventListener('focus',apply);
window.addEventListener('portal:boot-state',e=>{if(e.detail.state==='PORTAL')apply()});
setTimeout(apply,300);
