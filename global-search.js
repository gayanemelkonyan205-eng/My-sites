import { sb } from './supabase-client.js';
import { icon } from './icons.js';

const esc=(value='')=>String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
let searchRevision=0,debounce;
const sources=[
  {table:'profiles',title:'Դասընկերներ',view:'classmates',fields:'id,first_name,last_name,username',filter:'first_name,last_name,username',label:row=>`${row.first_name||''} ${row.last_name||''}`.trim(),detail:row=>`@${row.username||''}`},
  {table:'messages',title:'Հաղորդագրություններ',view:'chat',fields:'id,body,conversation_id',filter:'body',label:row=>row.body,detail:()=>''},
  {table:'homework',title:'Տնային աշխատանքներ',view:'homework',fields:'id,title,description',filter:'title,description',label:row=>row.title,detail:row=>row.description||''},
  {table:'class_files',title:'Ֆայլեր',view:'files',fields:'id,title,original_name',filter:'title,original_name',label:row=>row.title,detail:row=>row.original_name||''},
  {table:'announcements',title:'Հայտարարություններ',view:'announcements',fields:'id,title,body',filter:'title,body',label:row=>row.title,detail:row=>row.body||''},
  {table:'subjects',title:'Առարկաներ',view:'schedule',fields:'id,name',filter:'name',label:row=>row.name,detail:()=>''},
  {table:'events',title:'Միջոցառումներ',view:'events',fields:'id,title,description,starts_at',filter:'title,description',label:row=>row.title,detail:row=>row.description||''}
];

function close(){document.querySelector('#search-dialog')?.remove();searchRevision++;clearTimeout(debounce)}

async function search(value){
  const dialog=document.querySelector('#search-dialog');
  if(!dialog)return;
  const host=dialog.querySelector('#search-results');
  const term=value.replace(/[^\p{L}\p{N}\s-]/gu,'').trim().slice(0,60);
  const revision=++searchRevision;
  if(term.length<2){host.innerHTML='<p class="muted">Գրիր առնվազն երկու նիշ։</p>';return}
  host.innerHTML='<p class="muted">Փնտրվում է…</p>';
  const pattern=`%${term}%`;
  const found=await Promise.all(sources.map(async source=>{
    try{
    let query=sb.from(source.table).select(source.fields);
    const columns=source.filter.split(',');
    query=columns.length===1?query.ilike(columns[0],pattern):query.or(columns.map(column=>`${column}.ilike.${pattern}`).join(','));
    if(source.table==='messages')query=query.is('deleted_at',null);
    if(['homework','class_files','announcements','events'].includes(source.table))query=query.is('deleted_at',null);
    if(source.table==='profiles')query=query.eq('is_active',true);
    const result=await query.limit(5);
    return {source,rows:result.error?[]:(result.data||[])};
    }catch{return {source,rows:[]}}
  }));
  if(revision!==searchRevision||!host.isConnected)return;
  const groups=found.filter(group=>group.rows.length);
  host.innerHTML=groups.length?groups.map(({source,rows})=>`<section class="search-group"><h3>${source.title}</h3>${rows.map(row=>`<button type="button" class="search-result" data-view="${source.view}" data-item-id="${esc(row.id)}" ${row.conversation_id?`data-conversation="${esc(row.conversation_id)}"`:''} ${row.starts_at?`data-starts-at="${esc(row.starts_at)}"`:''}><span>${icon(source.view)}<b>${esc(source.label(row)).slice(0,140)}</b></span><small>${esc(source.detail(row)).slice(0,150)}</small></button>`).join('')}</section>`).join(''):'<p class="muted">Արդյունքներ չկան։</p>';
}

function open(){
  close();
  const overlay=document.createElement('div');
  overlay.id='search-dialog';overlay.className='search-overlay';
  overlay.innerHTML=`<div class="search-panel" role="dialog" aria-modal="true" aria-label="Որոնում"><div class="search-head">${icon('search')}<input id="search-query" type="search" aria-label="Որոնել պորտալում" placeholder="Փնտրել դասարանի պորտալում…" autocomplete="off"><button type="button" id="search-close" aria-label="Փակել">×</button></div><div id="search-results"><p class="muted">Գտիր մարդկանց, հաղորդագրություններ, դասեր և նյութեր։</p></div></div>`;
  document.body.append(overlay);
  overlay.querySelector('#search-close').onclick=close;
  overlay.onclick=event=>{if(event.target===overlay)close()};
  overlay.querySelector('#search-query').oninput=event=>{clearTimeout(debounce);const value=event.target.value;debounce=setTimeout(()=>search(value),220)};
  overlay.querySelector('#search-results').onclick=event=>{
    const button=event.target.closest('[data-view]');
    if(!button)return;
    window.dispatchEvent(new CustomEvent('portal:open',{detail:{view:button.dataset.view,conversationId:button.dataset.conversation||null,itemId:button.dataset.itemId||null,startsAt:button.dataset.startsAt||null}}));
    close();
  };
  overlay.querySelector('#search-query').focus();
}

document.addEventListener('click',event=>{if(event.target.closest('#global-search'))open()});
document.addEventListener('keydown',event=>{if(event.key==='Escape')close();if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&document.querySelector('.portal')){event.preventDefault();open()}});
