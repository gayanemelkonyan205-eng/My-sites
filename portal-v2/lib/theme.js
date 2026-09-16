export function normalizeThemeSettings(input = {}) {
  const mode = input.theme_mode === 'light' ? 'light' : 'dark';
  const clamp = (value, min, max, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  };
  return {
    theme_mode: mode,
    background: mode === 'dark' ? '#000000' : '#F5F5F7',
    surface: mode === 'dark' ? '#0A0A0A' : '#FFFFFF',
    text: mode === 'dark' ? '#F5F5F7' : '#1D1D1F',
    muted: mode === 'dark' ? '#A1A1A6' : '#6E6E73',
    accent: /^#[0-9A-Fa-f]{6}$/.test(input.accent || '') ? input.accent : '#0A84FF',
    glass_opacity: clamp(input.glass_opacity, 0.36, 0.92, 0.58),
    glass_blur: clamp(input.glass_blur, 12, 48, 28),
    radius: clamp(input.radius, 14, 34, 24),
    motion_enabled: input.motion_enabled !== false,
    motion_speed: clamp(input.motion_speed, 0.6, 1.6, 1),
    spring_strength: clamp(input.spring_strength, 0.6, 1.5, 1)
  };
}

export function applyTheme(settings = {}) {
  const normalized = normalizeThemeSettings(settings);
  const root = document.documentElement;
  root.dataset.theme = normalized.theme_mode;
  root.style.setProperty('--bg', normalized.background);
  root.style.setProperty('--surface', normalized.surface);
  root.style.setProperty('--text', normalized.text);
  root.style.setProperty('--muted', normalized.muted);
  root.style.setProperty('--accent', normalized.accent);
  root.style.setProperty('--glass-opacity', String(normalized.glass_opacity));
  root.style.setProperty('--glass-blur', `${normalized.glass_blur}px`);
  root.style.setProperty('--radius', `${normalized.radius}px`);
  root.style.setProperty('--motion-speed', String(normalized.motion_speed));
  root.style.setProperty('--spring-strength', String(normalized.spring_strength));
  root.dataset.motion = normalized.motion_enabled ? 'on' : 'off';
  localStorage.setItem('portal-v2-theme', JSON.stringify(normalized));
  return normalized;
}

export function loadStoredTheme() {
  try {
    return JSON.parse(localStorage.getItem('portal-v2-theme') || 'null') || {};
  } catch {
    return {};
  }
}

export function setThemeMode(mode) {
  const current = loadStoredTheme();
  return applyTheme({ ...current, theme_mode: mode });
}
