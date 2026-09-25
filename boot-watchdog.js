(() => {
  const app = document.getElementById('app');
  if (!app) return;

  const recoveryKey = 'portal-boot-recovery-v1';
  let finished = false;

  const healthy = new Set(['LOGIN','PORTAL','COMPLETE_PROFILE','RESET_PASSWORD','BLOCKED','ERROR']);
  const onState = (event) => {
    const state = event?.detail?.state || app.dataset.bootState;
    if (healthy.has(state)) {
      finished = true;
      try { sessionStorage.removeItem(recoveryKey); } catch {}
    }
  };
  window.addEventListener('portal:boot-state', onState);

  setTimeout(() => {
    if (finished) return;
    const state = app.dataset.bootState || 'BOOTING';
    if (healthy.has(state)) return;

    let retried = false;
    try { retried = sessionStorage.getItem(recoveryKey) === '1'; } catch {}

    if (state === 'AUTH_CHECK' && !retried) {
      try {
        sessionStorage.setItem(recoveryKey, '1');
        localStorage.removeItem('sb-yknzcvooglrsvyidestj-auth-token');
      } catch {}
      const url = new URL(location.href);
      url.searchParams.set('recovery', Date.now().toString());
      location.replace(url.toString());
      return;
    }

    app.dataset.bootState = 'ERROR';
    app.innerHTML = `<div class="auth-side" style="min-height:100vh"><div class="auth-card"><div class="logo">Դ</div><h2>Չհաջողվեց բացել պորտալը</h2><p class="muted">Բեռնումը կանգ է առել։ Սեղմիր ներքևի կոճակը՝ նորից փորձելու համար։</p><button class="btn primary wide" id="hard-retry">Կրկին փորձել</button></div></div>`;
    document.getElementById('hard-retry')?.addEventListener('click', () => {
      try { sessionStorage.removeItem(recoveryKey); } catch {}
      const url = new URL(location.href);
      url.searchParams.set('retry', Date.now().toString());
      location.replace(url.toString());
    });
  }, 8000);
})();