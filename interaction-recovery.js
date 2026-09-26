(()=>{
  const STYLE_ID='interaction-recovery-style';
  function installStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      html,body{min-height:100%;overflow-x:hidden!important}
      body{overflow-y:auto!important;touch-action:pan-y!important;-webkit-overflow-scrolling:touch}
      #app,.portal,.main,#view{touch-action:pan-y!important}
      button,a,input,textarea,select,[role="button"],[data-nav],[data-simple-key],[data-sheet-view]{pointer-events:auto!important;touch-action:manipulation!important}
      .messages,.sn-sheet,.table,.cc-tabbar{touch-action:pan-y!important;-webkit-overflow-scrolling:touch}
      @media(max-width:900px){
        .main,#view{overflow:visible!important}
        .mobile{pointer-events:auto!important;touch-action:manipulation!important;z-index:2100!important}
      }
    `;
    document.head.appendChild(s);
  }

  function visible(el){
    if(!el||!el.isConnected)return false;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility==='hidden'||Number(cs.opacity)===0)return false;
    const r=el.getBoundingClientRect();
    return r.width>0&&r.height>0;
  }

  function cleanup(){
    installStyle();

    document.querySelectorAll('.sn-backdrop').forEach(backdrop=>{
      const sheet=backdrop.querySelector('.sn-sheet');
      if(!sheet||!visible(sheet))backdrop.remove();
    });
    if(!document.querySelector('.sn-backdrop'))document.documentElement.classList.remove('sn-sheet-open');

    const modalSelectors=['.modal-backdrop','.modal-overlay','.overlay-backdrop','[data-modal-backdrop]'];
    document.querySelectorAll(modalSelectors.join(',')).forEach(layer=>{
      const modal=layer.querySelector('.modal,[role="dialog"]');
      if(!modal||!visible(modal))layer.remove();
    });

    const activeLayer=document.querySelector('.sn-backdrop,.modal-backdrop,.modal-overlay,.overlay-backdrop,[data-modal-backdrop]');
    if(!activeLayer){
      document.documentElement.style.overflow='';
      document.body.style.overflowY='auto';
      document.body.style.touchAction='pan-y';
    }
  }

  document.addEventListener('pointerdown',event=>{
    const backdrop=event.target?.closest?.('.sn-backdrop');
    if(backdrop&&event.target===backdrop){
      backdrop.remove();
      document.documentElement.classList.remove('sn-sheet-open');
    }
  },true);

  ['pageshow','focus','resize','orientationchange'].forEach(name=>window.addEventListener(name,cleanup,{passive:true}));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)cleanup()});
  const observer=new MutationObserver(()=>queueMicrotask(cleanup));
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','style','aria-hidden']});
  installStyle();
  cleanup();
  let runs=0;const timer=setInterval(()=>{cleanup();if(++runs>20)clearInterval(timer)},1000);
})();
