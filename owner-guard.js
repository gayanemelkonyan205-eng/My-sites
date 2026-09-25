import { sb } from './supabase-client.js';
import { toast } from './notifications-ui.js';

const PRIMARY_OWNER_ID='32887a88-b14c-40bb-acb0-ca58abc2bbd8';
let viewerId=null;
let resolving=null;

async function resolveViewer(){
  if(viewerId)return viewerId;
  if(resolving)return resolving;
  resolving=sb.auth.getUser().then(({data})=>{
    viewerId=data?.user?.id||null;
    return viewerId;
  }).catch(()=>null).finally(()=>{resolving=null});
  return resolving;
}

function addOwnerBadge(row){
  if(!row||row.querySelector('.owner-badge'))return;
  const host=row.querySelector('.cc-user-main > div:last-child')||row.querySelector('.cc-user-main')||row;
  const badge=document.createElement('span');
  badge.className='badge good owner-badge';
  badge.textContent='OWNER';
  badge.title='Primary Owner — защищённый владелец портала';
  badge.style.marginInlineStart='8px';
  host.append(badge);
}

function disableControl(el,text){
  if(!el)return;
  el.disabled=true;
  el.title=text;
}

async function applyOwnerGuard(){
  const current=await resolveViewer();
  if(!current)return;

  document.querySelectorAll('.cc-user-row').forEach(row=>{
    const role=row.querySelector('[data-user-role]');
    const active=row.querySelector('[data-user-active]');
    const targetId=role?.dataset.userRole||active?.dataset.userActive;
    if(!targetId)return;

    const targetIsOwner=targetId===PRIMARY_OWNER_ID;
    const targetIsSuper=role?.value==='SUPER_ADMIN';

    if(targetIsOwner){
      row.dataset.primaryOwner='true';
      addOwnerBadge(row);
      disableControl(role,'Primary Owner нельзя понизить');
      disableControl(active,'Primary Owner нельзя заблокировать');
    }

    if(current!==PRIMARY_OWNER_ID&&targetIsSuper){
      disableControl(role,'Только Primary Owner может управлять Super Admin');
      disableControl(active,'Только Primary Owner может управлять Super Admin');
    }

    if(current===PRIMARY_OWNER_ID&&targetId!==PRIMARY_OWNER_ID&&!row.querySelector('[data-owner-delete]')){
      const button=document.createElement('button');
      button.type='button';
      button.className='cc-danger-mini';
      button.dataset.ownerDelete=targetId;
      button.textContent='Ջնջել';
      button.title='Удалить пользователя из портала';
      button.onclick=async()=>{
        const name=row.querySelector('.cc-user-main b')?.textContent?.trim()||'этого пользователя';
        if(!confirm(`Удалить ${name} из портала?`))return;
        button.disabled=true;
        const {data,error}=await sb.rpc('owner_soft_delete_user',{p_user_id:targetId,p_reason:'Deleted by Primary Owner from Control Center'});
        if(error||data!==true){
          button.disabled=false;
          return toast(error?.message||'Не удалось удалить пользователя','err');
        }
        row.remove();
        toast('Пользователь удалён. Его можно восстановить из корзины.','ok');
      };
      row.append(button);
    }
  });
}

const observer=new MutationObserver(()=>queueMicrotask(applyOwnerGuard));
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('focus',applyOwnerGuard);
applyOwnerGuard();
