import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4?bundle';

const SB_URL = 'https://yknzcvooglrsvyidestj.supabase.co';
const SB_KEY = 'sb_publishable_BntzoD9F20GkbI5A0yhmQw_1Z5-WrtJ';
const sb = createClient(SB_URL, SB_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

let currentConversationId = null;
let realtimeChannel = null;
let pollTimer = null;
let refreshTimer = null;
let viewerId = null;

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

const formatTime = (value) => value
  ? new Intl.DateTimeFormat('hy-AM', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  : '—';

function ensureStyle() {
  if (document.querySelector('#chat-reliable-style')) return;
  const style = document.createElement('style');
  style.id = 'chat-reliable-style';
  style.textContent = `
    .chat-connection{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--lg-line,rgba(127,127,127,.18));font-size:12px;color:var(--lg-muted,#8e8e93)}
    .chat-connection .dot{width:8px;height:8px;border-radius:50%;background:#ff9f0a;box-shadow:0 0 0 4px rgba(255,159,10,.12)}
    .chat-connection.online .dot{background:#30d158;box-shadow:0 0 0 4px rgba(48,209,88,.12)}
    .chat-connection.offline .dot{background:#ff453a;box-shadow:0 0 0 4px rgba(255,69,58,.12)}
    .msg.pending{opacity:.68;filter:saturate(.7)}
    .msg.pending:after{content:' · ուղարկվում է…';font-size:11px;opacity:.7}
  `;
  document.head.append(style);
}

function showToast(message, kind = '') {
  const host = document.querySelector('#toast');
  if (!host) return;
  const item = document.createElement('div');
  item.className = `toast ${kind}`;
  item.textContent = message;
  host.append(item);
  setTimeout(() => item.remove(), 4500);
}

function getActiveConversationId() {
  return document.querySelector('.conv.active')?.dataset?.conv || null;
}

function getMessagesBox() {
  return document.querySelector('#messages');
}

function getComposer() {
  return document.querySelector('#compose');
}

function setConnection(state, text) {
  const room = document.querySelector('.chat-room');
  if (!room) return;
  let badge = room.querySelector('.chat-connection');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'chat-connection';
    badge.innerHTML = '<span class="dot"></span><span class="label"></span>';
    room.prepend(badge);
  }
  badge.classList.remove('online', 'offline');
  if (state) badge.classList.add(state);
  badge.querySelector('.label').textContent = text;
}

async function ensureViewer() {
  if (viewerId) return viewerId;
  const { data } = await sb.auth.getSession();
  viewerId = data?.session?.user?.id || null;
  return viewerId;
}

function renderRows(rows) {
  const box = getMessagesBox();
  if (!box) return;
  const html = (rows || []).map((message) => {
    const mine = message.sender_id === viewerId;
    const senderName = `${message.sender?.first_name || ''} ${message.sender?.last_name || ''}`.trim();
    const who = mine ? 'Դուք' : (senderName || 'Մասնակից');
    return `<div class="msg ${mine ? 'mine' : ''}" data-message-id="${escapeHtml(message.id)}">
      <div class="who">${escapeHtml(who)}</div>
      ${escapeHtml(message.body || '').replace(/\n/g, '<br>')}
      <div class="small muted">${formatTime(message.created_at)}</div>
    </div>`;
  }).join('');
  box.innerHTML = html || '<div class="empty">Առաջին հաղորդագրությունը կարող է քոնը լինել ✨</div>';
  box.scrollTop = box.scrollHeight;
}

async function attachSenders(messages) {
  const ids = [...new Set((messages || []).map((message) => message.sender_id).filter(Boolean))];
  if (!ids.length) return messages || [];

  const { data: profiles, error } = await sb
    .from('profiles')
    .select('id,first_name,last_name')
    .in('id', ids);

  if (error) {
    console.warn('Chat sender profiles unavailable:', error.message);
    return messages || [];
  }

  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]));
  return (messages || []).map((message) => ({
    ...message,
    sender: message.sender_id ? (byId.get(message.sender_id) || null) : null
  }));
}

async function loadMessages(conversationId = currentConversationId) {
  if (!conversationId || !getMessagesBox()) return;
  await ensureViewer();

  // Do not embed profiles in this request. PostgREST can keep stale relationship
  // metadata after schema changes and report an ambiguous relationship. Loading
  // messages and sender profiles separately is explicit and resilient.
  const { data: messages, error } = await sb
    .from('messages')
    .select('id,conversation_id,sender_id,body,created_at,deleted_at')
    .eq('conversation_id', conversationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(250);

  if (error) {
    setConnection('offline', 'Չատը չի թարմացվում');
    showToast(`Չատի սխալ՝ ${error.message}`, 'err');
    return;
  }

  const rows = await attachSenders(messages || []);
  if (conversationId !== currentConversationId) return;
  renderRows(rows);
}

function scheduleRefresh(delay = 120) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => loadMessages(), delay);
}

function stopPolling() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    if (document.hidden || !getMessagesBox()) return;
    loadMessages();
  }, 5000);
}

async function subscribeToConversation(conversationId) {
  if (!conversationId) return;
  if (realtimeChannel) {
    await sb.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  stopPolling();
  currentConversationId = conversationId;
  setConnection('', 'Միացում…');
  await loadMessages(conversationId);

  realtimeChannel = sb
    .channel(`reliable-chat-${conversationId}-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, () => scheduleRefresh(60))
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnection('online', 'Առցանց');
        stopPolling();
        scheduleRefresh(0);
        return;
      }
      if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        setConnection('offline', 'Realtime կապ չկա · ավտոմատ թարմացում');
        startPolling();
      }
    });
}

function appendOptimistic(body) {
  const box = getMessagesBox();
  if (!box) return null;
  box.querySelector('.empty')?.remove();
  const element = document.createElement('div');
  element.className = 'msg mine pending';
  element.innerHTML = `<div class="who">Դուք</div>${escapeHtml(body).replace(/\n/g, '<br>')}<div class="small muted">հիմա</div>`;
  box.append(element);
  box.scrollTop = box.scrollHeight;
  return element;
}

async function sendMessage(form) {
  const input = form.querySelector('input[name="body"], textarea[name="body"]');
  const submit = form.querySelector('button[type="submit"], button:not([type])');
  const body = input?.value?.trim();
  const conversationId = getActiveConversationId() || currentConversationId;
  if (!body || !conversationId) return;

  const userId = await ensureViewer();
  if (!userId) {
    showToast('Սեսիան ավարտվել է։ Մուտք գործիր նորից։', 'err');
    return;
  }

  const optimistic = appendOptimistic(body);
  input.value = '';
  if (submit) submit.disabled = true;
  input.disabled = true;

  const { error } = await sb.from('messages').insert({
    conversation_id: conversationId,
    sender_id: userId,
    type: 'TEXT',
    body
  });

  if (submit) submit.disabled = false;
  input.disabled = false;
  input.focus();

  if (error) {
    optimistic?.remove();
    input.value = body;
    setConnection('offline', 'Ուղարկումը չհաջողվեց');
    showToast(`Հաղորդագրությունը չուղարկվեց՝ ${error.message}`, 'err');
    return;
  }

  await loadMessages(conversationId);
  setConnection(realtimeChannel ? 'online' : '', realtimeChannel ? 'Առցանց' : 'Թարմացված');
}

function syncChat() {
  const composer = getComposer();
  const conversationId = getActiveConversationId();
  if (!composer || !conversationId) {
    if (!document.querySelector('.chat-room')) {
      currentConversationId = null;
      stopPolling();
      if (realtimeChannel) {
        sb.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }
    }
    return;
  }

  if (conversationId !== currentConversationId) subscribeToConversation(conversationId);
}

ensureStyle();

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== 'compose') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  sendMessage(form);
}, true);

const observer = new MutationObserver(() => {
  requestAnimationFrame(syncChat);
});
observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && currentConversationId) scheduleRefresh(0);
});
window.addEventListener('online', () => {
  if (currentConversationId) subscribeToConversation(currentConversationId);
});
window.addEventListener('offline', () => {
  if (currentConversationId) {
    setConnection('offline', 'Ինտերնետ կապ չկա');
    startPolling();
  }
});

syncChat();
