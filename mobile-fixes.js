import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4?bundle';

const SB_URL = 'https://yknzcvooglrsvyidestj.supabase.co';
const SB_KEY = 'sb_publishable_BntzoD9F20GkbI5A0yhmQw_1Z5-WrtJ';
const sb = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

function addStyles() {
  if (document.getElementById('mobile-fixes-style')) return;
  const style = document.createElement('style');
  style.id = 'mobile-fixes-style';
  style.textContent = `
    .admin-shortcut{display:none}
    @media(max-width:900px){
      .mobile{display:flex!important;overflow-x:auto;overflow-y:hidden;gap:4px;scrollbar-width:none;justify-content:flex-start}
      .mobile::-webkit-scrollbar{display:none}
      .mobile button{flex:0 0 76px;min-width:76px;white-space:nowrap}
      .main{padding-bottom:96px!important}
      .admin-shortcut{display:inline-flex!important;align-items:center;gap:5px;padding:8px 10px;font-size:.78rem}
      .top .actions{flex-wrap:wrap;justify-content:flex-end}
    }
  `;
  document.head.append(style);
}

function ensureMobileNavigation() {
  const mobile = document.querySelector('.mobile');
  const desktopButtons = [...document.querySelectorAll('.sidebar .nav [data-nav]')];
  if (!mobile || !desktopButtons.length) return;

  const existing = new Set([...mobile.querySelectorAll('[data-nav]')].map((b) => b.dataset.nav));
  for (const source of desktopButtons) {
    const key = source.dataset.nav;
    if (!key || existing.has(key)) continue;
    const button = document.createElement('button');
    button.dataset.nav = key;
    button.innerHTML = source.innerHTML
      .replace('Super Admin', 'Super')
      .replace('Հայտարարություններ', 'Հայտ.')
      .replace('Դասընկերներ', 'Դասընկ.')
      .replace('Ծանուցումներ', 'Ծանուց.');
    button.addEventListener('click', () => {
      document.querySelector(`.sidebar .nav [data-nav="${CSS.escape(key)}"]`)?.click();
    });
    mobile.append(button);
  }
}

function ensureAdminShortcuts() {
  const actions = document.querySelector('.top .actions');
  if (!actions) return;

  const add = (key, label) => {
    const source = document.querySelector(`.sidebar .nav [data-nav="${key}"]`);
    const id = `mobile-${key}-shortcut`;
    if (!source || document.getElementById(id)) return;
    const button = document.createElement('button');
    button.id = id;
    button.className = 'btn admin-shortcut';
    button.type = 'button';
    button.textContent = label;
    button.onclick = () => document.querySelector(`.sidebar .nav [data-nav="${key}"]`)?.click();
    actions.prepend(button);
  };

  add('superadmin', '◆ Super');
  add('admin', '⚙ Admin');
}

function patchUsernameInputs() {
  document.querySelectorAll('input[name="username"]').forEach((input) => {
    input.removeAttribute('pattern');
    input.maxLength = 32;
    input.minLength = 3;
    input.title = '3–32 символа, без пробелов';
  });
}

async function patchChatForm() {
  const form = document.querySelector('#compose');
  if (!form || form.dataset.robustChat === '1') return;
  form.dataset.robustChat = '1';

  form.onsubmit = null;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const input = form.querySelector('input[name="body"]');
    const button = form.querySelector('button[type="submit"], button');
    const body = input?.value?.trim();
    const conversationId = document.querySelector('.conv.active[data-conv]')?.dataset.conv;
    if (!body || !conversationId) return;

    if (button) button.disabled = true;
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError || !userData.user) {
      if (button) button.disabled = false;
      showFixToast('Сессия истекла. Войди заново.', true);
      return;
    }

    const { error } = await sb.from('messages').insert({
      conversation_id: conversationId,
      sender_id: userData.user.id,
      type: 'TEXT',
      body
    });

    if (button) button.disabled = false;
    if (error) {
      showFixToast(`Чат: ${error.message}`, true);
      return;
    }

    input.value = '';
    document.querySelector('.sidebar .nav [data-nav="chat"]')?.click();
    showFixToast('Сообщение отправлено');
  }, true);
}

function showFixToast(text, error = false) {
  const box = document.querySelector('#toast');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${error ? 'err' : 'ok'}`;
  el.textContent = text;
  box.append(el);
  setTimeout(() => el.remove(), 3500);
}

function markSuperAdminAccess() {
  const roleText = [...document.querySelectorAll('.sidebar .small.muted, .card .badge')]
    .some((el) => el.textContent?.trim() === 'Super Admin');
  if (!roleText) return;
  const mobile = document.querySelector('.mobile');
  if (mobile && !mobile.dataset.superAdminReady) {
    mobile.dataset.superAdminReady = '1';
    mobile.title = 'SUPER_ADMIN access enabled';
  }
}

function applyFixes() {
  addStyles();
  ensureMobileNavigation();
  ensureAdminShortcuts();
  patchUsernameInputs();
  patchChatForm();
  markSuperAdminAccess();
}

const observer = new MutationObserver(() => queueMicrotask(applyFixes));
observer.observe(document.documentElement, { subtree: true, childList: true });
applyFixes();
