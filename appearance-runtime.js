import { sb } from './supabase-client.js';

let applying=false;
const clamp=(value,min,max,fallback)=>{if(value===null||value===undefined||value==='')return fallback;const number=Number(value);return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback};
async function apply(){
  if(document.querySelector('#app')?.dataset.bootState!=='PORTAL')return;
  if(applying)return;applying=true;
  const {data,error}=await sb.rpc('get_public_site_settings');applying=false;
  if(error||!data)return;
  const m=Object.fromEntries(data.map(x=>[x.key,x.value]));
  const root=document.documentElement;
  const mode=m['appearance.theme_mode']||localStorage.getItem('portal-theme')||'dark';
  const resolved=mode==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):mode;
  root.dataset.theme=resolved;

  const rawAccent=String(m['appearance.accent']||'');
  const hex=/^#[0-9a-f]{6}$/i.test(rawAccent)?rawAccent:null;
  const rgb=hex?[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255):null;
  const light=rgb?.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
  const luminance=light?light[0]*.2126+light[1]*.7152+light[2]*.0722:0;
  const accent=hex&&((resolved==='dark'&&luminance>=.175)||(resolved==='light'&&luminance<=.18))?hex:(resolved==='dark'?'#8B83FF':'#4F46E5');
  const radius=clamp(m['appearance.radius'],10,30,22);
  const blur=clamp(m['appearance.glass_blur'],0,40,24);
  const speed=clamp(m['motion.speed'],.6,1.6,1);

  root.style.setProperty('--pm-accent',accent);
  root.style.setProperty('--pm-radius',`${radius}px`);
  root.style.setProperty('--pm-blur',`${blur}px`);
  root.style.setProperty('--pm-motion',String(speed));
  root.classList.toggle('motion-off',m['motion.enabled']===false);
  root.classList.toggle('soft-gradient',m['appearance.background_style']==='soft-gradient');

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