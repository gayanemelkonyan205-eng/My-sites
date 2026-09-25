// A single toast queue is shared by the core portal and optional modules.
const active=new Map();
export function toast(message,kind=''){
  const host=document.querySelector('#toast');
  if(!host)return;
  const text=String(message||'').trim();
  if(!text)return;
  const key=`${kind}:${text}`;
  if(active.get(key)?.isConnected)return;
  active.delete(key);
  while(host.children.length>=3){
    const oldest=host.firstElementChild;
    for(const [entry,node] of active)if(node===oldest)active.delete(entry);
    oldest?.remove();
  }
  const item=document.createElement('div');
  item.className=`toast ${kind}`;
  item.textContent=text;
  item.setAttribute('role',kind==='err'?'alert':'status');
  item.setAttribute('aria-live',kind==='err'?'assertive':'polite');
  host.append(item);
  active.set(key,item);
  const cleanup=()=>{if(active.get(key)===item)active.delete(key)};
  setTimeout(()=>{item.remove();cleanup()},4200);
}
