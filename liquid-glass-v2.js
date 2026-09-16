const root = document.documentElement;

function syncDockLens() {
  const dock = document.querySelector('.mobile');
  if (!dock) return;
  const active = dock.querySelector('button.active') || dock.querySelector('button');
  if (!active) return;

  const dockRect = dock.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();
  const width = Math.max(64, Math.min(88, activeRect.width));
  const x = activeRect.left - dockRect.left + (activeRect.width - width) / 2 + dock.scrollLeft;

  dock.style.setProperty('--lg-active-x', `${x}px`);
  dock.style.setProperty('--lg-active-w', `${width}px`);
}

function addDockPressPhysics() {
  const dock = document.querySelector('.mobile');
  if (!dock || dock.dataset.liquidGlassReady === '1') return;
  dock.dataset.liquidGlassReady = '1';

  dock.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    requestAnimationFrame(() => requestAnimationFrame(syncDockLens));
  });

  dock.addEventListener('scroll', () => requestAnimationFrame(syncDockLens), { passive: true });
  syncDockLens();
}

function enhanceInteractiveCards() {
  document.querySelectorAll('.card:not([data-lg-enhanced])').forEach((card) => {
    card.dataset.lgEnhanced = '1';
    card.addEventListener('pointermove', (event) => {
      if (window.matchMedia('(pointer: coarse)').matches) return;
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
      card.style.transform = `perspective(900px) rotateX(${-y * 1.25}deg) rotateY(${x * 1.25}deg) translateY(-2px)`;
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });
}

function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  meta.content = root.dataset.theme === 'dark' ? '#000000' : '#f5f5f7';
}

function applyLiquidGlass() {
  addDockPressPhysics();
  enhanceInteractiveCards();
  syncDockLens();
  syncThemeColor();
}

const observer = new MutationObserver(() => requestAnimationFrame(applyLiquidGlass));
observer.observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['class', 'data-theme']
});

window.addEventListener('resize', syncDockLens, { passive: true });
window.addEventListener('orientationchange', () => setTimeout(syncDockLens, 180), { passive: true });

applyLiquidGlass();
