function updateViewport(){
  const h=window.visualViewport?.height||window.innerHeight;
  document.documentElement.style.setProperty('--chat-vvh',`${Math.round(h)}px`);
}
function setKeyboardState(){
  const active=document.activeElement;
  const inComposer=!!active?.closest?.('#compose');
  document.body.classList.toggle('chat-keyboard',inComposer);
  if(inComposer)setTimeout(()=>document.querySelector('#messages')?.scrollTo({top:document.querySelector('#messages')?.scrollHeight||0,behavior:'smooth'}),120);
}

document.addEventListener('focusin',e=>{if(e.target.closest?.('#compose')){setKeyboardState();updateViewport();}},true);
document.addEventListener('focusout',()=>setTimeout(setKeyboardState,80),true);
window.visualViewport?.addEventListener('resize',()=>{updateViewport();if(document.body.classList.contains('chat-keyboard'))setKeyboardState()});
window.addEventListener('resize',updateViewport);
updateViewport();
