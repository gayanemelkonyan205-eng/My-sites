import { sb } from './supabase-client.js';
import { toast } from './notifications-ui.js';

let patching=false;

async function ownerContext(){
  const {data,error}=await sb.rpc('get_owner_control_context');
  if(error) throw error;
  const row=Array.isArray(data)?data[0]:data;
  return {isOwner:!!row?.caller_is_owner,ownerId:row?.owner_id||null};
}

async function setRole(userId,role){
  const {data,error}=await sb.rpc('super_admin_set_user_role',{p_user_id:userId,p_role:role});
  if(error||data!==true) throw new Error(error?.message||'Role change denied');
}

async function patchSuperAdminTable(){
  if(patching)return;
  const table=document.querySelector('#view table');
  const selects=[...document.querySelectorAll('#view select[data-role]')];
  if(!table||!selects.length||table.dataset.ownerControl==='1')return;
  patching=true;
  try{
    const {isOwner,ownerId}=await ownerContext();
    if(!table.isConnected)return;
    table.dataset.ownerControl='1';

    const card=table.closest('.card');
    if(card&&!card.querySelector('.owner-control-banner')){
      const banner=document.createElement('div');
      banner.className='owner-control-banner';
      banner.innerHTML=isOwner
        ? `<div><b>◆ Primary Owner</b><span>Դու կարող ես նշանակել կամ հանել այլ Super Admin-ների։ Քո սեփական OWNER իրավունքը չի կարող հանել ոչ ոք։</span></div>`
        : `<div><b>◆ Super Admin</b><span>SUPER_ADMIN դերը կարող է նշանակել կամ հանել միայն Primary Owner-ը։</span></div>`;
      card.prepend(banner);
    }

    for(const select of selects){
      const userId=select.dataset.role;
      const row=select.closest('tr');
      if(!row||!userId)continue;
      const currentRole=select.value;
      const isPrimary=userId===ownerId;

      if(isPrimary){
        select.disabled=true;
        const firstCell=row.querySelector('td');
        if(firstCell&&!firstCell.querySelector('.owner-badge')){
          const badge=document.createElement('span');
          badge.className='owner-badge';
          badge.textContent='OWNER';
          firstCell.append(' ',badge);
        }
        const active=row.querySelector('[data-active]');
        if(active){active.disabled=true;active.title='Primary Owner-ը չի կարող արգելափակվել';}
        continue;
      }

      select.onchange=null;

      if(!isOwner){
        if(currentRole==='SUPER_ADMIN')select.disabled=true;
        const superOption=[...select.options].find(o=>o.value==='SUPER_ADMIN'||o.textContent==='SUPER_ADMIN');
        if(superOption)superOption.disabled=true;
        continue;
      }

      select.onchange=async()=>{
        const next=select.value;
        const previous=currentRole;
        const label=next==='SUPER_ADMIN'?'назначить этого пользователя Super Admin':previous==='SUPER_ADMIN'?'снять с него Super Admin':'изменить его роль';
        if(!confirm(`Подтвердить: ${label}?`)){select.value=previous;return;}
        select.disabled=true;
        try{
          await setRole(userId,next);
          toast('Роль изменена','ok');
          document.querySelector('.sidebar [data-nav="superadmin"]')?.click();
        }catch(error){
          select.value=previous;
          toast(error.message||'Не удалось изменить роль','err');
        }finally{select.disabled=false;}
      };

      const last=row.lastElementChild;
      if(last&&!last.querySelector('[data-owner-super-action]')){
        const button=document.createElement('button');
        button.type='button';
        button.dataset.ownerSuperAction=userId;
        button.className=currentRole==='SUPER_ADMIN'?'btn bad':'btn';
        button.textContent=currentRole==='SUPER_ADMIN'?'Снять Super Admin':'Сделать Super Admin';
        button.style.marginLeft='8px';
        button.onclick=async()=>{
          const next=currentRole==='SUPER_ADMIN'?'ADMIN':'SUPER_ADMIN';
          if(!confirm(currentRole==='SUPER_ADMIN'?'Снять SUPER_ADMIN и оставить ADMIN?':'Назначить пользователя SUPER_ADMIN?'))return;
          button.disabled=true;
          try{
            await setRole(userId,next);
            toast(next==='SUPER_ADMIN'?'Super Admin назначен':'Super Admin снят','ok');
            document.querySelector('.sidebar [data-nav="superadmin"]')?.click();
          }catch(error){toast(error.message||'Действие запрещено','err');button.disabled=false;}
        };
        last.append(button);
      }
    }
  }catch(error){
    console.error('[owner-control]',error);
  }finally{patching=false;}
}

const style=document.createElement('style');
style.textContent=`
.owner-control-banner{margin:0 0 16px;padding:14px 16px;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(255,255,255,.07);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.owner-control-banner div{display:flex;gap:8px;flex-direction:column}.owner-control-banner b{font-size:15px}.owner-control-banner span{font-size:13px;opacity:.72;line-height:1.45}
.owner-badge{display:inline-flex;padding:3px 7px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.08em;background:linear-gradient(135deg,#3478f6,#9b4dff);color:#fff}
@media(max-width:900px){#view table td:last-child{min-width:180px}.owner-control-banner{margin-bottom:12px}}
`;
document.head.append(style);

const observer=new MutationObserver(()=>queueMicrotask(patchSuperAdminTable));
observer.observe(document.documentElement,{subtree:true,childList:true});
patchSuperAdminTable();
