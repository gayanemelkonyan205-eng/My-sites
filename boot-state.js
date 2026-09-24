export function setBootState(state) {
  const host = document.querySelector('#app');
  if (!host || host.dataset.bootState === state) return;
  host.dataset.bootState = state;
  window.dispatchEvent(new CustomEvent('portal:boot-state', { detail: { state } }));
}

export function showBootError() {
  const host = document.querySelector('#app');
  if (!host) return;
  setBootState('ERROR');
  host.innerHTML = `<div class="auth-side" style="min-height:100vh"><div class="auth-card"><div class="logo">Դ</div><h2>Չհաջողվեց բեռնել</h2><p class="muted">Կապը չի պատասխանել։ Ստուգիր ինտերնետը և փորձիր նորից։</p><button class="btn primary wide" id="boot-retry">Կրկին փորձել</button></div></div>`;
  host.querySelector('#boot-retry').addEventListener('click', () => location.reload());
}
