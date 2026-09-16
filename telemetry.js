const TOKEN='phc_oJrHeCL4DDGcxQUw5kuBLdcWpsaVVbqx6zqpPHJtLQLC';
const HOST='https://us.i.posthog.com';
const KEY='portal-analytics-id';
let distinct=localStorage.getItem(KEY);if(!distinct){distinct=crypto.randomUUID();localStorage.setItem(KEY,distinct)}
const safe=(p={})=>Object.fromEntries(Object.entries(p).filter(([k])=>!/(email|password|body|message_text|invite|secret|token)/i.test(k)).map(([k,v])=>[k,typeof v==='string'?v.slice(0,180):v]));
function capture(event,properties={}){fetch(`${HOST}/capture/`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:TOKEN,event,distinct_id:distinct,properties:{...safe(properties),$current_url:location.origin+location.pathname,app:'class-portal'}}),keepalive:true}).catch(()=>{})}
window.addEventListener('portal:track',e=>{const d=e.detail||{};if(d.event)capture(d.event,d.properties||{})});
window.addEventListener('error',e=>capture('ui_error',{source:e.filename?.split('/').pop()||'unknown',line:e.lineno||0,error_type:e.error?.name||'Error'}));
window.addEventListener('unhandledrejection',e=>capture('ui_unhandled_rejection',{error_type:e.reason?.name||'PromiseRejection'}));
document.addEventListener('click',e=>{const n=e.target.closest('[data-nav]');if(n)capture('navigation_clicked',{view:n.dataset.nav})},{capture:true});
capture('portal_loaded',{theme:document.documentElement.dataset.theme||'unknown',viewport:innerWidth<700?'mobile':innerWidth<1100?'tablet':'desktop'});
