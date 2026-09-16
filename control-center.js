import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4?bundle';

const SB_URL = 'https://yknzcvooglrsvyidestj.supabase.co';
const SB_KEY = 'sb_publishable_BntzoD9F20GkbI5A0yhmQw_1Z5-WrtJ';
const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

const cc = { profile: null, mode: null, tab: null, subjects: [], users: [], requests: [] };
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (v = '') => String(v).replace(/[&<>'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const fmt = v => v ? new Intl.DateTimeFormat('hy-AM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '—';
const roleLabel = r => ({STUDENT:'Աշակերտ',ADMIN:'Admin',SUPER_ADMIN:'Super Admin'}[r] || r);
const track = (event, properties = {}) => window.dispatchEvent(new CustomEvent('portal:track', { detail: { event, properties } }));

function toast(text, kind = '') {
  const host = $('#toast');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  host.append(el);
  setTimeout(() => el.remove(), 4200);
}

async function viewer() {
  const { data, error } = await sb.rpc('get_my_profile');
  if (error) throw error;
  cc.profile = Array.isArray(data) ? data[0] : data;
  return cc.profile;
}

function isAdmin() { return ['ADMIN', 'SUPER_ADMIN'].includes(cc.profile?.role); }
function isSuper() { return cc.profile?.role === 'SUPER_ADMIN'; }

function setActiveNav(mode) {
  $$('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === mode));
  const title = $('#vt');
  if (title) title.textContent = mode === 'superadmin' ? 'Super Admin Control Center' : 'Admin Control Center';
}

const adminTabs = [
  ['overview','⌂','Գլխավոր'],
  ['subjects','◫','Առարկաներ'],
  ['schedule','▦','Դասացուցակ'],
  ['content','✎','Բովանդակություն'],
  ['requests','✓','Admin հայտեր'],
  ['chat','✦','Չատ']
];
const superTabs = [
  ['users','♙','Օգտատերեր'],
  ['appearance','◐','Դիզայն'],
  ['database','▤','Բազա'],
  ['audit','◎','Audit']
];

function shell(mode) {
  const view = $('#view');
  if (!view) return;
  const tabs = [...adminTabs, ...(mode === 'superadmin' ? superTabs : [])];
  view.innerHTML = `
    <section class="cc-shell" data-cc-mode="${mode}">
      <div class="cc-hero">
        <div>
          <div class="cc-kicker">${mode === 'superadmin' ? 'SUPER ADMIN' : 'ADMIN'}</div>
          <h2>${mode === 'superadmin' ? 'Control Center' : 'Admin Center'}</h2>
          <p>${mode === 'superadmin' ? 'Կառավարում՝ օգտատերերից ու դիզայնից մինչև տվյալների բազա։' : 'Կառավարում՝ առարկաներ, դասացուցակ, բովանդակություն և դասարանի գործիքներ։'}</p>
        </div>
        <div class="cc-role-pill">${esc(roleLabel(cc.profile.role))}</div>
      </div>
      <div class="cc-tabbar">${tabs.map(([k,i,l]) => `<button data-cc-tab="${k}" class="${cc.tab === k ? 'active' : ''}"><span>${i}</span>${l}</button>`).join('')}</div>
      <div id="cc-body" class="cc-body"><div class="cc-loading">Բեռնվում է…</div></div>
    </section>`;
  $$('[data-cc-tab]', view).forEach(btn => btn.onclick = () => { cc.tab = btn.dataset.ccTab; renderTab(); });
}

async function openCenter(mode) {
  try {
    await viewer();
    if (!cc.profile || !cc.profile.is_active) return toast('Հաշիվը ակտիվ չէ։', 'err');
    if (mode === 'admin' && !isAdmin()) return toast('Admin իրավունք չկա։', 'err');
    if (mode === 'superadmin' && !isSuper()) return toast('Միայն Super Admin։', 'err');
    cc.mode = mode;
    cc.tab = 'overview';
    setActiveNav(mode);
    shell(mode);
    track('control_center_opened', { mode });
    await renderTab();
  } catch (error) {
    toast(`Control Center: ${error.message || error}`, 'err');
  }
}

async function renderTab() {
  const body = $('#cc-body');
  if (!body) return;
  $$('.cc-tabbar button').forEach(b => b.classList.toggle('active', b.dataset.ccTab === cc.tab));
  body.innerHTML = '<div class="cc-loading">Բեռնվում է…</div>';
  try {
    const fn = ({ overview, subjects, schedule, content, requests, chat: chatTools, users, appearance, database, audit })[cc.tab] || overview;
    await fn(body);
  } catch (error) {
    body.innerHTML = `<div class="cc-empty"><b>Չհաջողվեց բեռնել</b><span>${esc(error.message || error)}</span></div>`;
    track('control_center_error', { tab: cc.tab, message: String(error.message || error).slice(0, 160) });
  }
}

async function overview(body) {
  const [subjects, homework, announcements, events, polls] = await Promise.all([
    sb.from('subjects').select('id', { count: 'exact', head: true }),
    sb.from('homework').select('id', { count: 'exact', head: true }),
    sb.from('announcements').select('id', { count: 'exact', head: true }),
    sb.from('events').select('id', { count: 'exact', head: true }),
    sb.from('polls').select('id', { count: 'exact', head: true })
  ]);
  const cards = [
    ['Առարկաներ', subjects.count || 0, 'subjects'],
    ['Տնայիններ', homework.count || 0, 'content'],
    ['Հայտարարություններ', announcements.count || 0, 'content'],
    ['Իրադարձություններ', events.count || 0, 'content'],
    ['Հարցումներ', polls.count || 0, 'content']
  ];
  body.innerHTML = `
    <div class="cc-grid cc-stats">${cards.map(([l,n,t]) => `<button class="cc-stat" data-jump="${t}"><span>${esc(l)}</span><b>${n}</b></button>`).join('')}</div>
    <div class="cc-grid cc-grid-2">
      <article class="cc-card"><h3>Արագ կառավարում</h3><div class="cc-action-grid">
        <button data-jump="subjects">＋ Առարկա</button><button data-jump="schedule">＋ Դասացուցակ</button><button data-jump="content">＋ Բովանդակություն</button><button data-jump="chat">✦ Չատի գործիքներ</button>
      </div></article>
      <article class="cc-card"><h3>Իրավունքներ</h3><p>Admin-ի նշանակումը կատարվում է երկու տարբեր ադմինների համաձայնությամբ։ Հայտ ստեղծողը չի կարող հաստատել իր իսկ հայտը։</p>${isSuper() ? '<p><b>Super Admin</b>-ը կարող է նաև դերերը փոխել անմիջապես Users բաժնից։</p>' : ''}</article>
    </div>`;
  $$('[data-jump]', body).forEach(b => b.onclick = () => { cc.tab = b.dataset.jump; renderTab(); });
}

async function loadSubjects() {
  const { data, error } = await sb.from('subjects').select('*').order('display_order').order('name');
  if (error) throw error;
  cc.subjects = data || [];
}

async function subjects(body) {
  await loadSubjects();
  body.innerHTML = `
    <div class="cc-grid cc-grid-2 cc-top-align">
      <article class="cc-card cc-sticky-card">
        <h3>Ավելացնել առարկա</h3>
        <form id="cc-subject-form" class="cc-form">
          <label>Անվանում<input name="name" required maxlength="80" placeholder="Օր․ Աստղագիտություն"></label>
          <div class="cc-row"><label>Կարճ<input name="short" maxlength="24" placeholder="Աստղ."></label><label>Նշան<input name="icon" maxlength="16" placeholder="🔭"></label></div>
          <label>Գույն<input name="color" type="color" value="#0A84FF"></label>
          <button class="cc-primary">＋ Ավելացնել</button>
        </form>
      </article>
      <div class="cc-list">${cc.subjects.map(s => subjectRow(s)).join('') || '<div class="cc-empty">Առարկաներ չկան</div>'}</div>
    </div>`;
  $('#cc-subject-form', body).onsubmit = async e => {
    e.preventDefault();
    const f = new FormData(e.currentTarget); const btn = e.submitter; btn.disabled = true;
    const { data, error } = await sb.rpc('admin_create_subject', { p_name: f.get('name'), p_short_name: f.get('short') || null, p_icon: f.get('icon') || null, p_color: f.get('color') || null });
    btn.disabled = false;
    if (error || !data) return toast(error?.message || 'Առարկան չավելացվեց', 'err');
    track('subject_created'); toast('Առարկան ավելացվեց', 'ok'); renderTab();
  };
  $$('[data-subject-save]', body).forEach(btn => btn.onclick = () => saveSubject(btn.dataset.subjectSave, body));
}

function subjectRow(s) {
  return `<article class="cc-card cc-subject" data-subject-id="${s.id}">
    <div class="cc-subject-head"><span class="cc-subject-icon">${esc(s.icon || '◫')}</span><div><b>${esc(s.name)}</b><small>${esc(s.short_name || '')}</small></div><span class="cc-status ${s.is_active ? 'ok' : ''}">${s.is_active ? 'Ակտիվ' : 'Անջատված'}</span></div>
    <div class="cc-row"><label>Անվանում<input data-f="name" value="${esc(s.name)}"></label><label>Կարճ<input data-f="short" value="${esc(s.short_name || '')}"></label></div>
    <div class="cc-row"><label>Icon<input data-f="icon" value="${esc(s.icon || '')}"></label><label>Գույն<input data-f="color" type="color" value="${esc(s.color || '#0A84FF')}"></label></div>
    <div class="cc-row"><label>Հերթականություն<input data-f="order" type="number" min="0" value="${Number(s.display_order || 0)}"></label><label class="cc-switch-label"><input data-f="active" type="checkbox" ${s.is_active ? 'checked' : ''}> Ակտիվ</label></div>
    <button class="cc-secondary" data-subject-save="${s.id}">Պահպանել</button>
  </article>`;
}

async function saveSubject(id, root) {
  const card = $(`[data-subject-id="${CSS.escape(id)}"]`, root); if (!card) return;
  const args = {
    p_id: id,
    p_name: $('[data-f="name"]', card).value,
    p_short_name: $('[data-f="short"]', card).value || null,
    p_icon: $('[data-f="icon"]', card).value || null,
    p_color: $('[data-f="color"]', card).value || null,
    p_is_active: $('[data-f="active"]', card).checked,
    p_display_order: Number($('[data-f="order"]', card).value || 0)
  };
  const { data, error } = await sb.rpc('admin_update_subject', args);
  if (error || !data) return toast(error?.message || 'Չպահպանվեց', 'err');
  track('subject_updated'); toast('Պահպանվեց', 'ok'); renderTab();
}

async function schedule(body) {
  await loadSubjects();
  const { data, error } = await sb.from('schedule_entries').select('*,subject:subjects(name,icon)').order('weekday').order('lesson_number');
  if (error) throw error;
  const days = ['', 'Երկուշաբթի','Երեքշաբթի','Չորեքշաբթի','Հինգշաբթի','Ուրբաթ','Շաբաթ','Կիրակի'];
  body.innerHTML = `
    <article class="cc-card"><h3>Նոր դաս</h3><form id="cc-schedule-form" class="cc-form cc-form-inline">
      <label>Օր<select name="weekday">${days.slice(1,7).map((d,i)=>`<option value="${i+1}">${d}</option>`).join('')}</select></label>
      <label>Դաս №<input name="lesson" type="number" min="1" max="12" value="1" required></label>
      <label>Առարկա<select name="subject">${cc.subjects.filter(s=>s.is_active).map(s=>`<option value="${s.id}">${esc(s.icon||'')} ${esc(s.name)}</option>`).join('')}</select></label>
      <label>Սկիզբ<input name="start" type="time" value="09:00" required></label><label>Ավարտ<input name="end" type="time" value="09:45" required></label>
      <label>Սենյակ<input name="room" maxlength="50"></label><button class="cc-primary">Ավելացնել</button>
    </form></article>
    <div class="cc-list cc-schedule-list">${(data||[]).map(x=>`<article class="cc-card cc-schedule-row"><span class="cc-day">${days[x.weekday] || x.weekday}</span><b>${x.lesson_number}. ${esc(x.subject?.icon||'')} ${esc(x.subject?.name||'')}</b><span>${String(x.start_time).slice(0,5)}–${String(x.end_time).slice(0,5)}</span><span>${esc(x.room||'')}</span><button class="cc-danger-mini" data-schedule-delete="${x.id}">Ջնջել</button></article>`).join('') || '<div class="cc-empty">Դասացուցակը դատարկ է</div>'}</div>`;
  $('#cc-schedule-form', body).onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.currentTarget);
    const { error } = await sb.from('schedule_entries').insert({ weekday:Number(f.get('weekday')), lesson_number:Number(f.get('lesson')), subject_id:f.get('subject'), start_time:f.get('start'), end_time:f.get('end'), room:f.get('room')||null, created_by:cc.profile.id });
    if (error) return toast(error.message,'err'); track('schedule_entry_created'); toast('Ավելացվեց','ok'); renderTab();
  };
  $$('[data-schedule-delete]', body).forEach(btn => btn.onclick = async () => { if (!confirm('Ջնջե՞լ այս դասը։')) return; const { error } = await sb.from('schedule_entries').delete().eq('id',btn.dataset.scheduleDelete); error ? toast(error.message,'err') : renderTab(); });
}

async function content(body) {
  await loadSubjects();
  body.innerHTML = `
    <div class="cc-grid cc-grid-2 cc-top-align">
      <article class="cc-card"><h3>Հայտարարություն</h3><form id="cc-ann-form" class="cc-form"><label>Վերնագիր<input name="title" required></label><label>Տեքստ<textarea name="body" required></textarea></label><div class="cc-checks"><label><input name="important" type="checkbox"> Կարևոր</label><label><input name="pinned" type="checkbox"> Ամրացված</label></div><button class="cc-primary">Հրապարակել</button></form></article>
      <article class="cc-card"><h3>Տնային աշխատանք</h3><form id="cc-hw-form" class="cc-form"><label>Առարկա<select name="subject">${cc.subjects.filter(s=>s.is_active).map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label><label>Վերնագիր<input name="title" required></label><label>Նկարագրություն<textarea name="description"></textarea></label><label>Վերջնաժամկետ<input name="due" type="datetime-local" required></label><button class="cc-primary">Ավելացնել</button></form></article>
      <article class="cc-card"><h3>Իրադարձություն</h3><form id="cc-event-form" class="cc-form"><label>Անվանում<input name="title" required></label><label>Նկարագրություն<textarea name="description"></textarea></label><label>Սկիզբ<input name="starts" type="datetime-local" required></label><label>Վայր<input name="location"></label><button class="cc-primary">Ստեղծել</button></form></article>
      <article class="cc-card"><h3>Հարցում</h3><form id="cc-poll-form" class="cc-form"><label>Հարց<input name="question" required></label><label>Տարբերակներ<textarea name="options" placeholder="Յուրաքանչյուր տարբերակը՝ նոր տողից" required></textarea></label><label>Ընտրություն<select name="mode"><option value="SINGLE">Մեկ տարբերակ</option><option value="MULTIPLE">Մի քանի տարբերակ</option></select></label><button class="cc-primary">Ստեղծել հարցում</button></form></article>
    </div>`;
  $('#cc-ann-form', body).onsubmit = async e => { e.preventDefault(); const f=new FormData(e.currentTarget); const {error}=await sb.from('announcements').insert({title:f.get('title'),body:f.get('body'),is_important:f.get('important')==='on',is_pinned:f.get('pinned')==='on',author_id:cc.profile.id}); if(error)return toast(error.message,'err'); track('announcement_created'); e.currentTarget.reset(); toast('Հրապարակվեց','ok'); };
  $('#cc-hw-form', body).onsubmit = async e => { e.preventDefault(); const f=new FormData(e.currentTarget); const {error}=await sb.from('homework').insert({subject_id:f.get('subject'),title:f.get('title'),description:f.get('description')||null,due_at:new Date(f.get('due')).toISOString(),created_by:cc.profile.id}); if(error)return toast(error.message,'err'); track('homework_created'); e.currentTarget.reset(); toast('Ավելացվեց','ok'); };
  $('#cc-event-form', body).onsubmit = async e => { e.preventDefault(); const f=new FormData(e.currentTarget); const {error}=await sb.from('events').insert({title:f.get('title'),description:f.get('description')||'',starts_at:new Date(f.get('starts')).toISOString(),location:f.get('location')||null,author_id:cc.profile.id}); if(error)return toast(error.message,'err'); track('event_created'); e.currentTarget.reset(); toast('Ստեղծվեց','ok'); };
  $('#cc-poll-form', body).onsubmit = async e => { e.preventDefault(); const f=new FormData(e.currentTarget), options=String(f.get('options')).split(/\r?\n/).map(x=>x.trim()).filter(Boolean); if(options.length<2)return toast('Պետք է առնվազն 2 տարբերակ','err'); const r=await sb.from('polls').insert({question:f.get('question'),choice_mode:f.get('mode'),author_id:cc.profile.id}).select('id').single(); if(r.error)return toast(r.error.message,'err'); const rows=options.map((label,i)=>({poll_id:r.data.id,label,position:i})); const o=await sb.from('poll_options').insert(rows); if(o.error){await sb.from('polls').delete().eq('id',r.data.id);return toast(o.error.message,'err')} track('poll_created'); e.currentTarget.reset(); toast('Հարցումը ստեղծվեց','ok'); };
}

async function requests(body) {
  const [profilesRes, reqRes, voteRes] = await Promise.all([
    sb.from('profiles').select('id,first_name,last_name,username,role,is_active').eq('is_active',true).order('first_name'),
    sb.from('admin_role_requests').select('*').order('created_at',{ascending:false}).limit(100),
    sb.from('admin_role_request_votes').select('*').order('created_at',{ascending:false}).limit(200)
  ]);
  if (profilesRes.error) throw profilesRes.error; if (reqRes.error) throw reqRes.error;
  cc.users=profilesRes.data||[]; cc.requests=reqRes.data||[];
  const users = new Map(cc.users.map(u=>[u.id,u])); const votes=voteRes.data||[];
  body.innerHTML = `
    <article class="cc-card"><h3>Առաջարկել նոր Admin</h3><p class="cc-muted">Հայտը պետք է հաստատի մեկ այլ Admin։ Հայտի հեղինակը չի կարող հաստատել իր սեփական հայտը։</p><form id="cc-request-form" class="cc-form-inline"><select name="user">${cc.users.filter(u=>u.role==='STUDENT').map(u=>`<option value="${u.id}">${esc(u.first_name)} ${esc(u.last_name)} · @${esc(u.username)}</option>`).join('')}</select><button class="cc-primary">Ստեղծել հայտ</button></form></article>
    <div class="cc-list">${cc.requests.map(r=>{const target=users.get(r.target_user_id), author=users.get(r.requested_by), myVote=votes.find(v=>v.request_id===r.id&&v.voter_id===cc.profile.id); return `<article class="cc-card cc-request"><div><b>${esc(target?`${target.first_name} ${target.last_name}`:r.target_user_id)}</b><span>Առաջարկել է՝ ${esc(author?`${author.first_name} ${author.last_name}`:'—')}</span><small>${fmt(r.created_at)}</small></div><span class="cc-status ${r.status==='APPROVED'?'ok':r.status==='PENDING'?'wait':'bad'}">${esc(r.status)}</span>${r.status==='PENDING'&&r.requested_by!==cc.profile.id&&!myVote?`<div class="cc-request-actions"><button class="cc-primary" data-vote="APPROVE" data-id="${r.id}">Հաստատել</button><button class="cc-danger" data-vote="REJECT" data-id="${r.id}">Մերժել</button></div>`:''}</article>`}).join('') || '<div class="cc-empty">Հայտեր չկան</div>'}</div>`;
  $('#cc-request-form', body).onsubmit = async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {data,error}=await sb.rpc('create_admin_role_request',{p_target_user_id:f.get('user')});if(error||!data)return toast(error?.message||'Հայտը չստեղծվեց','err');track('admin_role_request_created');toast('Հայտը ստեղծվեց','ok');renderTab()};
  $$('[data-vote]',body).forEach(btn=>btn.onclick=async()=>{const {data,error}=await sb.rpc('vote_admin_role_request',{p_request_id:btn.dataset.id,p_decision:btn.dataset.vote});if(error||!data)return toast(error?.message||'Չհաջողվեց','err');track('admin_role_request_voted',{decision:btn.dataset.vote});toast('Որոշումը պահպանվեց','ok');renderTab()});
}

async function chatTools(body) {
  const [convs, users] = await Promise.all([
    sb.from('conversations').select('*').order('updated_at',{ascending:false}),
    sb.from('profiles').select('id,first_name,last_name,username').eq('is_active',true).order('first_name')
  ]);
  if (convs.error) throw convs.error;
  const list=convs.data||[];
  body.innerHTML = `
    <div class="cc-grid cc-grid-2 cc-top-align"><article class="cc-card"><h3>Խմբային չատ</h3><form id="cc-group-form" class="cc-form"><label>Անվանում<input name="title" required maxlength="80"></label><label>Անդամներ<select name="members" multiple size="8">${(users.data||[]).filter(u=>u.id!==cc.profile.id).map(u=>`<option value="${u.id}">${esc(u.first_name)} ${esc(u.last_name)} · @${esc(u.username)}</option>`).join('')}</select></label><button class="cc-primary">Ստեղծել խումբ</button></form></article><article class="cc-card"><h3>Մոդերացիա</h3><label>Զրույց<select id="cc-chat-select">${list.map(c=>`<option value="${c.id}">${c.type==='CLASS'?'🏫':c.type==='DIRECT'?'👤':'👥'} ${esc(c.title||c.type)}</option>`).join('')}</select></label><div id="cc-chat-messages" class="cc-mini-messages"></div></article></div>`;
  $('#cc-group-form',body).onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget),ids=[...e.currentTarget.members.selectedOptions].map(o=>o.value);const {data,error}=await sb.rpc('create_group_conversation',{p_title:f.get('title'),p_member_ids:ids});if(error||!data)return toast(error?.message||'Խումբը չստեղծվեց','err');track('group_chat_created');toast('Խումբը ստեղծվեց','ok');renderTab()};
  const load = async()=>{const id=$('#cc-chat-select',body)?.value;const host=$('#cc-chat-messages',body);if(!id||!host)return;const r=await sb.from('messages').select('id,body,created_at,deleted_at,sender:profiles(first_name,last_name)').eq('conversation_id',id).order('created_at',{ascending:false}).limit(40);if(r.error){host.innerHTML=`<div class="cc-empty">${esc(r.error.message)}</div>`;return}host.innerHTML=(r.data||[]).map(m=>`<div class="cc-message ${m.deleted_at?'deleted':''}"><div><b>${esc(`${m.sender?.first_name||''} ${m.sender?.last_name||''}`.trim()||'—')}</b><span>${esc(m.body||'')}</span><small>${fmt(m.created_at)}</small></div><div>${m.deleted_at&&isSuper()?`<button data-restore="${m.id}">Վերականգնել</button>`:!m.deleted_at?`<button data-pin="${m.id}">📌</button><button class="cc-danger-mini" data-delete-message="${m.id}">Ջնջել</button>`:''}</div></div>`).join('')||'<div class="cc-empty">Հաղորդագրություններ չկան</div>';$$('[data-delete-message]',host).forEach(b=>b.onclick=async()=>{const r=await sb.rpc('admin_delete_message',{p_message_id:b.dataset.deleteMessage});r.error||!r.data?toast('Չհաջողվեց','err'):(track('message_moderated'),load())});$$('[data-pin]',host).forEach(b=>b.onclick=async()=>{const r=await sb.rpc('admin_pin_message',{p_message_id:b.dataset.pin});r.error||!r.data?toast('Չհաջողվեց','err'):toast('Ամրացվեց','ok')});$$('[data-restore]',host).forEach(b=>b.onclick=async()=>{const r=await sb.rpc('super_admin_restore_message',{p_message_id:b.dataset.restore});r.error||!r.data?toast('Չհաջողվեց','err'):load()});};
  $('#cc-chat-select',body).onchange=load; await load();
}

async function users(body) {
  if(!isSuper()) return body.innerHTML='<div class="cc-empty">Միայն Super Admin</div>';
  const {data,error}=await sb.from('profiles').select('id,first_name,last_name,username,role,is_active,created_at').order('first_name');if(error)throw error;cc.users=data||[];
  body.innerHTML=`<div class="cc-list">${cc.users.map(u=>`<article class="cc-card cc-user-row"><div class="cc-user-main"><div class="cc-avatar">${esc((u.first_name?.[0]||'')+(u.last_name?.[0]||''))}</div><div><b>${esc(u.first_name)} ${esc(u.last_name)}</b><span>@${esc(u.username)}</span></div></div><select data-user-role="${u.id}" ${u.id===cc.profile.id?'disabled':''}><option ${u.role==='STUDENT'?'selected':''}>STUDENT</option><option ${u.role==='ADMIN'?'selected':''}>ADMIN</option><option ${u.role==='SUPER_ADMIN'?'selected':''}>SUPER_ADMIN</option></select><button class="${u.is_active?'cc-danger-mini':'cc-secondary'}" data-user-active="${u.id}" data-state="${u.is_active}" ${u.id===cc.profile.id?'disabled':''}>${u.is_active?'Արգելափակել':'Ակտիվացնել'}</button></article>`).join('')}</div>`;
  $$('[data-user-role]',body).forEach(x=>x.onchange=async()=>{const {data,error}=await sb.rpc('super_admin_set_user_role',{p_user_id:x.dataset.userRole,p_role:x.value});if(error||!data)return toast('Role-ը չփոխվեց','err');track('user_role_changed',{role:x.value});toast('Role-ը փոխվեց','ok')});
  $$('[data-user-active]',body).forEach(x=>x.onclick=async()=>{const {data,error}=await sb.rpc('super_admin_set_user_active',{p_user_id:x.dataset.userActive,p_active:x.dataset.state!=='true'});if(error||!data)return toast('Կարգավիճակը չփոխվեց','err');track('user_status_changed');renderTab()});
}

async function appearance(body) {
  if(!isSuper()) return body.innerHTML='<div class="cc-empty">Միայն Super Admin</div>';
  const {data,error}=await sb.rpc('get_public_site_settings');if(error)throw error;const map=Object.fromEntries((data||[]).map(x=>[x.key,x.value]));
  const val=(k,d='')=>map[k]??d;
  body.innerHTML=`<article class="cc-card"><h3>Appearance Studio</h3><p class="cc-muted">Փոփոխությունները պահվում են Supabase-ում և կիրառվում են բոլոր օգտատերերի համար։</p><form id="cc-appearance" class="cc-form cc-appearance-grid">
    <label>Կայքի անուն<input name="identity.site_name" value="${esc(val('identity.site_name','Դասարան'))}" maxlength="60"></label>
    <label>Թեմա<select name="appearance.theme_mode"><option value="dark" ${val('appearance.theme_mode')==='dark'?'selected':''}>Սև</option><option value="light" ${val('appearance.theme_mode')==='light'?'selected':''}>Բաց</option><option value="system" ${val('appearance.theme_mode')==='system'?'selected':''}>System</option></select></label>
    <label>Accent<input name="appearance.accent" type="color" value="${esc(val('appearance.accent','#0A84FF'))}"></label>
    <label>Կլորություն <output>${Number(val('appearance.radius',24))}</output><input name="appearance.radius" type="range" min="14" max="34" step="1" value="${Number(val('appearance.radius',24))}"></label>
    <label>Glass opacity <output>${Number(val('appearance.glass_opacity',.58))}</output><input name="appearance.glass_opacity" type="range" min="0.36" max="0.92" step="0.02" value="${Number(val('appearance.glass_opacity',.58))}"></label>
    <label>Blur <output>${Number(val('appearance.glass_blur',28))}</output><input name="appearance.glass_blur" type="range" min="12" max="48" step="1" value="${Number(val('appearance.glass_blur',28))}"></label>
    <label>Ֆոն<select name="appearance.background_style"><option value="pure" ${val('appearance.background_style')==='pure'?'selected':''}>Մաքուր</option><option value="soft-gradient" ${val('appearance.background_style')==='soft-gradient'?'selected':''}>Soft gradient</option></select></label>
    <label>Անիմացիաներ<select name="motion.enabled"><option value="true" ${val('motion.enabled',true)===true?'selected':''}>Միացված</option><option value="false" ${val('motion.enabled',true)===false?'selected':''}>Անջատված</option></select></label>
    <label>Արագություն <output>${Number(val('motion.speed',1))}</output><input name="motion.speed" type="range" min="0.6" max="1.6" step="0.1" value="${Number(val('motion.speed',1))}"></label>
    <label>Spring <output>${Number(val('motion.spring_strength',1))}</output><input name="motion.spring_strength" type="range" min="0.6" max="1.5" step="0.1" value="${Number(val('motion.spring_strength',1))}"></label>
    <button class="cc-primary">Պահպանել ամբողջ դիզայնը</button>
  </form></article>`;
  $$('input[type="range"]',body).forEach(i=>i.oninput=()=>i.previousElementSibling.textContent=i.value);
  $('#cc-appearance',body).onsubmit=async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const entries=[...f.entries()];for(const [key,raw] of entries){let value=raw;if(['appearance.radius','appearance.glass_opacity','appearance.glass_blur','motion.speed','motion.spring_strength'].includes(key))value=Number(raw);if(key==='motion.enabled')value=raw==='true';const {data,error}=await sb.rpc('super_admin_set_site_setting',{p_key:key,p_value:value});if(error||!data)return toast(`Չպահպանվեց՝ ${key}`,'err')}track('appearance_updated');toast('Դիզայնը պահպանվեց','ok');window.dispatchEvent(new Event('portal:appearance-refresh'));};
}

async function database(body) {
  if(!isSuper()) return body.innerHTML='<div class="cc-empty">Միայն Super Admin</div>';
  const {data,error}=await sb.rpc('super_admin_db_overview');if(error)throw error;const overview=data||{};const tables=Object.keys(overview);
  body.innerHTML=`<div class="cc-grid cc-stats">${tables.map(k=>`<button class="cc-stat" data-db-table="${k}"><span>${esc(k)}</span><b>${Number(overview[k]||0)}</b></button>`).join('')}</div><article class="cc-card"><div class="cc-section-head"><h3>Data Browser</h3><select id="cc-db-select">${tables.map(k=>`<option>${esc(k)}</option>`).join('')}</select></div><div class="cc-warning">Անվտանգ ռեժիմ․ այստեղ տվյալները դիտվում են, իսկ վտանգավոր raw SQL-ը դիտավորյալ անջատված է։</div><pre id="cc-db-json" class="cc-json">Ընտրիր աղյուսակը…</pre></article>`;
  const load=async table=>{const host=$('#cc-db-json',body);host.textContent='Բեռնվում է…';const r=await sb.rpc('super_admin_db_rows',{p_table:table,p_limit:50});host.textContent=r.error?r.error.message:JSON.stringify(r.data,null,2);};
  $('#cc-db-select',body).onchange=e=>load(e.target.value);$$('[data-db-table]',body).forEach(b=>b.onclick=()=>{$('#cc-db-select',body).value=b.dataset.dbTable;load(b.dataset.dbTable)});await load(tables[0]);
}

async function audit(body) {
  if(!isSuper()) return body.innerHTML='<div class="cc-empty">Միայն Super Admin</div>';
  const {data,error}=await sb.from('audit_logs').select('id,actor_id,action,entity_type,entity_id,metadata,created_at').order('created_at',{ascending:false}).limit(100);if(error)throw error;
  body.innerHTML=`<div class="cc-list">${(data||[]).map(x=>`<article class="cc-card cc-audit"><div><b>${esc(x.action)}</b><span>${esc(x.entity_type||'')} · ${esc(x.entity_id||'')}</span></div><small>${fmt(x.created_at)}</small><code>${esc(JSON.stringify(x.metadata||{}))}</code></article>`).join('')||'<div class="cc-empty">Audit դատարկ է</div>'}</div>`;
}

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-nav="admin"],[data-nav="superadmin"]');
  if (nav) {
    event.preventDefault(); event.stopImmediatePropagation();
    openCenter(nav.dataset.nav);
    return;
  }
  if (cc.mode && event.target.closest('#refresh')) {
    event.preventDefault(); event.stopImmediatePropagation(); renderTab();
  }
}, true);

const observer = new MutationObserver(() => {
  if (!cc.mode) return;
  if (!$('#view') || $('.cc-shell')) return;
  requestAnimationFrame(() => openCenter(cc.mode));
});
observer.observe(document.body, { childList: true, subtree: true });
