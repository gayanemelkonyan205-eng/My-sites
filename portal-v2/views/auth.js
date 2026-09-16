import { sb } from '../lib/supabase.js';
import { el,esc,toast } from '../lib/dom.js';

const redirectTo=()=>`${location.origin}${location.pathname}`;

export function renderAuth(){
  const root=el(`<main class="auth-shell">
    <section class="auth-visual">
      <div class="auth-orb a"></div>
      <div style="position:relative;z-index:1">
        <div class="eyebrow" style="color:#aeb7d4">Private Class Portal</div>
        <h1>Դասարանը՝ ինչպես իրական հավելված։</h1>
        <p style="max-width:620px;color:#b8bfd7;font-size:clamp(1rem,2vw,1.25rem)">Դասացուցակ, տնայիններ, չատ, ֆայլեր, հարցումներ և դասարանի կառավարում՝ մեկ անվտանգ տեղում։</p>
      </div>
    </section>
    <section class="auth-panel"><div class="auth-card glass"><div class="segmented"><button data-tab="login" class="active">Մուտք</button><button data-tab="register">Գրանցում</button></div><div data-auth-body></div></div></section>
  </main>`);
  const body=root.querySelector('[data-auth-body]');
  const tabs=[...root.querySelectorAll('[data-tab]')];
  const setTab=(name)=>{tabs.forEach(b=>b.classList.toggle('active',b.dataset.tab===name));name==='login'?login(body):register(body)};
  tabs.forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  setTab('login');return root;
}

function login(body){
  body.innerHTML=`<div><div class="eyebrow">Բարի վերադարձ</div><h2 style="margin:.3rem 0 1.2rem">Մուտք գործիր</h2><form data-login><div class="field"><label>Email</label><input class="input" name="email" type="email" autocomplete="email" required></div><div class="field"><label>Գաղտնաբառ</label><input class="input" name="password" type="password" minlength="8" autocomplete="current-password" required></div><button class="button primary" style="width:100%">Մուտք գործել</button></form><div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;color:var(--muted);margin:16px 0"><span style="height:1px;background:var(--line)"></span><small>կամ</small><span style="height:1px;background:var(--line)"></span></div><button class="button ghost" data-google style="width:100%">G · Google</button></div>`;
  body.querySelector('[data-login]').addEventListener('submit',async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),btn=e.submitter;btn.disabled=true;
    const {error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});btn.disabled=false;
    if(error)toast(error.message==='Email not confirmed'?'Հաստատիր email-ը և նորից փորձիր։':'Մուտքը չհաջողվեց։ Ստուգիր email-ը և գաղտնաբառը։','err');
  });
  body.querySelector('[data-google]').addEventListener('click',async()=>{
    const {error}=await sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirectTo()}});
    if(error)toast('Google մուտքը դեռ չի կարգավորվել։','err');
  });
}

function register(body){
  body.innerHTML=`<div><div class="eyebrow">Միանալ դասարանին</div><h2 style="margin:.3rem 0 1.2rem">Ստեղծել հաշիվ</h2><form data-register><div class="grid grid-2"><div class="field"><label>Անուն</label><input class="input" name="first" required></div><div class="field"><label>Ազգանուն</label><input class="input" name="last" required></div></div><div class="field"><label>Username</label><input class="input" name="username" minlength="3" maxlength="32" required></div><div class="field"><label>Email</label><input class="input" name="email" type="email" required></div><div class="field"><label>Գաղտնաբառ</label><input class="input" name="password" type="password" minlength="8" required></div><div class="field"><label>Invite code</label><input class="input" name="invite" minlength="8" required></div><button class="button primary" style="width:100%">Գրանցվել</button></form></div>`;
  body.querySelector('[data-register]').addEventListener('submit',async e=>{
    e.preventDefault();const f=new FormData(e.currentTarget),button=e.submitter;button.disabled=true;
    const invite=String(f.get('invite')||'').trim();
    const valid=await sb.rpc('validate_class_invite',{p_code:invite});
    if(valid.error||valid.data!==true){button.disabled=false;return toast('Invite code-ը սխալ է կամ ժամկետանց։','err')}
    const pending={first:String(f.get('first')).trim(),last:String(f.get('last')).trim(),username:String(f.get('username')).trim(),invite};
    localStorage.setItem('portal-pending',JSON.stringify(pending));
    const result=await sb.auth.signUp({email:f.get('email'),password:f.get('password'),options:{emailRedirectTo:redirectTo()}});button.disabled=false;
    if(result.error)return toast(result.error.message,'err');
    if(result.data.session){await claimPending();location.reload();return}
    toast('Նամակը ուղարկված է։ Հաստատիր email-ը և վերադարձիր այստեղ։','ok');
  });
}

export async function claimPending(){
  let p=null;try{p=JSON.parse(localStorage.getItem('portal-pending')||'null')}catch{}
  if(!p)return false;
  const {data,error}=await sb.rpc('claim_class_profile',{p_first_name:p.first,p_last_name:p.last,p_username:p.username,p_invite_code:p.invite});
  if(error||data!==true)return false;
  localStorage.removeItem('portal-pending');return true;
}

export function renderIncompleteProfile(onDone){
  const node=el(`<main class="auth-panel" style="min-height:100vh"><section class="auth-card glass"><div class="eyebrow">Մեկ քայլ ևս</div><h2 style="margin:.3rem 0 1rem">Ավարտիր պրոֆիլը</h2><form data-complete><div class="field"><label>Անուն</label><input class="input" name="first" required></div><div class="field"><label>Ազգանուն</label><input class="input" name="last" required></div><div class="field"><label>Username</label><input class="input" name="username" minlength="3" maxlength="32" required></div><div class="field"><label>Invite code</label><input class="input" name="invite" minlength="8" required></div><button class="button primary" style="width:100%">Ակտիվացնել</button></form></section></main>`);
  node.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {data,error}=await sb.rpc('claim_class_profile',{p_first_name:f.get('first'),p_last_name:f.get('last'),p_username:f.get('username'),p_invite_code:f.get('invite')});if(error||data!==true)return toast('Չհաջողվեց ակտիվացնել պրոֆիլը։','err');onDone?.()});
  return node;
}
