import { sb } from '../../lib/supabase.js';
import { esc,toast } from '../../lib/dom.js';

export async function renderUsersModule({profile,onRefresh}){
  const {data,error}=await sb.from('profiles').select('id,first_name,last_name,username,role,is_active,created_at').order('first_name');
  if(error)throw error;
  const wrap=document.createElement('div');
  wrap.innerHTML=`<div class="row between wrap" style="margin-bottom:14px"><div><div class="eyebrow">Users & Roles</div><h2 style="margin:.25rem 0">Օգտատերեր</h2></div><span class="pill">${(data||[]).length}</span></div><div class="table-wrap"><table><thead><tr><th>Օգտատեր</th><th>Username</th><th>Role</th><th>Active</th><th>Գործողություններ</th></tr></thead><tbody>${(data||[]).map(user=>`<tr><td><strong>${esc(user.first_name)} ${esc(user.last_name)}</strong></td><td>@${esc(user.username)}</td><td><span class="pill">${esc(user.role)}</span></td><td>${user.is_active?'✓':'—'}</td><td><div class="row wrap">${user.id===profile.id?'<span class="subtle">Սա դու ես</span>':`<select class="select" style="width:auto;min-width:150px" data-role="${user.id}"><option ${user.role==='STUDENT'?'selected':''}>STUDENT</option><option ${user.role==='ADMIN'?'selected':''}>ADMIN</option><option ${user.role==='SUPER_ADMIN'?'selected':''}>SUPER_ADMIN</option></select><button class="button ghost" data-active="${user.id}" data-next="${!user.is_active}">${user.is_active?'Ապակտիվացնել':'Ակտիվացնել'}</button>`}</div></td></tr>`).join('')}</tbody></table></div>`;
  wrap.querySelectorAll('[data-role]').forEach(select=>select.addEventListener('change',async()=>{
    const before=select.disabled;select.disabled=true;
    const r=await sb.rpc('super_admin_set_user_role',{p_user_id:select.dataset.role,p_role:select.value});select.disabled=before;
    if(r.error||r.data!==true)return toast(r.error?.message||'Դերը չփոխվեց','err');toast('Դերը փոխվեց','ok');onRefresh?.();
  }));
  wrap.querySelectorAll('[data-active]').forEach(button=>button.addEventListener('click',async()=>{
    button.disabled=true;const r=await sb.rpc('super_admin_set_user_active',{p_user_id:button.dataset.active,p_active:button.dataset.next==='true'});button.disabled=false;
    if(r.error||r.data!==true)return toast(r.error?.message||'Չհաջողվեց','err');toast('Կարգավիճակը փոխվեց','ok');onRefresh?.();
  }));
  return wrap;
}
