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
    @media(max-width:900px){
      .mobile{display:flex!important;overflow-x:auto;overflow-y:hidden;gap:4px;scrollbar-width:none;justify-content:flex-start}
      .mobile::-webkit-scrollbar{display:none}
      .mobile button{flex:0 0 76px;min-width:76px;white-space:nowrap}
      .main{padding-bottom:96px!important}
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
    button.innerHTML = source.innerHTML.replace('Super Admin', 'Super').replace('Հայտարարություններ', 'Հայտ.').replace('Դասընկերներ', 'Դասընկ.').replace('Ծանուցումներ', 'Ծանուց.');
    button.addEventListener('click', () => {
      const current = document.querySelector(`.sidebar .nav [data-nav="${CSS.escape(key)}"]`);
      current?.click();
    });
    mobile.append(button);
  }
}

async function patchChatForm() {
  const form = document.querySelector('#compose');
  if (!form || form.dataset.robustChat === '1') return;
  form.dataset.robustChat = '1';

  // Replace the original optimistic-Realtime-only submit handler with a robust one.
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
    // Force a fresh message query; Realtime remains enabled as an additional fast path.
    const chatNav = document.querySelector('.sidebar .nav [data-nav="chat"]');
    chatNav?.click();
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
  patchChatForm();
  markSuperAdminAccess();
}

const observer = new MutationObserver(() => queueMicrotask(applyFixes));
observer.observe(document.documentElement, { subtree: true, childList: true });
applyFixes();
