import { sb } from './supabase-client.js';


const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=(v='')=>String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmt=v=>v?new Intl.DateTimeFormat('hy-AM',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v)):'—';
const track=(event,properties={})=>window.dispatchEvent(new CustomEvent('portal:track',{detail:{event,properties}}));

let profile=null;
async function viewer(){
  const {data,error}=await sb.rpc('get_my_profile');
  if(error) throw error;
  profile=Array.isArray(data)?data[0]:data;
  return profile;
}
function isAdmin(){return ['ADMIN','SUPER_ADMIN'].includes(profile?.role)}
function isSuper(){return profile?.role==='SUPER_ADMIN'}
function toast(text,kind=''){
  const host=$('#toast'); if(!host)return;
  const el=document.createElement('div');el.className=`toast ${kind}`;el.textContent=text;host.append(el);setTimeout(()=>el.remove(),4200);
}
function busy(btn,on,label='Սպասեք…'){
  if(!btn)return;
  if(on){btn.dataset.old=btn.textContent;btn.disabled=true;btn.textContent=label}
  else{btn.disabled=false;btn.textContent=btn.dataset.old||btn.textContent}
}

function ensureTabs(){
  const shell=$('.cc-shell'); const bar=$('.cc-tabbar',shell||document); if(!shell||!bar)return;
  const mode=shell.dataset.ccMode;
  if(!bar.querySelector('[data-ccx-tab="files"]')){
    const b=document.createElement('button');b.type='button';b.dataset.ccxTab='files';b.innerHTML='<span>▣</span>Ֆայլեր';bar.append(b);
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();activateExtra('files',b)});
  }
  if(mode==='superadmin'&&!bar.querySelector('[data-ccx-tab="system"]')){
    const b=document.createElement('button');b.type='button';b.dataset.ccxTab='system';b.innerHTML='<span>⚙</span>Համակարգ';bar.append(b);
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();activateExtra('system',b)});
  }
}

async function activateExtra(tab,button){
  try{
    await viewer();
    if(!isAdmin())return toast('Admin իրավունք չկա','err');
    if(tab==='system'&&!isSuper())return toast('Միայն Super Admin','err');
    $$('.cc-tabbar button').forEach(x=>x.classList.toggle('active',x===button));
    const body=$('#cc-body');if(!body)return;
    body.innerHTML='<div class="cc-loading">Բեռնվում է…</div>';
    if(tab==='files')await renderFiles(body);else await renderSystem(body);
  }catch(error){toast(error.message||String(error),'err')}
}

async function renderFiles(body){
  const [filesRes,subjectsRes]=await Promise.all([
    sb.from('class_files').select('id,subject_id,title,description,storage_path,original_name,mime_type,size_bytes,uploader_id,created_at').order('created_at',{ascending:false}).limit(200),
    sb.from('subjects').select('id,name,icon,is_active').order('display_order').order('name')
  ]);
  if(filesRes.error)throw filesRes.error;if(subjectsRes.error)throw subjectsRes.error;
  const subjects=subjectsRes.data||[];const bySubject=new Map(subjects.map(s=>[s.id,s]));const files=filesRes.data||[];
  const subjectOptions=(selected='')=>`<option value="">Առանց առարկայի</option>${subjects.filter(s=>s.is_active||s.id===selected).map(s=>`<option value="${s.id}" ${s.id===selected?'selected':''}>${esc(s.icon||'')} ${esc(s.name)}</option>`).join('')}`;
  body.innerHTML=`
    <div class="ccx-grid">
      <article class="cc-card ccx-upload-card">
        <div class="ccx-card-head"><div><span class="ccx-eyebrow">ADMIN FILES</span><h3>Ֆայլերի կառավարում</h3></div><span class="ccx-pill">մինչև 50 MB</span></div>
        <form id="ccx-file-form" class="cc-form">
          <label>Վերնագիր<input name="title" required maxlength="120" placeholder="Օր․ Ֆիզիկա — դաս 4"></label>
          <label>Առարկա<select name="subject">${subjectOptions()}</select></label>
          <label>Նկարագրություն<textarea name="description" maxlength="1000" placeholder="Կարճ բացատրություն"></textarea></label>
          <label class="ccx-file-pick"><input name="file" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"><span>Ընտրել ֆայլ</span><small>JPG, PNG, WEBP, PDF, DOCX, TXT</small></label>
          <button class="cc-primary">↑ Վերբեռնել</button>
        </form>
      </article>
      <section class="ccx-file-list">
        ${files.length?files.map(f=>{
          const s=bySubject.get(f.subject_id);const mb=(Number(f.size_bytes||0)/1024/1024).toFixed(Number(f.size_bytes||0)>1048576?1:2);
          return `<article class="cc-card ccx-file" data-file-id="${f.id}" data-storage-path="${esc(f.storage_path)}">
            <div class="ccx-file-top"><div class="ccx-file-icon">${f.mime_type?.includes('pdf')?'PDF':f.mime_type?.startsWith('image/')?'IMG':f.mime_type?.includes('word')?'DOC':'FILE'}</div><div><b>${esc(f.title)}</b><span>${esc(f.original_name)}</span><small>${esc(s?`${s.icon||''} ${s.name}`:'Առանց առարկայի')} · ${mb} MB · ${fmt(f.created_at)}</small></div></div>
            <div class="ccx-file-edit"><input data-f="title" value="${esc(f.title)}" maxlength="120"><select data-f="subject">${subjectOptions(f.subject_id||'')}</select><textarea data-f="description" maxlength="1000">${esc(f.description||'')}</textarea></div>
            <div class="ccx-actions"><button class="cc-secondary" data-file-open="${f.id}">Բացել</button><button class="cc-secondary" data-file-save="${f.id}">Պահպանել</button><button class="cc-danger-mini" data-file-delete="${f.id}">Ջնջել</button></div>
          </article>`;
        }).join(''):'<div class="cc-empty">Դասարանի ֆայլեր դեռ չկան</div>'}
      </section>
    </div>`;

  $('#ccx-file-form',body).onsubmit=async e=>{
    e.preventDefault();const form=e.currentTarget;const fd=new FormData(form);const file=fd.get('file');const btn=e.submitter;
    if(!(file instanceof File)||!file.size)return;
    if(file.size>50*1024*1024)return toast('Ֆայլը 50 MB-ից մեծ է','err');
    const allowed=['image/jpeg','image/png','image/webp','application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain'];
    if(!allowed.includes(file.type))return toast('Այս ֆայլի տեսակը չի թույլատրվում','err');
    busy(btn,true,'Վերբեռնվում է…');
    const safe=file.name.replace(/[^\p{L}\p{N}._-]+/gu,'_').slice(-120)||'file';
    const path=`${profile.id}/${Date.now()}-${crypto.randomUUID()}-${safe}`;
    const up=await sb.storage.from('class-files').upload(path,file,{contentType:file.type,upsert:false});
    if(up.error){busy(btn,false);return toast(up.error.message,'err')}
    const row=await sb.from('class_files').insert({subject_id:fd.get('subject')||null,title:String(fd.get('title')).trim(),description:String(fd.get('description')||''),storage_path:path,original_name:file.name,mime_type:file.type,size_bytes:file.size,uploader_id:profile.id});
    if(row.error){await sb.storage.from('class-files').remove([path]);busy(btn,false);return toast(row.error.message,'err')}
    busy(btn,false);track('class_file_uploaded',{mime:file.type,size:file.size});toast('Ֆայլը ավելացվեց','ok');await renderFiles(body);
  };

  $$('[data-file-open]',body).forEach(btn=>btn.onclick=async()=>{
    const card=btn.closest('[data-file-id]');const path=card?.dataset.storagePath;if(!path)return;
    const {data,error}=await sb.storage.from('class-files').createSignedUrl(path,90);
    if(error||!data?.signedUrl)return toast(error?.message||'Հղումը չստացվեց','err');
    window.open(data.signedUrl,'_blank','noopener,noreferrer');
  });
  $$('[data-file-save]',body).forEach(btn=>btn.onclick=async()=>{
    const card=btn.closest('[data-file-id]');const id=btn.dataset.fileSave;
    const {error}=await sb.from('class_files').update({title:$('[data-f="title"]',card).value.trim(),subject_id:$('[data-f="subject"]',card).value||null,description:$('[data-f="description"]',card).value}).eq('id',id);
    if(error)return toast(error.message,'err');track('class_file_updated');toast('Պահպանվեց','ok');await renderFiles(body);
  });
  $$('[data-file-delete]',body).forEach(btn=>btn.onclick=async()=>{
    if(!confirm('Ջնջե՞լ այս ֆայլը։'))return;const card=btn.closest('[data-file-id]');const id=btn.dataset.fileDelete;const path=card?.dataset.storagePath;
    const del=await sb.from('class_files').delete().eq('id',id);if(del.error)return toast(del.error.message,'err');
    if(path)await sb.storage.from('class-files').remove([path]);track('class_file_deleted');toast('Ջնջվեց','ok');await renderFiles(body);
  });
}

async function renderSystem(body){
  const [settingsRes,userCount]=await Promise.all([
    sb.rpc('get_public_site_settings'),
    sb.from('profiles').select('id',{count:'exact',head:true})
  ]);
  if(settingsRes.error)throw settingsRes.error;
  const map=Object.fromEntries((settingsRes.data||[]).map(x=>[x.key,x.value]));
  const get=(k,d)=>map[k]??d;
  const toggles=[
    ['features.chat','Չատ','Հաղորդագրություններ և խմբային զրույցներ'],
    ['features.board','Տախտակ','Գրառումներ և քննարկումներ'],
    ['features.polls','Հարցումներ','Դասարանի քվեարկություններ'],
    ['features.files','Ֆայլեր','Դասարանի նյութերի պահոց'],
    ['features.schedule','Դասացուցակ','Շաբաթական դասացուցակ'],
    ['features.homework','Տնայիններ','Տնային առաջադրանքներ'],
    ['features.announcements','Հայտարարություններ','Կարևոր հաղորդագրություններ'],
    ['features.notifications','Ծանուցումներ','Անձնական ծանուցումներ'],
    ['features.classmates','Դասընկերներ','Դասարանի անդամների ցուցակ']
  ];
  body.innerHTML=`
    <div class="ccx-system-hero cc-card"><div><span class="ccx-eyebrow">SYSTEM CONTROL</span><h3>Համակարգի կառավարում</h3><p>Միացրու կամ անջատիր բաժինները, փոխիր դասարանի անունը և կառավարիր invite code-ը՝ առանց կոդ խմբագրելու։</p></div><div class="ccx-system-stat"><b>${Number(userCount.count||0)}</b><span>օգտատեր</span></div></div>
    <div class="ccx-grid ccx-system-grid">
      <article class="cc-card"><h3>Դասարան և մոդուլներ</h3><form id="ccx-system-form" class="cc-form">
        <label>Դասարանի անուն<input name="class.name" value="${esc(get('class.name','9Ա'))}" maxlength="40" required></label>
        <div class="ccx-module-list">${toggles.map(([key,title,desc])=>`<label class="ccx-module"><span><b>${title}</b><small>${desc}</small></span><input type="checkbox" name="${key}" ${get(key,true)!==false?'checked':''}><i></i></label>`).join('')}</div>
        <button class="cc-primary">Պահպանել համակարգը</button>
      </form></article>
      <article class="cc-card"><h3>Invite code</h3><p class="cc-muted">Նոր կոդը ուժի մեջ է մտնում անմիջապես։ Հին կոդը այլևս չի աշխատի։</p><form id="ccx-invite-form" class="cc-form"><label>Նոր invite code<div class="ccx-inline"><input name="code" minlength="8" maxlength="100" autocomplete="off" required><button type="button" class="cc-secondary" id="ccx-generate-code">Ստեղծել</button></div></label><button class="cc-primary">Փոխել invite code-ը</button></form><div class="ccx-security-note"><b>Անվտանգություն</b><span>Կոդը բազայում պահվում է hash-ով։ Այն հնարավոր չէ հետ ստանալ plain text տեսքով։</span></div></article>
    </div>`;

  $('#ccx-system-form',body).onsubmit=async e=>{
    e.preventDefault();const btn=e.submitter;busy(btn,true);
    const fd=new FormData(e.currentTarget);const pairs=[['class.name',String(fd.get('class.name')).trim()],...toggles.map(([key])=>[key,fd.get(key)==='on'])];
    for(const [key,value] of pairs){const r=await sb.rpc('super_admin_set_system_setting',{p_key:key,p_value:value});if(r.error||r.data!==true){busy(btn,false);return toast(`Չպահպանվեց՝ ${key}`,'err')}}
    busy(btn,false);track('system_settings_updated');toast('Համակարգը պահպանվեց','ok');window.dispatchEvent(new Event('portal:features-refresh'));
  };
  $('#ccx-generate-code',body).onclick=()=>{
    const bytes=crypto.getRandomValues(new Uint8Array(10));
    $('#ccx-invite-form input[name="code"]',body).value=`CLASS-${[...bytes].map(x=>x.toString(36).toUpperCase().padStart(2,'0')).join('').slice(0,16)}`;
  };
  $('#ccx-invite-form',body).onsubmit=async e=>{
    e.preventDefault();const btn=e.submitter;const code=new FormData(e.currentTarget).get('code').trim();
    if(!confirm('Փոխե՞լ invite code-ը։ Հին կոդը կդադարի աշխատել։'))return;
    busy(btn,true);const r=await sb.rpc('rotate_class_invite',{p_new_code:code});busy(btn,false);
    if(r.error||r.data!==true)return toast(r.error?.message||'Invite code-ը չփոխվեց','err');
    track('invite_code_rotated');toast('Invite code-ը փոխվեց։ Պահպանիր նոր կոդը անվտանգ տեղում։','ok');
  };
}

const observer=new MutationObserver(()=>queueMicrotask(ensureTabs));
observer.observe(document.body,{subtree:true,childList:true});
ensureTabs();
