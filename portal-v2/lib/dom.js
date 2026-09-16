export const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
export const fmt=(value)=>value?new Intl.DateTimeFormat('hy-AM',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'—';
export function el(html){const t=document.createElement('template');t.innerHTML=html.trim();return t.content.firstElementChild}
export function toast(text,type='ok'){
  const root=document.querySelector('#toast-root');if(!root)return;
  const node=document.createElement('div');node.className=`toast toast--${type}`;node.textContent=text;root.append(node);
  setTimeout(()=>node.remove(),3600);
}
