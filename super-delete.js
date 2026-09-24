import { sb } from './supabase-client.js';

const TABLES = [
  ['announcements','Հայտարարություններ'],
  ['board_posts','Տախտակի գրառումներ'],
  ['board_comments','Մեկնաբանություններ'],
  ['events','Իրադարձություններ'],
  ['polls','Հարցումներ'],
  ['homework','Տնային աշխատանքներ'],
  ['schedule_entries','Դասացուցակ'],
  ['subjects','Առարկաներ']
];

let verified=false;
let currentTable='announcements';
let installing=false;

const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

function toast(text,kind=''){
  const host=document.querySelector('#toast');
  if(!host)return;
  const el=document.createElement('div');
  el.className=`toast ${kind}`;
  el.textContent=text;
  host.append(el);
  setTimeout(()=>el.remove(),4200);
}

async function ensureSuper(){
  if(verified)return true;
  const {data,error}=await sb.rpc('get_my_profile');
  if(error)return false;
  const profile=Array.isArray(data)?data[0]:data;
  verified=profile?.is_active===true&&profile?.role==='SUPER_ADMIN';
  return verified;
}

function labelFor(table,row){
  const primary=row.title||row.name||row.question||row.description||row.body||row.content||row.text;
  if(primary)return String(primary).replace(/\s+/g,' ').trim().slice(0,120);
  if(table==='schedule_entries'){
    const day=row.day_of_week??row.weekday??'—';
    const period=row.period_no??row.period_number??row.lesson_number??'—';
    return `Օր ${day} · դաս ${period}`;
  }
  return row.id;
}

function detailFor(row){
  const value=row.created_at||row.event_at||row.due_at||row.due_date||row.start_at||row.updated_at;
  if(!value)return row.id;
  const date=new Date(value);
  return Number.isNaN(date.getTime())?row.id:`${date.toLocaleString('hy-AM')} · ${row.id}`;
}

async function loadRows(table){
  const {data,error}=await sb.from(table).select('*').limit(100);
  if(error)throw error;
  return data||[];
}

function tablePicker(){
  return `<div class="cc-action-grid" style="margin-bottom:14px">${TABLES.map(([key,label])=>`<button type="button" data-super-delete-table="${key}" class="${key===currentTable?'active':''}">${esc(label)}</button>`).join('')}</div>`;
}

async function renderManager(){
  const shell=document.querySelector('.cc-shell[data-cc-mode="superadmin"]');
  const body=shell?.querySelector('#cc-body');
  if(!body)return;
  if(!await ensureSuper()){
    body.innerHTML='<div class="cc-empty"><b>Մուտքը մերժված է</b><span>Այս բաժինը միայն Super Admin-ի համար է։</span></div>';
    return;
  }

  body.innerHTML=`<article class="cc-card"><h3>Բովանդակության ջնջում</h3><p>Այստեղ կարող ես ջնջել կայքի հիմնական բովանդակությունը։ Օգտատերերի հաշիվները կառավարվում են Users բաժնից, իսկ ֆայլերը՝ Files Manager-ից, որպեսզի չվնասվի Auth-ը կամ Storage-ը։</p>${tablePicker()}<div id="super-delete-list" class="cc-list"><div class="cc-loading">Բեռնվում է…</div></div></article>`;
  body.querySelectorAll('[data-super-delete-table]').forEach(button=>{
    button.onclick=()=>{
      currentTable=button.dataset.superDeleteTable;
      renderManager();
    };
  });

  const list=body.querySelector('#super-delete-list');
  try{
    const rows=await loadRows(currentTable);
    if(!body.isConnected)return;
    if(!rows.length){
      list.innerHTML='<div class="cc-empty">Տվյալներ չկան</div>';
      return;
    }
    list.innerHTML=rows.map(row=>`<article class="cc-card" data-delete-row="${esc(row.id)}"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px"><div style="min-width:0"><b style="display:block;overflow-wrap:anywhere">${esc(labelFor(currentTable,row))}</b><small class="muted" style="overflow-wrap:anywhere">${esc(detailFor(row))}</small></div><button type="button" class="btn" data-super-delete-id="${esc(row.id)}" style="flex:0 0 auto">Ջնջել</button></div></article>`).join('');
    list.querySelectorAll('[data-super-delete-id]').forEach(button=>{
      button.onclick=()=>removeEntity(button);
    });
  }catch(error){
    list.innerHTML=`<div class="cc-empty"><b>Չհաջողվեց բեռնել</b><span>${esc(error?.message||error)}</span></div>`;
  }
}

async function removeEntity(button){
  const id=button.dataset.superDeleteId;
  if(!id||!await ensureSuper())return;
  if(!window.confirm('Ջնջե՞լ այս տարրը։ Գործողությունը կգրանցվի Audit Log-ում։'))return;
  button.disabled=true;
  const old=button.textContent;
  button.textContent='Ջնջվում է…';
  try{
    const {data,error}=await sb.rpc('super_admin_delete_entity',{p_entity_type:currentTable,p_entity_id:id});
    if(error||data!==true)throw error||new Error('delete_failed');
    button.closest('[data-delete-row]')?.remove();
    toast('Տարրը ջնջված է','ok');
  }catch(error){
    button.disabled=false;
    button.textContent=old;
    toast(`Չհաջողվեց ջնջել․ ${error?.message||'անհայտ սխալ'}`,'err');
  }
}

async function install(){
  if(installing)return;
  const shell=document.querySelector('.cc-shell[data-cc-mode="superadmin"]');
  const bar=shell?.querySelector('.cc-tabbar');
  if(!shell||!bar||bar.querySelector('[data-super-delete-tab]'))return;
  installing=true;
  try{
    if(!await ensureSuper())return;
    if(!bar.isConnected||bar.querySelector('[data-super-delete-tab]'))return;
    const button=document.createElement('button');
    button.type='button';
    button.dataset.superDeleteTab='1';
    button.innerHTML='<span>⌫</span>Ջնջում';
    button.onclick=()=>{
      bar.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
      button.classList.add('active');
      renderManager();
    };
    bar.append(button);
  }finally{
    installing=false;
  }
}

const observer=new MutationObserver(()=>queueMicrotask(install));
observer.observe(document.body,{childList:true,subtree:true});
window.addEventListener('portal:boot-state',()=>install());
install();
