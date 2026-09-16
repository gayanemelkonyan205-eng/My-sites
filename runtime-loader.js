const modules=[
  './telemetry.js?v=2',
  './appearance-runtime.js?v=2',
  './feature-runtime.js?v=2',
  './copy-polish.js?v=2',
  './mobile-fixes.js?v=4',
  './liquid-glass-v2.js?v=3',
  './chat-reliable.js?v=3',
  './chat-polish.js?v=2',
  './control-center.js?v=2',
  './control-center-extensions.js?v=2',
  './chat-admin-fix.js?v=2',
  './simple-nav.js?v=3'
];

let started=false;
function portalReady(){
  const app=document.querySelector('#app');
  if(!app)return false;
  return !app.querySelector('.boot') || !!app.querySelector('.portal,.auth,.auth-side');
}

async function start(){
  if(started||!portalReady())return;
  started=true;
  for(const src of modules){
    try{await import(src)}catch(error){
      console.error('Secondary runtime failed:',src,error);
      window.dispatchEvent(new CustomEvent('portal:runtime-error',{detail:{src,name:error?.name||'Error'}}));
    }
  }
}

const observer=new MutationObserver(()=>{
  if(portalReady()){
    observer.disconnect();
    start();
  }
});
observer.observe(document.querySelector('#app'),{childList:true,subtree:true});

// If the main portal has not booted, never let users stare at an endless spinner.
setTimeout(()=>{
  if(portalReady())return start();
  const app=document.querySelector('#app');
  if(!app)return;
  app.innerHTML=`<div class="auth-side" style="min-height:100vh"><div class="auth-card"><div class="logo">Դ</div><h2>Չհաջողվեց բեռնել</h2><p class="muted">Կապը կամ մուտքի սեսիան չի պատասխանել։ Փորձիր նորից։</p><button class="btn primary wide" id="boot-retry">Կրկին փորձել</button></div></div>`;
  document.querySelector('#boot-retry')?.addEventListener('click',()=>location.reload());
},10000);

start();
