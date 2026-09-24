// Browser connectivity is a hint, not a guarantee that the server is reachable.
const style=document.createElement('style');
style.textContent=`.connection-status{position:fixed;top:calc(env(safe-area-inset-top,0px) + 12px);left:50%;transform:translateX(-50%);z-index:10000;width:max-content;max-width:calc(100vw - 24px);box-sizing:border-box;padding:12px 18px;border-radius:14px;background:#7c2d12;color:#fff;box-shadow:0 8px 28px #0003;font:600 14px/1.5 system-ui,sans-serif;text-align:center;pointer-events:none}.connection-status[data-online="true"]{background:#166534}.connection-status[hidden]{display:none}`;
document.head.append(style);
const banner=document.createElement('div');
banner.className='connection-status';
banner.setAttribute('role','status');
banner.setAttribute('aria-live','polite');
banner.setAttribute('aria-atomic','true');
banner.hidden=true;
document.body.append(banner);
let hideTimer;
let wasOffline=false;
function update(){
  clearTimeout(hideTimer);
  if(navigator.onLine===false){
    wasOffline=true;
    banner.dataset.online='false';
    banner.textContent='Ինտերնետ կապը բացակայում է։ Փոփոխությունները կարող են չպահպանվել։';
    banner.hidden=false;
  }else if(wasOffline){
    wasOffline=false;
    banner.dataset.online='true';
    banner.textContent='Ինտերնետ կապը վերականգնվել է։';
    banner.hidden=false;
    hideTimer=setTimeout(()=>{banner.hidden=true;},4000);
  }
}
window.addEventListener('offline',update);
window.addEventListener('online',update);
update();
