import { bottomItems, sectionForView } from './simple-nav-core.js';
import { icon } from './icons.js';

const labels = {
  schedule:['▦','Դասացուցակ','Օրվա դասերը'], homework:['✓','Տնայիններ','Առաջադրանքներ'], files:['▣','Ֆայլեր','Դասարանի նյութեր'], polls:['◌','Հարցումներ','Քվեարկություններ'],
  announcements:['◉','Հայտարարություններ','Կարևոր նորություններ'], events:['◈','Միջոցառումներ','Օրացույց և հանդիպումներ'], board:['▤','Տախտակ','Գրառումներ ու քննարկումներ'], classmates:['♙','Դասընկերներ','Դասարանի մարդիկ'], profile:['◎','Պրոֆիլ','Քո հաշիվը'], admin:['⚙','Admin Center','Դասարանի կառավարում'], superadmin:['◆','Super Admin','Լիարժեք Control Center']
};
let syncing = false;

function currentView(){
  return document.querySelector('.sidebar .nav [data-nav].active')?.dataset.nav || document.querySelector('.mobile [data-view].active')?.dataset.view || 'dashboard';
}
function source(view){ return document.querySelector(`.sidebar .nav [data-nav="${CSS.escape(view)}"]`); }
function available(view){const el=source(view);return !!el&&!el.hidden&&el.getAttribute('aria-hidden')!=='true';}
function go(view){ if(!available(view)&&!['dashboard','profile','admin','superadmin'].includes(view))return; closeSheet(); source(view)?.click(); requestAnimationFrame(sync); }

function closeSheet(){ document.querySelector('.sn-backdrop')?.remove(); }
function openSheet(title, views){
  closeSheet();
  const items=views.filter(available);
  const wrap=document.createElement('div');wrap.className='sn-backdrop';
  wrap.innerHTML=`<section class="sn-sheet" role="dialog" aria-modal="true"><div class="sn-sheet-head"><h3>${title}</h3><button class="sn-sheet-close" aria-label="Փակել">×</button></div><div class="sn-grid">${items.map(v=>{const [,l,s]=labels[v]||['',v,''];return `<button class="sn-item ${v==='admin'||v==='superadmin'?'sn-admin':''}" data-sheet-view="${v}"><span class="sn-item-icon">${icon(v)}</span><span>${l}<small>${s}</small></span></button>`}).join('')||'<div class="sn-empty">Այս բաժիններում հասանելի գործիք չկա</div>'}${title==='Ավելին'?`<button class="sn-item" data-sheet-action="theme"><span class="sn-item-icon">${icon('appearance')}</span><span>Թեմա<small>Փոխել տեսքը</small></span></button><button class="sn-logout" data-sheet-action="logout"><span class="sn-item-icon">${icon('profile')}</span><span>Դուրս գալ<small>Ավարտել մուտքը</small></span></button>`:''}</div></section>`;
  document.body.append(wrap);
  wrap.onclick=e=>{if(e.target===wrap||e.target.closest('.sn-sheet-close'))closeSheet();};
  wrap.querySelectorAll('[data-sheet-view]').forEach(b=>b.onclick=()=>go(b.dataset.sheetView));
  wrap.querySelector('[data-sheet-action="theme"]')?.addEventListener('click',()=>{document.querySelector('#theme')?.click();closeSheet()});
  wrap.querySelector('[data-sheet-action="logout"]')?.addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('portal:logout'));closeSheet()});
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
  dock.querySelector('[data-simple-key="notifications"]')?.addEventListener('click',()=>available('notifications')?go('notifications'):openSheet('Ծանուցումներ',[]));
  dock.querySelector('[data-simple-key="more"]')?.addEventListener('click',()=>openSheet('Ավելին',['announcements','events','board','classmates','profile','admin','superadmin']));
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
  syncing=false;
}

function sync(){
  const dock=document.querySelector('.mobile[data-simple-nav="1"]');
  if(!dock)return rebuild();
  const section=sectionForView(currentView());
  dock.querySelectorAll('[data-simple-key]').forEach(b=>b.classList.toggle('active',b.dataset.simpleKey===section));
  if(dock.children.length!==5) rebuild();
}

const observer=new MutationObserver(()=>queueMicrotask(sync));
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','aria-hidden']});
window.addEventListener('portal:features-refresh',()=>queueMicrotask(sync));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeSheet()});
sync();