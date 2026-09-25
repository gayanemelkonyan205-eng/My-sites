import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const root = new URL('../', import.meta.url);
const settle = async () => { for (let i=0;i<12;i++) await new Promise(setImmediate); };

async function harness(options={}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><main id="app" data-boot-state="BOOTING"><div class="boot">Loading</div></main><div id="toast"></div></body></html>', {url:'https://portal.test/', runScripts:'outside-only', pretendToBeVisual:true});
  const {window:w}=dom, timers=[], observers=[], callbacks=[];
  let clients=0, locked=false, callsUnderLock=0, profileCalls=0, clientOptions;
  let session=options.session||null;
  const profile={id:'student-a',first_name:'Անի',last_name:'Ա',username:'ani',role:options.role||'STUDENT',is_active:true};
  const channels=new Set(),rows=options.rows||{};
  const query=table=>{let inserted;const q={then(resolve){if(table==='conversations'&&options.conversationRequest)return options.conversationRequest().then(resolve);if(inserted&&table==='messages'){(rows.messages||=[]).push({...inserted,id:'new-message',created_at:'2026-09-24T10:00:00Z'});inserted=null;}return Promise.resolve({data:rows[table]||[],error:null}).then(resolve)}};for(const key of ['select','order','limit','eq','gte','is','in','neq','update','delete','upsert'])q[key]=()=>q;q.insert=value=>{inserted=value;return q};return q;};
  const sb={auth:{
    getSession:async()=>({data:{session},error:null}),
    onAuthStateChange(fn){callbacks.push(fn);return {data:{subscription:{unsubscribe(){}}}}},
    signOut:async()=>{session=null;emit('SIGNED_OUT',null);return {error:null}},
    signInWithPassword:async()=>({error:{message:'invalid'}})
  },rpc:async(name)=>{
    if(locked) callsUnderLock++;
    if(name==='get_my_profile'){profileCalls++;return options.profileRequest?options.profileRequest():{data:profile,error:null};}
    return {data:[{key:'class.name',value:'9Ա'}],error:null};
  },from:query,channel(name){const channel={on(){return channel},subscribe(){channels.add(channel);return channel}};return channel},removeChannel:async c=>{channels.delete(c)},removeAllChannels:async()=>{channels.clear()}};
  function emit(event,next){session=next;locked=true;const results=callbacks.map(fn=>fn(event,next));locked=false;return results;}
  w.setTimeout=(fn,ms=0)=>{const timer={fn,ms,active:true};timers.push(timer);return timer};
  w.clearTimeout=t=>{if(t)t.active=false};w.setInterval=w.setTimeout;w.clearInterval=w.clearTimeout;
  w.requestAnimationFrame=fn=>w.setTimeout(fn,16);
  w.MutationObserver=class {constructor(fn){this.fn=fn;observers.push(this)}observe(){}disconnect(){this.disconnected=true}};
  w.matchMedia=()=>({matches:false,addEventListener(){}});
  w.fetch=async()=>({ok:true,json:async()=>({})});
  const context=dom.getInternalVMContext(),cache=new Map();
  async function load(name){
    const url=new URL(name,root).href;
    if(cache.has(url))return cache.get(url);
    const pending=(async()=>{
    let mod;
    if(url.startsWith('https://esm.sh/')){
      mod=new vm.SyntheticModule(['createClient'],function(){this.setExport('createClient',(_url,_key,options)=>{clients++;clientOptions=options;return sb})},{context,identifier:url});
    }else{
      mod=new vm.SourceTextModule(await readFile(fileURLToPath(url),'utf8'),{context,identifier:url,importModuleDynamically:async(spec,ref)=>{const m=await load(new URL(spec,ref.identifier).href);if(m.status==='linked')await m.evaluate();return m}});
    }
    await mod.link((spec,ref)=>load(new URL(spec,ref.identifier).href));
    return mod;
    })();
    cache.set(url,pending);
    return pending;
  }
  async function run(name){const mod=await load(name);if(mod.status==='linked')await mod.evaluate();await settle();return mod;}
  async function tick(ms){for(const t of [...timers])if(t.active&&t.ms===ms){t.active=false;t.fn()}await settle();}
  return {w,sb,run,tick,emit,observers,channels,close:()=>w.close(),get clientOptions(){return clientOptions},get clients(){return clients},get callsUnderLock(){return callsUnderLock},get profileCalls(){return profileCalls}};
}

test('all startup modules reuse a single auth client',async t=>{
  const h=await harness();t.after(h.close);
  for(const name of ['portal.js','appearance-runtime.js','feature-runtime.js','chat-reliable.js','control-center.js','control-center-extensions.js','chat-admin-fix.js'])await h.run(name);
  assert.equal(h.clients,1,'independent auth instances race over the same stored session');
});

test('auth callback releases the auth lock before requesting a profile',async t=>{
  const h=await harness();t.after(h.close);await h.run('portal.js');
  const results=h.emit('SIGNED_IN',{user:{id:'student-a'}});
  assert.ok(results.every(x=>!(x instanceof Promise)&&!x?.then),'callback must be synchronous');
  assert.equal(h.callsUnderLock,0,'RPC under auth lock deadlocks token acquisition');
  await h.tick(0);
  assert.ok(h.w.document.querySelector('.portal'));
});

test('password recovery opens reset form instead of the portal',async t=>{
  const h=await harness();t.after(h.close);await h.run('portal.js');
  h.emit('PASSWORD_RECOVERY',{user:{id:'student-a'}});await h.tick(0);
  assert.ok(h.w.document.querySelector('#reset-password'));
  assert.equal(h.w.document.querySelector('.portal'),null);
});

test('login provides a password recovery form',async t=>{
  const h=await harness();t.after(h.close);await h.run('portal.js');
  assert.ok(h.w.document.querySelector('#forgot-password'));
  h.w.document.querySelector('#forgot-password').click();
  assert.ok(h.w.document.querySelector('#recover-email'));
});

test('late profile response cannot reopen portal after signout',async t=>{
  let resolve;const h=await harness({profileRequest:()=>new Promise(r=>resolve=r)});t.after(h.close);
  await h.run('portal.js');h.emit('SIGNED_IN',{user:{id:'student-a'}});await h.tick(0);
  h.emit('SIGNED_OUT',null);await h.tick(0);
  resolve({data:{id:'student-a',first_name:'Անի',last_name:'Ա',role:'STUDENT',is_active:true},error:null});await settle();
  assert.ok(h.w.document.querySelector('#login'));
  assert.equal(h.w.document.querySelector('.portal'),null);
});

test('repeated auth events preserve an unsent draft',async t=>{
  const h=await harness();t.after(h.close);await h.run('portal.js');
  const s={user:{id:'student-a'}};h.emit('SIGNED_IN',s);await h.tick(0);
  h.w.document.querySelector('#view').innerHTML='<textarea id="draft">unsent message</textarea>';
  h.emit('SIGNED_IN',s);h.emit('TOKEN_REFRESHED',s);await h.tick(0);
  assert.equal(h.w.document.querySelector('#draft')?.value,'unsent message');
});

test('class-name settings never overwrite nested content and are idempotent',async t=>{
  const h=await harness();t.after(h.close);
  h.w.document.querySelector('#app').dataset.bootState='PORTAL';
  h.w.document.querySelector('#app').innerHTML='<div data-class-name><span data-class-name-label><button id="keep">Keep</button></span></div><span id="label" data-class-name>Old</span>';
  await h.run('feature-runtime.js');await h.tick(900);
  assert.ok(h.w.document.querySelector('#keep'),'nested label must not erase controls');
  assert.equal(h.w.document.querySelector('#label').textContent,'9Ա');
  const before=h.w.document.querySelector('#label').firstChild;
  h.w.dispatchEvent(new h.w.Event('focus'));await settle();
  assert.equal(h.w.document.querySelector('#label').firstChild,before,'same label must not retrigger childList observers');
});

test('login does not request member-only appearance settings',async t=>{
  const h=await harness();t.after(h.close);let requests=0;
  h.sb.rpc=async()=>{requests++;return {data:[],error:null}};
  await h.run('appearance-runtime.js');await h.run('feature-runtime.js');
  await h.tick(300);await h.tick(900);
  assert.equal(requests,0);
  h.w.document.querySelector('#app').dataset.bootState='PORTAL';
  h.w.dispatchEvent(new h.w.CustomEvent('portal:boot-state',{detail:{state:'PORTAL'}}));await settle();
  assert.equal(requests,2);
});

test('denied push permission shows recovery controls instead of hiding them',async t=>{
  const h=await harness({session:{user:{id:'student-a'}}});t.after(h.close);
  Object.defineProperty(h.w,'isSecureContext',{value:true});
  let prompts=0;
  h.w.Notification={permission:'denied',requestPermission(){prompts++;return Promise.resolve('denied')}};
  h.w.PushManager=class {};
  h.w.navigator.serviceWorker={getRegistration:async()=>null};
  await h.run('portal.js');
  h.w.document.querySelector('[data-nav="settings"]').click();await settle();
  assert.match(h.w.document.querySelector('#push-state').textContent,/Заблокированы/);
  assert.equal(h.w.document.querySelector('#push-allow').disabled,false);
  assert.equal(h.w.document.querySelector('#push-allow').textContent,'Как разрешить');
  assert.ok(h.w.document.querySelector('#push-disable'));
  assert.equal(h.w.document.querySelector('#push-browser-help').hidden,false);
  assert.match(h.w.document.querySelector('#push-browser-help').textContent,/Настройки сайта.*Уведомления.*Разрешить/);
  h.w.document.querySelector('#push-allow').click();
  assert.equal(prompts,0,'the site cannot re-prompt after the browser blocked permission');
  h.w.Notification.permission='default';
  h.w.document.querySelector('#push-recheck').click();await settle();
  assert.match(h.w.document.querySelector('#push-state').textContent,/Нужно разрешение/);
  assert.equal(h.w.document.querySelector('#push-allow').disabled,false);
});

test('confirmed send appears without a realtime event',async t=>{
  const h=await harness({session:{user:{id:'student-a'}},rows:{conversations:[{id:'a',type:'CLASS'}]}});t.after(h.close);
  await h.run('portal.js');h.w.document.querySelector('[data-nav="chat"]').click();await settle();
  h.w.document.querySelector('#compose [name="body"]').value='Test draft';
  h.w.document.querySelector('#compose').dispatchEvent(new h.w.Event('submit',{cancelable:true}));await settle();
  assert.match(h.w.document.querySelector('#messages').textContent,/Test draft/);
  assert.equal(h.w.document.querySelector('#compose button').disabled,false);
});

test('boot timeout is an error, not permission to load enhancements',async t=>{
  const h=await harness();t.after(h.close);await h.run('runtime-loader.js');await h.tick(12000);
  assert.equal(h.w.document.querySelector('#app').dataset.bootState,'ERROR');
  for(const o of h.observers)if(!o.disconnected)o.fn([]);
  await h.tick(16);await h.tick(16);
  assert.equal(h.clients,0,'error UI must not start optional Supabase modules');
  assert.ok(h.w.document.querySelector('#boot-retry'));
});

test('switching conversations owns one subscription and leaving chat removes it',async t=>{
  const h=await harness({session:{user:{id:'student-a'}},rows:{conversations:[{id:'a',type:'CLASS'},{id:'b',type:'DIRECT'}]}});t.after(h.close);
  await h.run('portal.js');h.w.document.querySelector('[data-nav="chat"]').click();await settle();
  assert.equal(h.channels.size,1);
  h.w.document.querySelector('[data-conv="b"]').click();await settle();
  assert.equal(h.channels.size,1,'previous conversation must be unsubscribed');
  h.w.document.querySelector('[data-nav="dashboard"]').click();await settle();
  assert.equal(h.channels.size,0);
});

test('late conversation response cannot erase a newer composer draft',async t=>{
  const requests=[];
  const h=await harness({session:{user:{id:'student-a'}},conversationRequest:()=>new Promise(resolve=>requests.push(resolve))});t.after(h.close);
  await h.run('portal.js');h.w.document.querySelector('[data-nav="chat"]').click();await settle();
  h.w.document.querySelector('#refresh').click();await settle();
  requests[1]({data:[{id:'a',type:'CLASS'}],error:null});await settle();
  h.w.document.querySelector('#compose [name="body"]').value='Keep draft';
  requests[0]({data:[{id:'a',type:'CLASS'}],error:null});await settle();
  assert.equal(h.w.document.querySelector('#compose [name="body"]').value,'Keep draft');
  assert.equal(h.channels.size,1);
});

test('admin navigation does not reopen itself after navigating home',async t=>{
  const h=await harness({session:{user:{id:'student-a'}},role:'SUPER_ADMIN'});t.after(h.close);
  await h.run('portal.js');await h.run('control-center.js');
  h.w.document.querySelector('[data-nav="superadmin"]').click();await settle();
  assert.ok(h.w.document.querySelector('.cc-shell'));
  h.w.document.querySelector('[data-nav="dashboard"]').click();await settle();
  for(const o of h.observers)if(!o.disconnected)o.fn([]);await h.tick(16);
  assert.equal(h.w.document.querySelector('.cc-shell'),null);
  assert.equal(h.w.document.querySelector('.sidebar .nav .active').dataset.nav,'dashboard');
});

test('admin profile failure renders a retry instead of an endless loading panel',async t=>{
  const h=await harness({session:{user:{id:'student-a'}},role:'SUPER_ADMIN'});t.after(h.close);
  await h.run('portal.js');await h.run('control-center.js');
  h.sb.rpc=async()=>({data:null,error:{message:'offline'}});
  h.w.document.querySelector('[data-nav="superadmin"]').click();await settle();
  assert.ok(h.w.document.querySelector('[data-cc-retry]'));
});

test('request deadline includes a stalled response body',async t=>{
  const h=await harness();t.after(h.close);h.w.Response=Response;
  h.w.fetch=async(_url,options)=>new Response(new ReadableStream({start(controller){options.signal.addEventListener('abort',()=>controller.error(new Error('deadline')))}}));
  await h.run('supabase-client.js');
  const request=h.clientOptions.global.fetch('https://portal.test/rest/v1/messages');
  const rejection=assert.rejects(request,/deadline/);
  await settle();await h.tick(10000);await rejection;
});
