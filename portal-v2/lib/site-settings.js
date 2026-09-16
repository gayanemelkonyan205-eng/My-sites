import { sb } from './supabase.js';

export async function loadSiteSettings(){
  const {data,error}=await sb.rpc('get_public_site_settings');
  if(error)throw error;
  return Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
}

export function toThemeInput(settings={}){
  return {
    theme_mode:settings['appearance.theme_mode']??'dark',
    accent:settings['appearance.accent']??'#0A84FF',
    radius:settings['appearance.radius']??24,
    glass_opacity:settings['appearance.glass_opacity']??.58,
    glass_blur:settings['appearance.glass_blur']??28,
    motion_enabled:settings['motion.enabled']??true,
    motion_speed:settings['motion.speed']??1,
    spring_strength:settings['motion.spring_strength']??1
  };
}

export async function saveSiteSetting(key,value){
  return sb.rpc('super_admin_set_site_setting',{p_key:key,p_value:value});
}
