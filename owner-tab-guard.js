const OWNER_TAB_SELECTOR='[data-owner-tab]';

function dedupeOwnerTabs(){
  document.querySelectorAll('.cc-tabbar').forEach(tabbar=>{
    const tabs=[...tabbar.querySelectorAll(OWNER_TAB_SELECTOR)];
    if(tabs.length<=1)return;
    tabs.slice(1).forEach(tab=>tab.remove());
  });
}

const style=document.createElement('style');
style.textContent='.cc-tabbar [data-owner-tab]~[data-owner-tab]{display:none!important}';
style.dataset.ownerTabGuard='1';
if(!document.querySelector('style[data-owner-tab-guard]'))document.head.append(style);

let queued=false;
const observer=new MutationObserver(()=>{
  if(queued)return;
  queued=true;
  queueMicrotask(()=>{
    queued=false;
    dedupeOwnerTabs();
  });
});
observer.observe(document.body,{subtree:true,childList:true});

dedupeOwnerTabs();
