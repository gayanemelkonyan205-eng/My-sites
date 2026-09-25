import { sb, AUTH_STORAGE_KEY, clearLocalAuthSession } from './supabase-client.js';

let signingOut = false;
const LOGOUT_ERROR_KEY = 'logout-error';

function showLogoutError() {
  const box = document.querySelector('#toast');
  if (!box) return;
  const existing = box.querySelector('[data-toast-key="logout-error"]');
  if (existing) return;

  const message = document.createElement('div');
  message.className = 'toast err';
  message.dataset.toastKey = LOGOUT_ERROR_KEY;
  message.textContent = 'Դուրս գալը չհաջողվեց։ Փորձիր կրկին։';
  box.append(message);
  setTimeout(() => message.remove(), 4200);
}

function isStaleSession(error) {
  return error?.code === 'session_not_found' || error?.status === 403 && /session not found/i.test(error?.message || '');
}

function finishLocalLogout() {
  clearLocalAuthSession();
  try {
    if (localStorage.getItem(AUTH_STORAGE_KEY) !== null) return false;
  } catch { return false; }
  location.reload();
  return true;
}

export async function logout() {
  if (signingOut) return;
  signingOut = true;
  const desktopButton = document.querySelector('#logout');
  if (desktopButton) desktopButton.disabled = true;

  try {
    const { error } = await sb.auth.signOut({ scope: 'local' });
    if (error) throw error;
  } catch (error) {
    // A local sign-out still calls Auth and may fail offline or with an expired session.
    // Clearing the browser session is enough to complete the requested local logout.
    console.warn(isStaleSession(error) ? 'Stale logout session:' : 'Logout request failed:', error);
    if (finishLocalLogout()) return;
    showLogoutError();
    window.dispatchEvent(new CustomEvent('portal:logout-error', {
      detail: { name: error?.name || 'Error' }
    }));
  } finally {
    signingOut = false;
    if (desktopButton?.isConnected) desktopButton.disabled = false;
  }
}

// portal.js still contains the original desktop onclick. Capture the click first so
// a single local sign-out runs instead of also firing the legacy global sign-out.
document.addEventListener('click', (event) => {
  const button = event.target.closest?.('#logout');
  if (!button) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  logout();
}, true);

window.addEventListener('portal:logout', () => logout());
window.addEventListener('storage', event => {
  if (event.key === AUTH_STORAGE_KEY && event.newValue === null && document.querySelector('.portal')) location.reload();
});
