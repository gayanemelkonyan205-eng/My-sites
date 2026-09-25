import { showBootError } from './boot-state.js';

const modules=[
  './connection-status.js?v=1',
  './global-search.js?v=2',
  './telemetry.js?v=2',
  './appearance-runtime.js?v=6',
  './feature-runtime.js?v=4',
  './copy-polish.js?v=2',
  './logout-runtime.js?v=2',
  './simple-nav.js?v=6',
  './chat-polish.js?v=2',
  './control-center.js?v=4',
  './control-center-extensions.js?v=4',
  './owner-center.js?v=1',
  './chat-admin-fix.js?v=4'
];

let started=false;
function portalReady(){
  const app=document.querySelector('#app');
  if(!app)return false;
  return ['LOGIN','PORTAL'].includes(app.dataset.bootState);
}

async function start(){
  if(started||!portalReady())return;
  started=true;
  // Give the main portal one paint before optional modules attach observers/listeners.
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  for(const src of modules){
    try{await import(src)}catch(error){
      console.error('Secondary runtime failed:',src,error);
      window.dispatchEvent(new CustomEvent('portal:runtime-error',{detail:{src,name:error?.name||'Error'}}));
    }
  }
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

setTimeout(()=>{
  if(started||portalReady())return start();
  if(['BOOTING','AUTH_CHECK'].includes(app?.dataset.bootState))showBootError();
},12000);

start();