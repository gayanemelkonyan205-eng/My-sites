import { sb } from './supabase-client.js';

let signingOut = false;

function showLogoutError() {
  const box = document.querySelector('#toast');
  if (!box) return;
  const message = document.createElement('div');
  message.className = 'toast err';
  message.textContent = 'Դուրս գալը չհաջողվեց։ Փորձիր կրկին։';
  box.append(message);
  setTimeout(() => message.remove(), 4200);
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
    console.error('Logout failed:', error);
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
