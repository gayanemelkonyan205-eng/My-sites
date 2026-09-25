const PRIMARY_OWNER_ID='32887a88-b14c-40bb-acb0-ca58abc2bbd8';

function applyOwnerGuard(){
  const role=document.querySelector(`[data-role="${PRIMARY_OWNER_ID}"]`);
  const active=document.querySelector(`[data-active="${PRIMARY_OWNER_ID}"]`);
  if(!role&&!active)return;

  const row=(role||active)?.closest('tr');
  if(row){
    row.dataset.primaryOwner='true';
    const nameCell=row.querySelector('td');
    if(nameCell&&!nameCell.querySelector('.owner-badge')){
      const badge=document.createElement('span');
      badge.className='badge good owner-badge';
      badge.textContent='OWNER';
      badge.title='Primary owner — роль и доступ защищены';
      badge.style.marginInlineStart='8px';
      nameCell.append(badge);
    }
  }

  if(role){
    role.disabled=true;
    role.title='Primary Owner нельзя понизить или удалить';
  }
  if(active){
    active.disabled=true;
    active.title='Primary Owner нельзя заблокировать';
  }
}

const observer=new MutationObserver(()=>queueMicrotask(applyOwnerGuard));
observer.observe(document.documentElement,{subtree:true,childList:true});
applyOwnerGuard();
