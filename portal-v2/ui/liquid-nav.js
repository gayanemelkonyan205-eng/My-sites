import { primaryDestinations,buildRoleDestinations } from '../lib/navigation.js';
import { icon } from './icons.js';
import { openMoreSheet } from './sheet.js';

export function mountLiquidNav({role='STUDENT',active='home',onNavigate}){
  document.querySelector('.liquid-nav')?.remove();
  const nav=document.createElement('nav');
  nav.className='liquid-nav glass';
  nav.setAttribute('aria-label','Գլխավոր նավիգացիա');
  nav.innerHTML=`<div class="liquid-nav__lens" aria-hidden="true"></div>${primaryDestinations.map(item=>`<button type="button" data-key="${item.key}" class="${item.key===active?'active':''}" aria-label="${item.label}">${icon(item.icon)}<span>${item.label}</span></button>`).join('')}`;
  document.body.append(nav);

  const lens=nav.querySelector('.liquid-nav__lens');
  const buttons=[...nav.querySelectorAll('button[data-key]')];
  const positionLens=()=>{
    const target=nav.querySelector(`button[data-key="${active}"]`)||nav.querySelector('button[data-key="more"]');
    if(!target)return;
    const n=nav.getBoundingClientRect(),r=target.getBoundingClientRect();
    lens.style.width=`${r.width}px`;
    lens.style.transform=`translateX(${r.left-n.left-7}px)`;
  };
  const setActive=(key)=>{
    active=key;
    buttons.forEach(b=>b.classList.toggle('active',b.dataset.key===key));
    requestAnimationFrame(positionLens);
  };
  buttons.forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.key;
    if(key==='more'){
      setActive('more');
      openMoreSheet(buildRoleDestinations(role),(destination)=>{
        setActive(primaryDestinations.some(x=>x.key===destination)?destination:'more');
        onNavigate(destination);
      });
      return;
    }
    setActive(key);onNavigate(key);
  }));
  window.addEventListener('resize',positionLens,{passive:true});
  requestAnimationFrame(positionLens);
  return {nav,setActive,destroy(){window.removeEventListener('resize',positionLens);nav.remove();}};
}

export function mountSuperAdminControl({role,onOpen}){
  document.querySelector('.floating-admin')?.remove();
  if(role!=='SUPER_ADMIN')return null;
  const button=document.createElement('button');
  button.type='button';
  button.className='floating-admin glass';
  button.innerHTML=`${icon('shield',{size:20})}<strong>Control Center</strong>`;
  button.addEventListener('click',onOpen);
  document.body.append(button);
  return button;
}
