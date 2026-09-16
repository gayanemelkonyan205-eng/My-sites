import { icon } from './icons.js';

let activeCleanup=null;

export function closeSheet(){
  activeCleanup?.();
  activeCleanup=null;
}

export function openMoreSheet(items,onSelect,{title='Ավելին'}={}){
  closeSheet();
  const previous=document.activeElement;
  const backdrop=document.createElement('div');
  backdrop.className='glass-sheet-backdrop';
  const sheet=document.createElement('section');
  sheet.className='glass-sheet glass';
  sheet.setAttribute('role','dialog');
  sheet.setAttribute('aria-modal','true');
  sheet.setAttribute('aria-label',title);
  sheet.innerHTML=`<div class="glass-sheet__handle"></div><div class="row between" style="margin:0 4px 14px"><div><div class="eyebrow">Class Portal</div><h2 style="margin:3px 0 0">${title}</h2></div><button class="button ghost" data-close aria-label="Փակել">✕</button></div><div class="sheet-grid">${items.map(item=>`<button class="sheet-action" data-destination="${item.key}"><span class="icon">${icon(item.icon,{size:21})}</span><span><strong>${item.label}</strong>${item.privileged?'<small style="display:block;color:var(--muted);margin-top:3px">Կառավարում</small>':''}</span></button>`).join('')}</div>`;
  document.body.append(backdrop,sheet);

  const focusables=()=>[...sheet.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')];
  const cleanup=()=>{
    document.removeEventListener('keydown',onKey);
    backdrop.remove();sheet.remove();
    previous?.focus?.();
  };
  const onKey=(event)=>{
    if(event.key==='Escape'){event.preventDefault();cleanup();activeCleanup=null;return;}
    if(event.key==='Tab'){
      const nodes=focusables();if(!nodes.length)return;
      const first=nodes[0],last=nodes[nodes.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  };
  document.addEventListener('keydown',onKey);
  backdrop.addEventListener('click',()=>{cleanup();activeCleanup=null});
  sheet.querySelector('[data-close]').addEventListener('click',()=>{cleanup();activeCleanup=null});
  sheet.querySelectorAll('[data-destination]').forEach(button=>button.addEventListener('click',()=>{
    const key=button.dataset.destination;cleanup();activeCleanup=null;onSelect(key);
  }));
  activeCleanup=cleanup;
  requestAnimationFrame(()=>focusables()[0]?.focus());
}
