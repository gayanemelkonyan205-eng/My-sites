import { loadSiteSettings,saveSiteSetting,toThemeInput } from '../../lib/site-settings.js';
import { applyTheme } from '../../lib/theme.js';
import { toast } from '../../lib/dom.js';

export async function renderAppearanceModule({onSiteSettingsChanged}){
  const settings=await loadSiteSettings();
  const theme=toThemeInput(settings);
  const root=document.createElement('div');
  root.innerHTML=`<div class="row between wrap" style="margin-bottom:14px"><div><div class="eyebrow">Appearance</div><h2 style="margin:.25rem 0">Դիզայն և անիմացիաներ</h2><p class="subtle" style="margin:0">Փոփոխությունները նախադիտվում են անմիջապես և պահպանվում են ամբողջ կայքի համար։</p></div><button class="button primary" data-save>Պահպանել բոլորը</button></div>
  <div class="settings-group">
    <label class="setting-row"><span><strong>Թեմա</strong><small class="subtle" style="display:block">Dark-ը միշտ իրական #000000 է</small></span><select class="select" name="theme_mode"><option value="dark" ${theme.theme_mode==='dark'?'selected':''}>Dark</option><option value="light" ${theme.theme_mode==='light'?'selected':''}>Light</option><option value="system">System</option></select></label>
    <label class="setting-row"><span><strong>Accent</strong><small class="subtle" style="display:block">Կոճակներ, active lens և highlight</small></span><input class="input" type="color" name="accent" value="${theme.accent}"></label>
    <label class="setting-row"><span><strong>Radius</strong><small class="subtle" style="display:block">14–34 px</small></span><input class="input" type="range" min="14" max="34" step="1" name="radius" value="${theme.radius}"></label>
    <label class="setting-row"><span><strong>Glass opacity</strong><small class="subtle" style="display:block">0.36–0.92</small></span><input class="input" type="range" min="0.36" max="0.92" step="0.01" name="glass_opacity" value="${theme.glass_opacity}"></label>
    <label class="setting-row"><span><strong>Glass blur</strong><small class="subtle" style="display:block">12–48 px</small></span><input class="input" type="range" min="12" max="48" step="1" name="glass_blur" value="${theme.glass_blur}"></label>
    <label class="setting-row"><span><strong>Motion speed</strong><small class="subtle" style="display:block">0.6–1.6×</small></span><input class="input" type="range" min="0.6" max="1.6" step="0.05" name="motion_speed" value="${theme.motion_speed}"></label>
    <label class="setting-row"><span><strong>Spring strength</strong><small class="subtle" style="display:block">Liquid lens-ի շարժումը</small></span><input class="input" type="range" min="0.6" max="1.5" step="0.05" name="spring_strength" value="${theme.spring_strength}"></label>
    <label class="setting-row"><span><strong>Animations</strong><small class="subtle" style="display:block">Reduced motion-ը միշտ հարգվում է</small></span><input type="checkbox" name="motion_enabled" ${theme.motion_enabled?'checked':''}></label>
    <label class="setting-row"><span><strong>Կայքի անուն</strong></span><input class="input" name="site_name" maxlength="60" value="${String(settings['identity.site_name']??'Դասարան').replace(/"/g,'&quot;')}"></label>
  </div>
  <article class="glass" style="border-radius:30px;padding:20px;margin-top:18px"><div class="eyebrow">Live Preview</div><h2 style="margin:.3rem 0">Liquid Glass</h2><p class="subtle">Այս բլոկը փոխվում է slider-ների հետ միասին։</p><div class="row wrap"><button class="button primary">Primary</button><button class="button ghost">Secondary</button><span class="pill">Glass</span></div></article>`;

  const value=()=>{
    const selected=root.querySelector('[name="theme_mode"]').value;
    const resolved=selected==='system'?(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):selected;
    return {
      theme_mode:resolved,
      accent:root.querySelector('[name="accent"]').value,
      radius:Number(root.querySelector('[name="radius"]').value),
      glass_opacity:Number(root.querySelector('[name="glass_opacity"]').value),
      glass_blur:Number(root.querySelector('[name="glass_blur"]').value),
      motion_speed:Number(root.querySelector('[name="motion_speed"]').value),
      spring_strength:Number(root.querySelector('[name="spring_strength"]').value),
      motion_enabled:root.querySelector('[name="motion_enabled"]').checked,
      selectedMode:selected,
      site_name:root.querySelector('[name="site_name"]').value.trim()
    };
  };
  const preview=()=>applyTheme(value());
  root.querySelectorAll('input,select').forEach(control=>control.addEventListener('input',preview));
  root.querySelector('[data-save]').addEventListener('click',async()=>{
    const v=value();
    if(v.site_name.length<2)return toast('Կայքի անունը շատ կարճ է','err');
    const entries=[
      ['appearance.theme_mode',v.selectedMode],['appearance.accent',v.accent],['appearance.radius',v.radius],
      ['appearance.glass_opacity',v.glass_opacity],['appearance.glass_blur',v.glass_blur],['motion.enabled',v.motion_enabled],
      ['motion.speed',v.motion_speed],['motion.spring_strength',v.spring_strength],['identity.site_name',v.site_name]
    ];
    const button=root.querySelector('[data-save]');button.disabled=true;
    for(const [key,val] of entries){const r=await saveSiteSetting(key,val);if(r.error||r.data!==true){button.disabled=false;return toast(r.error?.message||`Չհաջողվեց՝ ${key}`,'err')}}
    button.disabled=false;toast('Դիզայնը պահպանվեց բոլորի համար','ok');onSiteSettingsChanged?.();
  });
  return root;
}
