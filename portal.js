import { mountChat, stopChat } from './chat-reliable.js?v=2';
import { setBootState, showBootError } from './boot-state.js';
import { sb } from './supabase-client.js';
import { toast } from './notifications-ui.js';
import { icon } from './icons.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const app=$('#app');
const st={session:null,profile:null,view:'dashboard',subjects:[],conv:null,channel:null,target:null};
const titles={dashboard:'Գլխավոր',schedule:'Դասացուցակ',homework:'Տնային աշխատանքներ',announcements:'Հայտարարություններ',events:'Միջոցառումներ',board:'Դասարանի տախտակ',chat:'Չատ',polls:'Հարցումներ',files:'Ֆայլեր',classmates:'Դասընկերներ',notifications:'Ծանուցումներ',profile:'Իմ պրոֆիլը',admin:'Admin',superadmin:'Super Admin'};
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=v=>v?new Intl.DateTimeFormat('hy-AM',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';
const initials=p=>`${p?.first_name?.[0]||''}${p?.last_name?.[0]||''}`||'Դ';
const roleName=r=>({STUDENT:'Աշակերտ',ADMIN:'Admin',SUPER_ADMIN:'Super Admin'}[r]||r);
const avatarUrls=new Map();
async function paintAvatars(){
  const nodes=$$('[data-avatar-path]');
  for(const node of nodes){
    const path=node.dataset.avatarPath;
    if(!path||node.querySelector('img'))continue;
    let url=avatarUrls.get(path);
    if(!url){const result=await sb.storage.from('avatars').createSignedUrl(path,3600);if(result.error)continue;url=result.data.signedUrl;avatarUrls.set(path,url)}
    if(node.isConnected){node.innerHTML=`<img src="${esc(url)}" alt="" loading="lazy">`;}
  }
}
const admin=()=>['ADMIN','SUPER_ADMIN'].includes(st.profile?.role), superAdmin=()=>st.profile?.role==='SUPER_ADMIN';
function theme(){const n=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=n;localStorage.setItem('portal-theme',n)}
document.documentElement.dataset.theme=localStorage.getItem('portal-theme')||'dark';
function busy(b,on){if(!b)return;if(on){b.dataset.t=b.textContent;b.disabled=true;b.textContent='Սպասեք…'}else{b.disabled=false;b.textContent=b.dataset.t||b.textContent}}
function pending(){try{return JSON.parse(localStorage.getItem('portal-pending')||'null')}catch{return null}}
function savePending(x){localStorage.setItem('portal-pending',JSON.stringify(x))} function clearPending(){localStorage.removeItem('portal-pending')}

let sessionRevision=0, identityJob=null, recovering=false, chatRevision=0;
async function boot(){
  setBootState('AUTH_CHECK');
  sb.auth.onAuthStateChange((event,session)=>{
    const changed=st.session?.user?.id!==session?.user?.id;
    if(event==='PASSWORD_RECOVERY')recovering=true;
    if(event==='SIGNED_OUT')recovering=false;
    st.session=session;
    if(changed||event==='SIGNED_OUT'||event==='PASSWORD_RECOVERY')sessionRevision++;
    const revision=sessionRevision;
    // Supabase invokes this callback under its auth lock. Never await RPC here.
    setTimeout(()=>{
      if(revision!==sessionRevision)return;
      if(!session){st.profile=null;st.subjects=[];st.conv=null;cleanup();closeModal();auth();}
      else if(recovering)resetPassword();
      else if(changed||!st.profile)identity().catch(showBootError);
      else if(event==='TOKEN_REFRESHED')identity(true).catch(showBootError);
    },0);
  });
  const revision=sessionRevision;
  const {data,error}=await sb.auth.getSession();
  if(revision!==sessionRevision)return;
  if(error)throw error;
  st.session=data.session;
  if(recovering&&st.session)resetPassword();else if(st.session)await identity();else auth();
}
async function identity(preserve=false){
  const revision=sessionRevision,userId=st.session?.user?.id;
  if(!userId)return auth();
  if(recovering)return resetPassword();
  if(identityJob?.revision===revision)return identityJob.promise;
  const current=()=>revision===sessionRevision&&st.session?.user?.id===userId;
  const job={revision};
  identityJob=job;
  job.promise=(async()=>{
    const {data,error}=await sb.rpc('get_my_profile');
    if(!current())return;
    if(error)return fatal();
    let next=Array.isArray(data)?data[0]:data;
    if(!next){
      const p=pending();
      if(p&&await claim(p)){
        if(!current())return;
        const result=await sb.rpc('get_my_profile');
        if(!current())return;
        if(result.error)return fatal();
        next=Array.isArray(result.data)?result.data[0]:result.data;
      }
      if(!next){st.profile=null;return completeProfile();}
    }
    if(!next.is_active){st.profile=null;cleanup();await sb.auth.signOut({scope:'local'});return blocked();}
    const unchanged=st.profile?.id===next.id&&st.profile?.role===next.role;
    st.profile=next;
    if(preserve&&unchanged&&app.querySelector('.portal'))return;
    const r=await sb.from('subjects').select('*').order('name');
    if(!current())return;
    if(r.error)return fatal();
    st.subjects=r.data||[];
    if(!items().some(([key])=>key===st.view))st.view='dashboard';
    portal();
  })().finally(()=>{if(identityJob===job)identityJob=null;});
  return job.promise;
}
window.addEventListener('focus',()=>{if(st.session&&st.profile)identity(true).catch(showBootError);});
setInterval(()=>{if(!document.hidden&&st.session&&st.profile)identity(true).catch(showBootError);},60000);
async function claim(p){if(!p?.first||!p?.last||!p?.username||!p?.invite)return false;const {data,error}=await sb.rpc('claim_class_profile',{p_first_name:p.first.trim(),p_last_name:p.last.trim(),p_username:p.username.trim(),p_invite_code:p.invite.trim()});if(error||data!==true)return false;clearPending();return true}

function auth(tab='login'){cleanup();app.innerHTML=`<div class="auth"><section class="hero"><div class="logo">Դ</div><h1>Մեր դասարանը՝ մեկ տեղում</h1><p>Փակ պորտալ՝ դասացուցակի, տնայինների, չատի, ֆայլերի, հայտարարությունների և հարցումների համար։</p><div class="hero-grid"><div><b>${icon('lock')} Փակ մուտք</b><br>Միայն մեր դասարանի անդամների համար</div><div><b>${icon('chat')} Արագ չատ</b><br>Դասարան և անձնական զրույցներ</div><div><b>${icon('study')} Դասեր</b><br>Դասացուցակ և տնայիններ</div><div><b>${icon('superadmin')} Անվտանգություն</b><br>Յուրաքանչյուրն ունի իր իրավունքները</div></div></section><section class="auth-side"><div class="auth-card"><div class="tabs"><button class="tab ${tab==='login'?'active':''}" data-tab="login">Մուտք</button><button class="tab ${tab==='register'?'active':''}" data-tab="register">Գրանցում</button></div><div id="auth-body"></div></div></section></div>`;$$('[data-tab]').forEach(b=>b.onclick=()=>auth(b.dataset.tab));tab==='login'?loginForm():registerForm();setBootState('LOGIN')}
function loginForm(){
  $('#auth-body').innerHTML=`<h2>Բարի վերադարձ</h2><p class="muted">Մուտք գործիր 9Ա դասարանի փակ պորտալ։</p><form id="login"><div class="field"><label for="login-email">Էլ. փոստ</label><input id="login-email" name="email" type="email" autocomplete="email" required></div><div class="field"><label for="login-password">Գաղտնաբառ</label><input id="login-password" name="password" type="password" autocomplete="current-password" required></div><button class="btn primary wide">Մուտք գործել</button></form><button id="forgot-password" class="btn wide" style="margin-top:9px">Մոռացե՞լ ես գաղտնաբառը</button><div class="divider">կամ</div><button id="glogin" class="btn wide">G · Google</button>`;
  $('#login').onsubmit=async e=>{
    e.preventDefault();const b=e.submitter,f=new FormData(e.currentTarget);busy(b,1);
    try{const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)toast('Մուտքը չհաջողվեց։ Ստուգիր էլ. փոստը և գաղտնաբառը։','err')}
    catch{toast('Կապը չի պատասխանել։ Փորձիր նորից։','err')}
    finally{busy(b,0)}
  };
  $('#glogin').onclick=()=>google(false);
  $('#forgot-password').onclick=recoverEmail;
}
function recoverEmail(){
  $('#auth-body').innerHTML=`<h2>Վերականգնել գաղտնաբառը</h2><form id="recover-email"><div class="field"><label for="recovery-email">Էլ. փոստ</label><input id="recovery-email" name="email" type="email" autocomplete="email" required></div><button class="btn primary wide">Ուղարկել վերականգնման հղումը</button></form><button id="back-login" class="btn wide" style="margin-top:9px">Վերադառնալ մուտքին</button>`;
  $('#back-login').onclick=loginForm;
  $('#recover-email').onsubmit=async e=>{
    e.preventDefault();const b=e.submitter,email=new FormData(e.currentTarget).get('email');busy(b,1);
    try{
      const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}${location.pathname}`});
      if(error)throw error;
      toast('Եթե այս հասցեով հաշիվ կա, վերականգնման հղումը կստանաս էլ. փոստով։','ok');
    }catch{toast('Հղումը չուղարկվեց։ Փորձիր մի փոքր ուշ։','err')}
    finally{busy(b,0)}
  };
}
function resetPassword(){
  cleanup();closeModal();
  if($('#reset-password'))return;
  app.innerHTML=`<div class="auth-side" style="min-height:100vh"><div class="auth-card"><h2>Նոր գաղտնաբառ</h2><form id="reset-password"><div class="field"><label for="new-password">Գաղտնաբառ</label><input id="new-password" name="password" type="password" minlength="8" autocomplete="new-password" required></div><div class="field"><label for="confirm-password">Կրկնիր գաղտնաբառը</label><input id="confirm-password" name="confirm" type="password" minlength="8" autocomplete="new-password" required></div><button class="btn primary wide">Պահպանել</button></form><button id="cancel-reset" class="btn wide" style="margin-top:9px">Չեղարկել</button></div></div>`;
  setBootState('LOGIN');
  $('#cancel-reset').onclick=()=>sb.auth.signOut({scope:'local'});
  $('#reset-password').onsubmit=async e=>{
    e.preventDefault();const b=e.submitter,f=new FormData(e.currentTarget);
    if(f.get('password')!==f.get('confirm'))return toast('Գաղտնաբառերը չեն համընկնում։','err');
    busy(b,1);
    try{
      const {error}=await sb.auth.updateUser({password:f.get('password')});if(error)throw error;
      recovering=false;await sb.auth.signOut({scope:'local'});auth();
      toast('Գաղտնաբառը փոխվեց։ Մուտք գործիր նոր գաղտնաբառով։','ok');
    }catch{toast('Գաղտնաբառը չփոխվեց։ Նոր հղում խնդրիր և փորձիր կրկին։','err')}
    finally{busy(b,0)}
  };
}
function registerForm(){$('#auth-body').innerHTML=`<h2>Գրանցվել դասարանում</h2><p class="muted">Գրանցումը հնարավոր է միայն գործող invite code-ով։</p><form id="reg"><div class="row2"><div class="field"><label>Անուն</label><input name="first" required></div><div class="field"><label>Ազգանուն</label><input name="last" required></div></div><div class="field"><label>Username</label><input name="username" pattern="[A-Za-z0-9_.-]+" minlength="3" required></div><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Գաղտնաբառ</label><input name="password" type="password" minlength="8" required></div><div class="field"><label>Invite code</label><input name="invite" minlength="8" required></div><button class="btn primary wide">Ստեղծել հաշիվ</button></form><div class="divider">կամ</div><button id="greg" class="btn wide">G · Գրանցվել Google-ով</button>`;$('#reg').onsubmit=register;$('#greg').onclick=()=>google(true)}
async function register(e){e.preventDefault();const b=e.submitter, f=new FormData(e.currentTarget), p={first:f.get('first'),last:f.get('last'),username:f.get('username'),invite:f.get('invite')};busy(b,1);const v=await sb.rpc('validate_class_invite',{p_code:p.invite});if(v.error||v.data!==true){busy(b,0);return toast('Invite code-ը սխալ է կամ այլևս չի գործում։','err')}savePending(p);const r=await sb.auth.signUp({email:f.get('email'),password:f.get('password'),options:{emailRedirectTo:`${location.origin}${location.pathname}`}});busy(b,0);if(r.error)return toast(r.error.message,'err');if(r.data.session)return;toast('Հաշիվը ստեղծվել է։ Եթե email հաստատումը միացված է՝ բացիր նամակը և վերադարձիր այստեղ։','ok');auth('login')}
async function google(reg){if(reg){const f=$('#reg');if(!f.reportValidity())return;const d=new FormData(f),p={first:d.get('first'),last:d.get('last'),username:d.get('username'),invite:d.get('invite')};const v=await sb.rpc('validate_class_invite',{p_code:p.invite});if(v.error||v.data!==true)return toast('Invite code-ը սխալ է։','err');savePending(p)}const r=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}${location.pathname}`}});if(r.error)toast('Google մուտքը դեռ կարգավորված չէ․ '+r.error.message,'err')}
function completeProfile(){cleanup();app.innerHTML=`<div class="auth-side" style="min-height:100vh"><div class="auth-card"><div class="logo">Դ</div><h2>Ավարտիր պրոֆիլը</h2><p class="muted">Auth հաշիվը կա, բայց դասարանի պրոֆիլը դեռ ակտիվացված չէ։</p><form id="complete"><div class="row2"><div class="field"><label>Անուն</label><input name="first" required></div><div class="field"><label>Ազգանուն</label><input name="last" required></div></div><div class="field"><label>Username</label><input name="username" required></div><div class="field"><label>Invite code</label><input name="invite" minlength="8" required></div><button class="btn primary wide">Ակտիվացնել</button></form><button id="out" class="btn wide" style="margin-top:9px">Դուրս գալ</button></div></div>`;$('#complete').onsubmit=async e=>{e.preventDefault();const b=e.submitter,d=new FormData(e.currentTarget);busy(b,1);const ok=await claim({first:d.get('first'),last:d.get('last'),username:d.get('username'),invite:d.get('invite')});busy(b,0);ok?identity():toast('Տվյալները կամ invite code-ը սխալ են։','err')};$('#out').onclick=()=>sb.auth.signOut();setBootState('LOGIN')}
function blocked(){app.innerHTML=`<div class="auth-side" style="min-height:100vh"><div class="auth-card"><h2>Հաշիվը արգելափակված է</h2><p class="muted">Դիմիր Super Admin-ին։</p><button id="out" class="btn wide">Դուրս գալ</button></div></div>`;$('#out').onclick=()=>sb.auth.signOut();setBootState('LOGIN')}
function fatal(){cleanup();st.profile=null;showBootError()}

function items(){const a=[['dashboard','Գլխավոր'],['schedule','Դասացուցակ'],['homework','Տնայիններ'],['announcements','Հայտարարություններ'],['events','Միջոցառումներ'],['board','Տախտակ'],['chat','Չատ'],['polls','Հարցումներ'],['files','Ֆայլեր'],['classmates','Դասընկերներ'],['notifications','Ծանուցումներ'],['profile','Պրոֆիլ']];if(admin())a.push(['admin','Admin']);if(superAdmin())a.push(['superadmin','Super Admin']);return a.map(([key,label])=>[key,icon(key),label])}
function portal(){
  const p=st.profile;
  app.innerHTML=`<div class="portal"><aside class="sidebar"><div class="brand"><div class="logo">Դ</div><div><b>Դասարան</b><div class="small muted">9Ա · Փակ պորտալ</div></div></div>
    <nav class="nav" aria-label="Հիմնական բաժիններ">${items().map(([key,glyph,label])=>`<button data-nav="${key}" class="${st.view===key?'active':''}" ${st.view===key?'aria-current="page"':''}>${glyph}<span>${label}</span></button>`).join('')}</nav>
    <div class="side-foot"><div class="user"><div class="avatar" data-avatar-path="${esc(p.avatar_path||'')}">${esc(initials(p))}</div><div><b>${esc(p.first_name)} ${esc(p.last_name)}</b><div class="small muted">${esc(roleName(p.role))}</div></div></div><button id="theme" class="btn">Թեմա</button><button id="logout" class="btn">Դուրս գալ</button></div></aside>
    <main class="main"><div class="top"><div><div class="small muted">Դասարանի փակ պորտալ</div><h1 id="vt">${esc(titles[st.view])}</h1></div><div class="actions"><button id="global-search" class="btn" type="button">${icon('search')} Փնտրել</button><button id="refresh" class="btn" type="button" aria-label="Թարմացնել">↻</button><button id="theme2" class="btn" type="button" aria-label="Փոխել թեման">${icon('appearance')}</button></div></div><section id="view"></section></main>
    <nav class="mobile" aria-label="Արագ բաժիններ">${[['dashboard','Գլխավոր'],['schedule','Դասեր'],['homework','Տնային'],['chat','Չատ'],['profile','Պրոֆիլ']].map(([key,label])=>`<button data-nav="${key}" class="${st.view===key?'active':''}"><span class="sn-icon">${icon(key)}</span>${label}</button>`).join('')}</nav></div>`;
  $$('[data-nav]').forEach(button=>button.onclick=()=>{st.target=null;st.view=button.dataset.nav;portal()});
  $('#logout').onclick=()=>sb.auth.signOut();
  $('#theme').onclick=theme;$('#theme2').onclick=theme;
  $('#refresh').onclick=renderView;
  renderView();setBootState('PORTAL');
  paintAvatars();
}
window.addEventListener('portal:open',event=>{
  const {view,conversationId,itemId,startsAt}=event.detail||{};
  if(!st.profile||!titles[view])return;
  if(conversationId)st.conv=conversationId;
  st.target=itemId?{view,id:itemId,startsAt}:null;
  st.view=view;portal();
});
async function renderView(){cleanup();$('#vt').textContent=titles[st.view]||'Դասարան';const v=$('#view');v.innerHTML='<div class="card">Բեռնվում է…</div>';const event=new CustomEvent('portal:render-view',{cancelable:true,detail:{view:st.view}});if(!window.dispatchEvent(event))return;try{const selected=st.target,fn=({dashboard,schedule,homework,announcements,events,board,chat,polls,files,classmates,notifications,profile,admin:adminView,superadmin:superView}[st.view]||dashboard);if(st.view==='events'&&selected?.startsAt){const date=new Date(selected.startsAt);await events(v,date.getFullYear(),date.getMonth(),date.getDate())}else await fn(v);if(selected?.id&&st.view!=='chat'){const id=CSS.escape(selected.id),item=v.querySelector(`[data-item-id="${id}"],[data-id="${id}"]`);if(item){item.scrollIntoView({behavior:'smooth',block:'center'});item.classList.add('search-hit')}}st.target=null}catch(e){v.innerHTML=`<div class="card"><h3>Չհաջողվեց բեռնել</h3><p class="muted">${esc(e.message||e)}</p></div>`}}

async function dashboard(v){
  const now=new Date(),today=now.getDay();
  const [lessons,homework,announcements,events,notifications]=await Promise.all([
    sb.from('schedule_entries').select('lesson_number,start_time,end_time,room,subject:subjects(name)').eq('weekday',today).order('lesson_number'),
    sb.from('homework').select('id,title,due_at,subject:subjects(name,short_name)').is('deleted_at',null).gte('due_at',now.toISOString()).order('due_at').limit(4),
    sb.from('announcements').select('id,title,body,is_pinned,is_important').is('deleted_at',null).order('is_pinned',{ascending:false}).order('created_at',{ascending:false}).limit(3),
    sb.from('events').select('id,title,starts_at').is('deleted_at',null).gte('starts_at',now.toISOString()).order('starts_at').limit(2),
    sb.from('notifications').select('id,kind').is('read_at',null).limit(100)
  ]);
  const rows=lessons.data||[],tasks=homework.data||[],news=announcements.data||[],upcoming=events.data||[];
  const unread=(notifications.data||[]).filter(x=>x.kind==='MESSAGE').length;
  v.innerHTML=`<div class="dashboard-intro"><div><span class="small muted">9Ա · Այսօր</span><h2>Բարի օր, ${esc(st.profile.first_name)}</h2><p class="muted">Օրվա կարևոր տեղեկությունները մեկ տեղում են։</p></div><span class="dashboard-date">${new Intl.DateTimeFormat('hy-AM',{weekday:'long',day:'numeric',month:'long'}).format(now)}</span></div>
  <div class="dashboard-actions"><button class="btn" data-dash="schedule">Դասացուցակ</button><button class="btn" data-dash="homework">Տնայիններ${tasks.length?` · ${tasks.length}`:''}</button><button class="btn" data-dash="chat">Չատ${unread?` · ${unread}`:''}</button><button class="btn" data-dash="notifications">Ծանուցումներ</button></div>
  <div class="dashboard-grid"><section class="card"><div class="dashboard-section-head"><h3>Այսօրվա դասերը</h3><button class="btn" data-dash="schedule">Բոլորը</button></div>${rows.length?`<div class="list">${rows.map(x=>`<div class="item"><div><b>${x.lesson_number}. ${esc(x.subject?.name||'Առարկա')}</b><div class="small muted">${esc(String(x.start_time||'').slice(0,5))}–${esc(String(x.end_time||'').slice(0,5))}${x.room?` · ${esc(x.room)}`:''}</div></div></div>`).join('')}</div>`:'<div class="empty">Այսօր դասեր նշված չեն</div>'}</section>
  <section class="card"><div class="dashboard-section-head"><h3>Մոտակա տնայինները</h3><button class="btn" data-dash="homework">Բոլորը</button></div>${hwList(tasks)}</section>
  <section class="card"><div class="dashboard-section-head"><h3>Կարևոր հայտարարություններ</h3><button class="btn" data-dash="announcements">Բոլորը</button></div>${news.length?`<div class="list">${news.map(x=>`<div class="item"><div><b>${esc(x.title)}</b><div class="small muted">${esc(x.body||'').slice(0,110)}</div></div>${x.is_important?'<span class="badge warn">Կարևոր</span>':''}</div>`).join('')}</div>`:'<div class="empty">Հայտարարություններ չկան</div>'}</section>
  <section class="card"><div class="dashboard-section-head"><h3>Առաջիկա իրադարձությունները</h3><button class="btn" data-dash="events">Բոլորը</button></div>${upcoming.length?`<div class="list">${upcoming.map(x=>`<div class="item"><div><b>${esc(x.title)}</b><div class="small muted">${fmt(x.starts_at)}</div></div></div>`).join('')}</div>`:'<div class="empty">Իրադարձություններ չկան</div>'}</section></div>`;
  v.querySelectorAll('[data-dash]').forEach(button=>button.onclick=()=>document.querySelector(`.sidebar .nav [data-nav="${button.dataset.dash}"]`)?.click());
}
async function events(v,year=new Date().getFullYear(),month=new Date().getMonth(),selectedDay=0){
  const result=await sb.from('events').select('id,title,description,starts_at,ends_at,location').is('deleted_at',null).order('starts_at',{ascending:true});
  if(result.error)throw result.error;
  const rows=(result.data||[]).filter(row=>{const date=new Date(row.starts_at);return date.getFullYear()===year&&date.getMonth()===month});
  const countByDay=new Map();for(const row of rows){const day=new Date(row.starts_at).getDate();countByDay.set(day,(countByDay.get(day)||0)+1)}
  const offset=(new Date(year,month,1).getDay()+6)%7,days=new Date(year,month+1,0).getDate();
  const visible=selectedDay?rows.filter(row=>new Date(row.starts_at).getDate()===selectedDay):rows;
  v.innerHTML=`<section class="card calendar"><div class="calendar-head"><h3>${esc(new Intl.DateTimeFormat('hy-AM',{month:'long',year:'numeric'}).format(new Date(year,month,1)))}</h3><div><button type="button" class="btn" data-month-step="-1" aria-label="Նախորդ ամիս">←</button><button type="button" class="btn" data-month-step="1" aria-label="Հաջորդ ամիս">→</button></div></div><div class="calendar-grid">${['Երկ','Երք','Չոր','Հնգ','Ուրբ','Շբթ','Կիր'].map(label=>`<span class="calendar-weekday">${label}</span>`).join('')}${Array.from({length:offset},()=>'<span></span>').join('')}${Array.from({length:days},(_,index)=>{const day=index+1,count=countByDay.get(day)||0;return `<button type="button" class="calendar-day ${selectedDay===day?'active':''}" data-event-day="${day}" aria-label="${day}, ${count} միջոցառում" aria-pressed="${selectedDay===day}">${day}${count?'<i></i>':''}</button>`}).join('')}</div></section><div class="calendar-list-head"><h3>${selectedDay?`${selectedDay} · `:''}Միջոցառումներ</h3>${selectedDay?'<button type="button" class="btn" id="show-month-events">Ամբողջ ամիսը</button>':''}</div><div class="event-list">${visible.map(x=>`<article class="card event-card" data-item-id="${x.id}"><time class="small muted">${fmt(x.starts_at)}</time><h3>${esc(x.title)}</h3>${x.description?`<p>${esc(x.description)}</p>`:''}${x.location?`<span class="small muted">${esc(x.location)}</span>`:''}</article>`).join('')||'<div class="empty">Այս ամսում միջոցառումներ չկան</div>'}</div>`;
  v.querySelectorAll('[data-month-step]').forEach(button=>button.onclick=()=>{const next=new Date(year,month+Number(button.dataset.monthStep),1);events(v,next.getFullYear(),next.getMonth())});
  v.querySelectorAll('[data-event-day]').forEach(button=>button.onclick=()=>events(v,year,month,Number(button.dataset.eventDay)===selectedDay?0:Number(button.dataset.eventDay)));
  v.querySelector('#show-month-events')?.addEventListener('click',()=>events(v,year,month));
}
const hwList=a=>a.length?`<div class="list">${a.map(x=>`<div class="item"><div><div class="title">${esc(x.title)}</div><div class="small muted">${esc(x.subject?.name||'Առարկա')} · ${fmt(x.due_at)}</div></div><span class="badge">${esc(x.subject?.short_name||'ԴԶ')}</span></div>`).join('')}</div>`:'<div class="empty">Մոտակա տնային չկա</div>';
async function schedule(v){const r=await sb.from('schedule_entries').select('*,subject:subjects(id,name,short_name)').order('weekday').order('lesson_number');if(r.error)throw r.error;const d=['','Երկուշաբթի','Երեքշաբթի','Չորեքշաբթի','Հինգշաբթի','Ուրբաթ'];v.innerHTML=`<div class="grid g2">${[1,2,3,4,5].map(i=>`<div class="card"><h3>${d[i]}</h3><div class="list">${r.data.filter(x=>x.weekday===i).map(x=>`<div class="item" data-item-id="${x.subject_id}"><div><div class="title">${x.lesson_number}. ${esc(x.subject?.name||'Առարկա')}</div><div class="small muted">${esc(x.start_time||'')}–${esc(x.end_time||'')} ${x.room?'· '+esc(x.room):''}</div></div></div>`).join('')||'<div class="empty">Դասեր նշված չեն</div>'}</div></div>`).join('')}</div>`}
async function homework(v,selected='all'){
  const [tasksResult,completionResult]=await Promise.all([
    sb.from('homework').select('id,title,description,due_at,resource_url,file_id,subject:subjects(name,short_name)').is('deleted_at',null).order('due_at'),
    sb.from('homework_completion').select('homework_id').eq('student_id',st.profile.id)
  ]);
  if(tasksResult.error)throw tasksResult.error;
  const done=new Set((completionResult.data||[]).map(row=>row.homework_id));
  const now=Date.now();
  const tasks=(tasksResult.data||[]).map(row=>({...row,state:done.has(row.id)?'completed':new Date(row.due_at).getTime()<now?'overdue':'upcoming'}));
  const labels={all:'Բոլորը',upcoming:'Առաջիկա',overdue:'Ուշացած',completed:'Ավարտված'};
  const visible=selected==='all'?tasks:tasks.filter(task=>task.state===selected);
  v.innerHTML=`<div class="filter-tabs" role="group" aria-label="Տնայինների զտիչ">${Object.entries(labels).map(([key,label])=>`<button type="button" class="btn ${selected===key?'active':''}" data-homework-filter="${key}" aria-pressed="${selected===key}">${label}</button>`).join('')}</div><div class="homework-list">${visible.map(task=>`<article class="card homework-card"><div class="section-actions"><span class="badge">${esc(task.subject?.name||'Առարկա')}</span><span class="badge ${task.state==='completed'?'good':task.state==='overdue'?'warn':''}">${{completed:'Ավարտված',overdue:'Ուշացած',upcoming:'Առաջիկա'}[task.state]}</span></div><h3>${esc(task.title)}</h3>${task.description?`<p class="muted">${esc(task.description)}</p>`:''}<div class="small muted">Վերջնաժամկետ՝ ${fmt(task.due_at)}</div><div class="homework-actions">${/^https:\/\/[^\s]+$/i.test(task.resource_url||'')?`<a class="btn" href="${esc(task.resource_url)}" target="_blank" rel="noopener noreferrer">Բացել հղումը</a>`:''}${task.file_id?`<button type="button" class="btn" data-hw-file="${task.file_id}">Բացել ֆայլը</button>`:''}<button class="btn ${done.has(task.id)?'':'primary'}" data-hw="${task.id}" data-done="${done.has(task.id)}">${done.has(task.id)?'Չեղարկել':'Նշել արված'}</button></div></article>`).join('')||'<div class="empty">Այս բաժնում տնային աշխատանք չկա</div>'}</div>`;
  v.querySelectorAll('.homework-card').forEach((card,index)=>card.dataset.itemId=visible[index].id);
  v.querySelectorAll('[data-homework-filter]').forEach(button=>button.onclick=()=>homework(v,button.dataset.homeworkFilter));
  v.querySelectorAll('[data-hw-file]').forEach(button=>button.onclick=async()=>{
    const preview=window.open('about:blank','_blank');
    if(preview)preview.opener=null;
    button.disabled=true;
    const file=await sb.from('class_files').select('storage_path').eq('id',button.dataset.hwFile).is('deleted_at',null).maybeSingle();
    if(file.error||!file.data){button.disabled=false;preview?.close();return toast('Ֆայլը հասանելի չէ','err')}
    const link=await sb.storage.from('class-files').createSignedUrl(file.data.storage_path,120);
    button.disabled=false;
    if(link.error){preview?.close();return toast('Ֆայլը չբացվեց','err')}
    preview?preview.location.replace(link.data.signedUrl):location.assign(link.data.signedUrl);
  });
  v.querySelectorAll('[data-hw]').forEach(button=>button.onclick=async()=>{
    busy(button,true);
    const result=button.dataset.done==='true'?
      await sb.from('homework_completion').delete().eq('homework_id',button.dataset.hw).eq('student_id',st.profile.id):
      await sb.from('homework_completion').insert({homework_id:button.dataset.hw,student_id:st.profile.id,completed_at:new Date().toISOString()});
    if(result.error){busy(button,false);toast('Կարգավիճակը չպահպանվեց։','err');return}
    homework(v,selected);
  });
}
async function announcements(v){const r=await sb.from('announcements').select('*,author:profiles(first_name,last_name)').is('deleted_at',null).order('is_pinned',{ascending:false}).order('created_at',{ascending:false});if(r.error)throw r.error;v.innerHTML=`<div class="list">${(r.data||[]).map(x=>`<article class="card" data-item-id="${x.id}"><div class="section-actions">${x.is_pinned?'<span class="badge">Ամրացված</span>':''}${x.is_important?'<span class="badge warn">Կարևոր</span>':''}</div><h3>${esc(x.title)}</h3><p>${esc(x.body).replace(/\n/g,'<br>')}</p><div class="small muted">${esc(x.author?.first_name||'')} ${esc(x.author?.last_name||'')} · ${fmt(x.created_at)}</div></article>`).join('')||'<div class="empty">Հայտարարություններ չկան</div>'}</div>`}
async function board(v){const r=await sb.from('board_posts').select('*,author:profiles(first_name,last_name,username)').is('deleted_at',null).order('created_at',{ascending:false});if(r.error)throw r.error;v.innerHTML=`<div class="section-actions">${admin()?'<button id="post" class="btn primary">＋ Նոր գրառում</button>':''}</div><div class="grid g2">${(r.data||[]).map(x=>`<article class="card" data-item-id="${x.id}"><div class="small muted">${esc(x.author?.first_name||'')} ${esc(x.author?.last_name||'')} · ${fmt(x.created_at)}</div><h3>${esc(x.title)}</h3><p>${esc(x.body||'').replace(/\n/g,'<br>')}</p></article>`).join('')||'<div class="empty">Տախտակը դատարկ է</div>'}</div>`;if(admin())$('#post').onclick=()=>modal('Նոր գրառում',`<form id="pf"><div class="field"><label>Վերնագիր</label><input name="title" required></div><div class="field"><label>Տեքստ</label><textarea name="body" required></textarea></div><button class="btn primary wide">Հրապարակել</button></form>`,()=>{$('#pf').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),r=await sb.from('board_posts').insert({title:f.get('title'),body:f.get('body'),author_id:st.profile.id});if(r.error)return toast(r.error.message,'err');closeModal();board(v)}})}
async function chat(v){cleanup();const revision=chatRevision;const [r,unreadResult]=await Promise.all([sb.from('conversations').select('*').order('updated_at',{ascending:false}),sb.from('notifications').select('href').eq('kind','MESSAGE').eq('user_id',st.profile.id).is('read_at',null).limit(500)]);if(revision!==chatRevision||!v.isConnected||st.view!=='chat')return;if(r.error)throw r.error;const list=r.data||[],unread=new Map();for(const note of unreadResult.data||[]){const id=String(note.href||'').match(/conversation=([a-f0-9-]{36})/i)?.[1];if(id)unread.set(id,(unread.get(id)||0)+1)}st.conv=list.find(x=>x.id===st.conv)?.id||list.find(x=>x.type==='CLASS')?.id||list[0]?.id||null;v.innerHTML=`<div class="chat"><aside class="chat-list"><div class="section-actions"><b>Զրույցներ</b><button id="direct" class="btn" aria-label="Նոր զրույց">＋</button></div>${list.map(x=>`<button type="button" class="conv ${x.id===st.conv?'active':''}" data-conv="${x.id}"><b>${x.type==='CLASS'?'Դասարանի չատ':x.type==='DIRECT'?'Անձնական':esc(x.title||'Խումբ')}</b>${unread.get(x.id)?`<span class="badge">${unread.get(x.id)}</span>`:''}</button>`).join('')||'<div class="empty">Չատ չկա</div>'}</aside><section class="chat-room"><div id="messages" class="messages"></div><form id="compose" class="compose"><input name="body" placeholder="Հաղորդագրություն…" ${st.conv?'':'disabled'}><button class="btn primary" ${st.conv?'':'disabled'}>Ուղարկել</button></form></section></div>`;$$('[data-conv]').forEach(x=>x.onclick=()=>{st.conv=x.dataset.conv;chat(v)});$('#direct').onclick=()=>direct(v);if(st.conv)mountChat(st.conv,st.profile.id,st.profile.role,st.target?.view==='chat'?st.target.id:null)}
async function direct(v){const r=await sb.from('profiles').select('id,first_name,last_name,username').eq('is_active',true).neq('id',st.profile.id).order('first_name');modal('Նոր անձնական զրույց',`<div class="list">${(r.data||[]).map(p=>`<button class="btn" data-user="${p.id}">${esc(p.first_name)} ${esc(p.last_name)} · @${esc(p.username)}</button>`).join('')||'<div class="empty">Մյուս օգտատերեր չկան</div>'}</div>`,()=>{$$('[data-user]').forEach(b=>b.onclick=async()=>{const r=await sb.rpc('create_direct_conversation',{p_other_user:b.dataset.user});if(r.error||!r.data)return toast('Չհաջողվեց ստեղծել զրույցը','err');st.conv=r.data;closeModal();chat(v)})})}
async function polls(v){
  const result=await sb.from('polls').select('*,options:poll_options(*)').is('deleted_at',null).order('created_at',{ascending:false});
  if(result.error)throw result.error;
  const list=result.data||[];
  v.innerHTML=`<div class="poll-grid">${list.map(p=>{const closed=p.closes_at&&new Date(p.closes_at)<new Date();return `<form class="card poll" data-id="${p.id}"><div class="section-actions"><span class="badge">${p.choice_mode==='SINGLE'?'Մեկ ընտրություն':'Մի քանի ընտրություն'}</span>${closed?'<span class="badge warn">Փակված</span>':''}</div><h3>${esc(p.question)}</h3><div class="poll-options">${(p.options||[]).sort((a,b)=>a.position-b.position).map(option=>`<label><input type="${p.choice_mode==='SINGLE'?'radio':'checkbox'}" name="o" value="${option.id}"><span>${esc(option.label)}</span></label>`).join('')}</div><div class="poll-actions">${closed?'':`<button class="btn primary">Քվեարկել</button>`}<button type="button" class="btn" data-results="${p.id}">Արդյունքներ</button>${admin()&&!closed?`<button type="button" class="btn bad" data-close-poll="${p.id}">Փակել</button>`:''}</div><div id="r-${p.id}" class="poll-results"></div></form>`}).join('')||'<div class="empty">Հարցումներ չկան</div>'}</div>`;
  v.querySelectorAll('.poll').forEach(form=>form.dataset.itemId=form.dataset.id);
  v.querySelectorAll('.poll').forEach(form=>form.onsubmit=async event=>{
    event.preventDefault();
    const ids=[...form.querySelectorAll('input:checked')].map(input=>input.value);
    if(!ids.length)return toast('Ընտրիր տարբերակ','err');
    const response=await sb.rpc('submit_poll_vote',{p_poll_id:form.dataset.id,p_option_ids:ids});
    if(response.error||!response.data)return toast('Քվեարկությունը չհաջողվեց','err');
    toast('Ձայնը գրանցվել է','ok');form.querySelector('[data-results]')?.click();
  });
  v.querySelectorAll('[data-results]').forEach(button=>button.onclick=async()=>{
    const response=await sb.rpc('get_poll_results',{p_poll_id:button.dataset.results});
    const host=v.querySelector(`#r-${button.dataset.results}`);
    if(!host)return;
    if(response.error){host.textContent='Արդյունքները դեռ հասանելի չեն։';return}
    const counts=response.data||[],total=counts.reduce((sum,row)=>sum+Number(row.vote_count||0),0);
    const poll=list.find(item=>item.id===button.dataset.results);
    const labels=new Map((poll?.options||[]).map(option=>[option.id,option.label]));
    host.innerHTML=`<p class="small muted">Ընդհանուր ընտրություններ՝ ${total}</p>${counts.map(row=>{const count=Number(row.vote_count||0),percent=total?Math.round(count/total*100):0;return `<div class="poll-result"><div><span>${esc(labels.get(row.option_id)||'Տարբերակ')}</span><b>${percent}%</b></div><div class="poll-bar"><span style="width:${percent}%"></span></div></div>`}).join('')}`;
  });
  v.querySelectorAll('[data-close-poll]').forEach(button=>button.onclick=async()=>{
    if(!confirm('Փակե՞լ այս հարցումը։'))return;
    button.disabled=true;
    const response=await sb.from('polls').update({closes_at:new Date().toISOString()}).eq('id',button.dataset.closePoll);
    response.error?(button.disabled=false,toast('Հարցումը չփակվեց','err')):polls(v);
  });
}
async function files(v){
  const result=await sb.from('class_files').select('id,title,original_name,storage_path,mime_type,size_bytes,created_at,subject:subjects(name)').is('deleted_at',null).order('created_at',{ascending:false});
  if(result.error)throw result.error;
  const rows=result.data||[];
  const subjects=[...new Set(rows.map(row=>row.subject?.name||'Ընդհանուր'))].sort();
  v.innerHTML=`<div class="file-toolbar"><input id="file-search" type="search" aria-label="Փնտրել ֆայլեր" placeholder="Փնտրել ֆայլեր…"><select id="file-subject" aria-label="Առարկայի զտիչ"><option value="">Բոլոր առարկաները</option>${subjects.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('')}</select>${admin()?'<button id="upload" class="btn primary">Վերբեռնել</button>':''}</div><div class="file-list">${rows.map(row=>{const subject=row.subject?.name||'Ընդհանուր',size=row.size_bytes?`${(Number(row.size_bytes)/1024/1024).toFixed(1)} ՄԲ`:'—';const preview=/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(row.mime_type||'');return `<article class="card file-row" data-file-search="${esc(`${row.title} ${row.original_name} ${subject}`.toLocaleLowerCase())}" data-file-subject="${esc(subject)}"><div class="file-mark">${row.mime_type==='application/pdf'?'PDF':'FILE'}</div><div class="file-info"><b>${esc(row.title)}</b><small>${esc(subject)} · ${esc(row.original_name)} · ${size} · ${fmt(row.created_at)}</small></div><button class="btn" data-file="${esc(row.storage_path)}">${preview?'Դիտել':'Բացել'}</button></article>`}).join('')||'<div class="empty">Ֆայլեր չկան</div>'}</div>`;
  v.querySelectorAll('.file-row').forEach((card,index)=>card.dataset.itemId=rows[index].id);
  const filter=()=>{const term=$('#file-search')?.value.trim().toLocaleLowerCase()||'',subject=$('#file-subject')?.value||'';v.querySelectorAll('.file-row').forEach(row=>row.hidden=!!((term&&!row.dataset.fileSearch.includes(term))||(subject&&row.dataset.fileSubject!==subject)))};
  $('#file-search').oninput=filter;$('#file-subject').onchange=filter;
  v.querySelectorAll('[data-file]').forEach(button=>button.onclick=async()=>{const preview=window.open('about:blank','_blank');if(preview)preview.opener=null;button.disabled=true;const response=await sb.storage.from('class-files').createSignedUrl(button.dataset.file,120);button.disabled=false;if(response.error){preview?.close();return toast('Ֆայլը չբացվեց։','err')}preview?preview.location.replace(response.data.signedUrl):location.assign(response.data.signedUrl)});
  if(admin())$('#upload').onclick=()=>upload(v);
}
function upload(v){if(!admin())return;modal('Վերբեռնել ֆայլ',`<form id="uf"><div class="field"><label>Վերնագիր</label><input name="title" required></div><div class="field"><label>Առարկա</label><select name="subject"><option value="">Ընդհանուր</option>${st.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Ֆայլ</label><input name="file" type="file" required></div><button class="btn primary wide">Վերբեռնել</button></form>`,()=>{$('#uf').onsubmit=async e=>{e.preventDefault();const b=e.submitter,f=new FormData(e.currentTarget),file=f.get('file'),safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),path=`${st.profile.id}/${crypto.randomUUID()}-${safe}`,mime=file.type||'application/octet-stream';busy(b,1);let r=await sb.storage.from('class-files').upload(path,file,{contentType:mime});if(!r.error){r=await sb.from('class_files').insert({title:f.get('title'),description:'',subject_id:f.get('subject')||null,storage_path:path,original_name:file.name,mime_type:mime,size_bytes:file.size,uploader_id:st.profile.id});if(r.error)await sb.storage.from('class-files').remove([path])}busy(b,0);if(r.error)return toast(r.error.message,'err');closeModal();files(v)}})}
async function classmates(v){const r=await sb.from('profiles').select('id,first_name,last_name,username,role,bio,avatar_path').eq('is_active',true).order('first_name');if(r.error)throw r.error;v.innerHTML=`<div class="grid g3">${(r.data||[]).map(p=>`<div class="card" data-item-id="${p.id}"><div class="user"><div class="avatar" data-avatar-path="${esc(p.avatar_path||'')}">${esc(initials(p))}</div><div><h3 style="margin:0">${esc(p.first_name)} ${esc(p.last_name)}</h3><div class="small muted">@${esc(p.username)}</div></div></div><p class="muted">${esc(p.bio||'')}</p><span class="badge">${esc(roleName(p.role))}</span></div>`).join('')}</div>`;paintAvatars()}
async function notifications(v){const r=await sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(100);if(r.error)throw r.error;v.innerHTML=`<div class="section-actions"><button id="readall" class="btn">Բոլորը կարդացված</button></div><div class="list">${(r.data||[]).map(n=>`<div class="item"><div><div class="title">${n.read_at?'':'● '}${esc(n.title)}</div><div class="small muted">${esc(n.body||'')} · ${fmt(n.created_at)}</div></div></div>`).join('')||'<div class="empty">Ծանուցումներ չկան</div>'}</div>`;$('#readall').onclick=async()=>{await sb.from('notifications').update({read_at:new Date().toISOString()}).eq('user_id',st.profile.id).is('read_at',null);notifications(v)}}
async function profile(v){
  const p=st.profile;
  v.innerHTML=`<div class="profile-layout"><section class="card profile-summary"><div class="user"><div class="avatar profile-avatar" data-avatar-path="${esc(p.avatar_path||'')}">${esc(initials(p))}</div><div><h2>${esc(p.first_name)} ${esc(p.last_name)}</h2><div class="muted">@${esc(p.username)}</div><span class="badge">${esc(roleName(p.role))}</span></div></div><label class="profile-upload">Լուսանկար<input id="avatar-file" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG կամ WebP · մինչև 5 ՄԲ</small></label></section>
    <section class="card"><h3>Խմբագրել պրոֆիլը</h3><form id="pr"><div class="row2"><div class="field"><label>Անուն</label><input name="first" value="${esc(p.first_name)}" required></div><div class="field"><label>Ազգանուն</label><input name="last" value="${esc(p.last_name)}" required></div></div><div class="field"><label>Username</label><input name="username" value="${esc(p.username)}" required></div><div class="field"><label>Իմ մասին</label><textarea name="bio">${esc(p.bio||'')}</textarea></div><button class="btn primary">Պահպանել</button></form></section></div>`;
  paintAvatars();
  $('#avatar-file').onchange=async event=>{
    const file=event.target.files?.[0];
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){toast('Ընտրիր JPG, PNG կամ WebP՝ մինչև 5 ՄԲ։','err');event.target.value='';return}
    event.target.disabled=true;
    const extension={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"}[file.type];
    const path=`${p.id}/${crypto.randomUUID()}.${extension}`;
    const upload=await sb.storage.from('avatars').upload(path,file,{contentType:file.type});
    if(upload.error){event.target.disabled=false;toast('Լուսանկարը չվերբեռնվեց։','err');return}
    const update=await sb.from('profiles').update({avatar_path:path}).eq('id',p.id);
    event.target.disabled=false;
    if(update.error){await sb.storage.from('avatars').remove([path]);toast('Լուսանկարը չպահպանվեց պրոֆիլում։','err');return}
    st.profile.avatar_path=path;
    const sidebar=$('.sidebar .avatar');if(sidebar){sidebar.dataset.avatarPath=path;sidebar.textContent=initials(p)}
    toast('Լուսանկարը պահպանվեց։','ok');profile(v);paintAvatars();
  };
  $('#pr').onsubmit=async event=>{
    event.preventDefault();
    const form=new FormData(event.currentTarget),button=event.submitter;
    busy(button,true);
    const result=await sb.from('profiles').update({first_name:form.get('first'),last_name:form.get('last'),username:form.get('username'),bio:form.get('bio')||null}).eq('id',p.id);
    busy(button,false);
    result.error?toast(result.error.message,'err'):(toast('Պահպանվեց','ok'),identity());
  };
}
async function adminView(v){if(!admin())return v.innerHTML='<div class="empty">Մուտքը թույլատրված չէ</div>';v.innerHTML=`<div class="grid g2"><div class="card"><h3>Նոր հայտարարություն</h3><form id="af"><div class="field"><label>Վերնագիր</label><input name="title" required></div><div class="field"><label>Տեքստ</label><textarea name="body" required></textarea></div><label><input style="width:auto" type="checkbox" name="important"> Կարևոր</label><br><label><input style="width:auto" type="checkbox" name="pinned"> Ամրացված</label><br><br><button class="btn primary">Հրապարակել</button></form></div><div class="card"><h3>Նոր տնային</h3><form id="hf"><div class="field"><label>Առարկա</label><select name="subject">${st.subjects.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>Վերնագիր</label><input name="title" required></div><div class="field"><label>Նկարագրություն</label><textarea name="description"></textarea></div><div class="field"><label>Վերջնաժամկետ</label><input name="due" type="datetime-local" required></div><button class="btn primary">Ավելացնել</button></form></div></div>`;$('#af').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),r=await sb.from('announcements').insert({title:f.get('title'),body:f.get('body'),is_important:f.get('important')==='on',is_pinned:f.get('pinned')==='on',author_id:st.profile.id});r.error?toast(r.error.message,'err'):(e.currentTarget.reset(),toast('Հրապարակվեց','ok'))};$('#hf').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),r=await sb.from('homework').insert({subject_id:f.get('subject'),title:f.get('title'),description:f.get('description')||null,due_at:new Date(f.get('due')).toISOString(),created_by:st.profile.id});r.error?toast(r.error.message,'err'):(e.currentTarget.reset(),toast('Ավելացվեց','ok'))}}
async function superView(v){if(!superAdmin())return v.innerHTML='<div class="empty">Միայն Super Admin</div>';const r=await sb.from('profiles').select('id,first_name,last_name,username,role,is_active').order('first_name');if(r.error)throw r.error;v.innerHTML=`<div class="card"><div class="section-actions"><button id="invite" class="btn primary">Փոխել invite code</button></div><div class="table"><table><thead><tr><th>Անուն</th><th>Username</th><th>Role</th><th>Կարգավիճակ</th><th></th></tr></thead><tbody>${(r.data||[]).map(p=>`<tr><td>${esc(p.first_name)} ${esc(p.last_name)}</td><td>@${esc(p.username)}</td><td><select data-role="${p.id}" ${p.id===st.profile.id?'disabled':''}><option ${p.role==='STUDENT'?'selected':''}>STUDENT</option><option ${p.role==='ADMIN'?'selected':''}>ADMIN</option><option ${p.role==='SUPER_ADMIN'?'selected':''}>SUPER_ADMIN</option></select></td><td>${p.is_active?'<span class="badge good">Ակտիվ</span>':'<span class="badge warn">Արգելափակված</span>'}</td><td><button class="btn ${p.is_active?'bad':'good'}" data-active="${p.id}" data-state="${p.is_active}" ${p.id===st.profile.id?'disabled':''}>${p.is_active?'Արգելափակել':'Ակտիվացնել'}</button></td></tr>`).join('')}</tbody></table></div></div>`;$$('[data-role]').forEach(x=>x.onchange=async()=>{const r=await sb.rpc('super_admin_set_user_role',{p_user_id:x.dataset.role,p_role:x.value});r.error||!r.data?toast('Role-ը չփոխվեց','err'):toast('Role-ը փոխվեց','ok')});$$('[data-active]').forEach(x=>x.onclick=async()=>{const r=await sb.rpc('super_admin_set_user_active',{p_user_id:x.dataset.active,p_active:x.dataset.state!=='true'});r.error||!r.data?toast('Կարգավիճակը չփոխվեց','err'):superView(v)});$('#invite').onclick=()=>modal('Նոր invite code',`<form id="if"><div class="field"><label>Նոր կոդ</label><input name="code" minlength="8" required></div><button class="btn primary wide">Պահպանել</button></form>`,()=>{$('#if').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),r=await sb.rpc('rotate_class_invite',{p_new_code:f.get('code')});r.error||!r.data?toast('Չհաջողվեց','err'):(closeModal(),toast('Invite code-ը փոխվեց','ok'))}})}
function modal(t,h,ready){closeModal();const e=document.createElement('div');e.className='modal-wrap';e.id='modal';e.innerHTML=`<div class="modal"><div class="top"><h2>${esc(t)}</h2><button id="x" class="btn">✕</button></div>${h}</div>`;document.body.append(e);$('#x').onclick=closeModal;e.onclick=x=>{if(x.target===e)closeModal()};ready?.()} function closeModal(){$('#modal')?.remove()} function cleanup(){chatRevision++;stopChat();if(st.channel){sb.removeChannel(st.channel);st.channel=null}}
boot().catch(e=>fatal('Պորտալը չի գործարկվում',e.message||String(e)));
