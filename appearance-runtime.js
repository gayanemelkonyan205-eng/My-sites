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
  const rawAccent=String(m['appearance.accent']||'');
  // Keep appearance choices readable on the active surface.
  const hex=/^#[0-9a-f]{6}$/i.test(rawAccent)?rawAccent:null;
  const rgb=hex?[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255):null;
  const light=rgb?.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  const luminance=light?light[0]*.2126+light[1]*.7152+light[2]*.0722:0;
  const accent=hex&&((resolved==='dark'&&luminance>=.175)||(resolved==='light'&&luminance<=.18))?hex:(resolved==='dark'?'#8B83FF':'#4F46E5');
  r.style.setProperty('--a',accent);
  r.style.setProperty('--lg-accent',accent);
  r.style.setProperty('--pm-accent',accent);
  r.style.setProperty('--lg-radius-lg',`${Number(m['appearance.radius']||24)}px`);
  r.style.setProperty('--lg-blur',`${Number(m['appearance.glass_blur']||28)}px`);
  r.style.setProperty('--cc-glass-opacity',String(m['appearance.glass_opacity']??.58));
  r.style.setProperty('--cc-motion-speed',String(m['motion.speed']||1));
  r.style.setProperty('--cc-spring-strength',String(m['motion.spring_strength']||1));
  r.style.setProperty('--radius',`${Math.max(10,Math.min(30,Number(m['appearance.radius']||16)))}px`);
  r.style.setProperty('--pm-radius',`${Math.max(10,Math.min(30,Number(m['appearance.radius']||16)))}px`);
  r.style.setProperty('--pm-blur',`${Math.max(0,Math.min(40,Number(m['appearance.glass_blur']||24)))}px`);
  r.style.setProperty('--pm-motion',String(Math.max(.6,Math.min(1.6,Number(m['motion.speed']||1)))));
  r.style.setProperty('--glass-percent',`${Math.max(60,Math.min(96,Math.round(Number(m['appearance.glass_opacity']??.9)*100)))}%`);
  r.style.setProperty('--motion-fast',`${Math.round(150/Math.max(.6,Math.min(1.6,Number(m['motion.speed']||1))))}ms`);
  r.style.setProperty('--motion-view',`${Math.round(240/Math.max(.6,Math.min(1.6,Number(m['motion.speed']||1))))}ms`);
  r.classList.toggle('motion-off',m['motion.enabled']===false);
  r.classList.toggle('soft-gradient',m['appearance.background_style']==='soft-gradient');
  const title=m['identity.site_name'];
  if(title){document.title=`${title} — Class Portal`;document.querySelectorAll('.brand b').forEach(x=>x.textContent=title)}
}
window.addEventListener('portal:appearance-refresh',apply);
window.addEventListener('focus',apply);
window.addEventListener('portal:boot-state',e=>{if(e.detail.state==='PORTAL')apply()});
setTimeout(apply,300);
