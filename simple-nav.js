import { bottomItems, sectionForView } from './simple-nav-core.js?v=2';
import { icon } from './icons.js';

const labels = {
  schedule:['▦','Դասացուցակ','Օրվա դասերը'], homework:['✓','Տնայիններ','Առաջադրանքներ'], files:['▣','Ֆայլեր','Դասարանի նյութեր'], polls:['◌','Հարցումներ','Քվեարկություններ'],
  announcements:['◉','Հայտարարություններ','Կարևոր նորություններ'], events:['◈','Օրացույց','Դասարանի իրադարձություններ'], board:['▤','Դասատախտակ','Գրառումներ ու քննարկումներ'], classmates:['♙','Դասընկերներ','Դասարանի մարդիկ'], profile:['◎','Իմ պրոֆիլը','Քո հաշիվը'], settings:['⚙','Կարգավորումներ','Տեսք և Alerts'], admin:['⚙','Admin Center','Դասարանի կառավարում'], superadmin:['◆','Super Admin Control Center','Լիարժեք կառավարում']
};
let syncing = false;
let lastView = null;
let focusBeforeSheet = null;

function currentView(){
  return document.querySelector('.sidebar .nav [data-nav].active')?.dataset.nav || document.querySelector('.mobile [data-view].active')?.dataset.view || 'dashboard';
}
function source(view){ return document.querySelector(`.sidebar .nav [data-nav="${CSS.escape(view)}"]`); }
function available(view){const el=source(view);return !!el&&!el.hidden&&el.getAttribute('aria-hidden')!=='true';}
function closeSheet(){
  const wasOpen=!!document.querySelector('.sn-backdrop');
  document.querySelectorAll('.sn-backdrop').forEach(el=>el.remove());
  document.documentElement.classList.remove('sn-sheet-open');
  if(wasOpen&&focusBeforeSheet?.isConnected)focusBeforeSheet.focus({preventScroll:true});
  focusBeforeSheet=null;
}
function scrubStaleOverlays(){
  document.querySelectorAll('.sn-backdrop').forEach(backdrop=>{
    const sheet=backdrop.querySelector('.sn-sheet');
    if(!sheet||sheet.hidden||getComputedStyle(sheet).display==='none')backdrop.remove();
  });
  if(!document.querySelector('.sn-backdrop'))document.documentElement.classList.remove('sn-sheet-open');
}
function go(view){
  closeSheet();
  if(!view)return;
  window.dispatchEvent(new CustomEvent('portal:open',{detail:{view}}));
  requestAnimationFrame(sync);
}
function openSheet(title, views){
  closeSheet();
  focusBeforeSheet=document.activeElement;
  const items=views.filter(available);
  const wrap=document.createElement('div');wrap.className='sn-backdrop';
  document.documentElement.classList.add('sn-sheet-open');
  const compactClass=title==='Ավելին'?' sn-more':'';
  wrap.innerHTML=`<section class="sn-sheet${compactClass}" role="dialog" aria-modal="true" aria-label="${title}"><div class="sn-handle" aria-hidden="true"></div><div class="sn-sheet-head"><h3>${title}</h3><button class="sn-sheet-close" type="button" aria-label="Փակել">×</button></div><div class="sn-grid">${items.map(v=>{const [,l,s]=labels[v]||['',v,''];return `<button type="button" class="sn-item ${v==='admin'||v==='superadmin'?'sn-admin':''}" data-sheet-view="${v}"><span class="sn-item-icon">${icon(v)}</span><span>${l}<small>${s}</small></span></button>`}).join('')||'<div class="sn-empty">Այս բաժիններում հասանելի գործիք չկա</div>'}${title==='Ավելին'?`<button type="button" class="sn-logout" data-sheet-action="logout"><span class="sn-item-icon">${icon('profile')}</span><span>Ելք<small>Ավարտել մուտքը</small></span></button>`:''}</div></section>`;
  document.body.append(wrap);
  const sheet=wrap.querySelector('.sn-sheet');
  wrap.querySelector('.sn-sheet-close')?.focus({preventScroll:true});
  let startY=0,dragY=0;
  sheet.addEventListener('touchstart',event=>{if(sheet.scrollTop>0)return;startY=event.touches[0]?.clientY||0;dragY=0},{passive:true});
  sheet.addEventListener('touchmove',event=>{
    if(!startY||sheet.scrollTop>0)return;
    dragY=Math.max(0,(event.touches[0]?.clientY||0)-startY);
    if(dragY>8){event.preventDefault();sheet.style.transform=`translateY(${dragY}px)`;sheet.style.transition='none';}
  },{passive:false});
  sheet.addEventListener('touchend',()=>{
    if(dragY>85){closeSheet();return;}
    sheet.style.transition='transform .22s cubic-bezier(.2,.8,.2,1)';sheet.style.transform='';startY=0;dragY=0;
  });

  wrap.addEventListener('click',e=>{
    if(e.target===wrap||e.target.closest('.sn-sheet-close')){
      closeSheet();
      return;
    }
    const viewButton=e.target.closest('[data-sheet-view]');
    if(viewButton){
      e.preventDefault();
      e.stopPropagation();
      go(viewButton.dataset.sheetView);
      return;
    }
    const actionButton=e.target.closest('[data-sheet-action]');
    if(!actionButton)return;
    const action=actionButton.dataset.sheetAction;
    closeSheet();
    if(action==='logout')window.dispatchEvent(new CustomEvent('portal:logout'));
  });
}

function rebuild(){
  const dock=document.querySelector('.mobile');
  const sidebar=document.querySelector('.sidebar .nav');
  if(!dock||!sidebar||syncing)return;
  syncing=true;
  const section=sectionForView(currentView());
  dock.dataset.simpleNav='1';
  dock.innerHTML=bottomItems.map(item=>`<button type="button" data-simple-key="${item.key}" data-view="${item.key}" class="${section===item.key?'active':''}"><span class="sn-icon">${icon(item.key)}</span><span>${item.label}</span></button>`).join('');
  dock.querySelector('[data-simple-key="dashboard"]')?.addEventListener('click',()=>go('dashboard'));
  dock.querySelector('[data-simple-key="study"]')?.addEventListener('click',()=>openSheet('Ուսում',['schedule','homework','files','polls']));
  dock.querySelector('[data-simple-key="chat"]')?.addEventListener('click',()=>available('chat')?go('chat'):openSheet('Չատ',[]));
  dock.querySelector('[data-simple-key="notifications"]')?.addEventListener('click',()=>available('notifications')?go('notifications'):openSheet('Alerts',[]));
  dock.querySelector('[data-simple-key="more"]')?.addEventListener('click',()=>document.querySelector('.sn-backdrop .sn-more')?closeSheet():openSheet('Ավելին',['settings','profile','announcements','board','classmates','polls','files','events','admin','superadmin']));
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  syncing=false;
}

function sync(){
  scrubStaleOverlays();
  const view=currentView();
  if(lastView!==null&&view!==lastView)closeSheet();
  lastView=view;
  const dock=document.querySelector('.mobile[data-simple-nav="1"]');
  if(!dock)return rebuild();
  const section=sectionForView(view);
  dock.querySelectorAll('[data-simple-key]').forEach(b=>b.classList.toggle('active',b.dataset.simpleKey===section));
  if(dock.children.length!==5) rebuild();
}

closeSheet();
const observer=new MutationObserver(()=>queueMicrotask(sync));
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-hidden']});
window.addEventListener('portal:features-refresh',()=>queueMicrotask(sync));
window.addEventListener('popstate',closeSheet);
window.addEventListener('hashchange',closeSheet);
window.addEventListener('pageshow',()=>{closeSheet();requestAnimationFrame(sync)});
window.addEventListener('focus',scrubStaleOverlays);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
document.addEventListener('visibilitychange',()=>{if(document.hidden)closeSheet();else scrubStaleOverlays()});
sync();
