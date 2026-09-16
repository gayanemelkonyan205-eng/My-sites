function polishAuthCopy(){
  const grid=document.querySelector('.auth .hero-grid');
  if(grid&&grid.dataset.polished!=='1'){
    grid.dataset.polished='1';
    const cards=[
      ['🔒 Փակ մուտք','Միայն մեր դասարանի անդամների համար'],
      ['💬 Արագ չատ','Ընդհանուր և անձնական զրույցներ'],
      ['📚 Ուսում','Դասացուցակ, տնայիններ և ֆայլեր'],
      ['🛡️ Անվտանգություն','Յուրաքանչյուրն ունի իր իրավունքները']
    ];
    [...grid.children].forEach((el,i)=>{const c=cards[i];if(c)el.innerHTML=`<b>${c[0]}</b><br>${c[1]}`});
  }
  document.querySelectorAll('.auth .hero p').forEach(p=>{
    if(p.textContent?.includes('Փակ պորտալ'))p.textContent='Դասարանի ամենակարևոր բաները մեկ տեղում՝ պարզ, արագ և անվտանգ։';
  });
}
const observer=new MutationObserver(()=>queueMicrotask(polishAuthCopy));
observer.observe(document.body,{subtree:true,childList:true});
polishAuthCopy();
