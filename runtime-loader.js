import { showBootError } from './boot-state.js';

// Keep the critical path tiny: portal/auth must finish before any secondary UI.
const modules=[
  './simple-nav.js?v=10',
  './alerts-runtime.js?v=5',
  './owner-control.js?v=4',
  './logout-runtime.js?v=4',
  './connection-status.js?v=1',
  './global-search.js?v=2',
  './appearance-runtime.js?v=6',
  './feature-runtime.js?v=4',
  './copy-polish.js?v=2',
  './control-center.js?v=7',
  './control-center-extensions.js?v=4',
  './owner-center.js?v=2',
  './owner-tab-guard.js?v=1',
  './chat-admin-fix.js?v=4',
  './owner-guard.js?v=3'
];
const optional=['./telemetry.js?v=2','./chat-polish.js?v=2'];

let started=false;
function portalReady(){
  const app=document.querySelector('#app');
  return !!app&&app.dataset.bootState==='PORTAL';
}

async function start(){
  if(started||!portalReady())return;
  started=true;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  for(const src of modules){
    try{await import(src)}catch(error){
      console.error('Secondary runtime failed:',src,error);
      window.dispatchEvent(new CustomEvent('portal:runtime-error',{detail:{src,name:error?.name||'Error'}}));
    }
  }
  const results=await Promise.allSettled(optional.map(src=>import(src)));
  results.forEach((result,index)=>{
    if(result.status==='rejected')console.error('Optional runtime failed:',optional[index],result.reason);
  });
}

const app=document.querySelector('#app');
const observer=new MutationObserver(()=>{
  if(portalReady()){
    observer.disconnect();
    start();
  }
});
if(app)observer.observe(app,{attributes:true,attributeFilter:['data-boot-state']});
window.addEventListener('portal:boot-state',()=>{
  if(portalReady()){observer.disconnect();start();}
});

window.setTimeout(()=>{
  if(started)return;
  if(portalReady())return start();
  if(['BOOTING','AUTH_CHECK'].includes(app?.dataset.bootState))showBootError();
},12000);

start();
