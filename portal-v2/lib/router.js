import { isDestinationAllowed } from './navigation.js';

const views=new Map();
let current='home';

export function registerView(key,renderer){views.set(key,renderer)}
export function getCurrentView(){return current}
export function getStoredView(role){const key=sessionStorage.getItem('portal-v2-view')||'home';return isDestinationAllowed(key,role)?key:'home'}
export async function navigate(key,{role,context,container,onBefore,onAfter}={}){
  if(!isDestinationAllowed(key,role))key='home';
  const renderer=views.get(key)||views.get('home');
  if(!renderer)throw new Error('View renderer missing');
  onBefore?.(key);
  current=key;sessionStorage.setItem('portal-v2-view',key);
  container.innerHTML='<div class="page"><div class="card skeleton" style="height:180px"></div></div>';
  const node=await renderer({...context,key});
  container.replaceChildren(node);
  node.classList?.add('view-enter');
  onAfter?.(key);
  return key;
}
