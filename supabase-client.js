let createClient;
try {
  ({ createClient } = await import('https://esm.sh/@supabase/supabase-js@2.57.4?bundle'));
} catch (primaryError) {
  console.warn('Primary Supabase CDN failed, using fallback.', primaryError);
  ({ createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm'));
}

export const AUTH_STORAGE_KEY = 'sb-yknzcvooglrsvyidestj-auth-token';

export function clearLocalAuthSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear local auth storage:', error);
  }
}

// All portal modules share this instance and its single auth lifecycle.
export const sb = createClient(
  'https://yknzcvooglrsvyidestj.supabase.co',
  'sb_publishable_BntzoD9F20GkbI5A0yhmQw_1Z5-WrtJ',
  {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    global: { fetch: async (url, options = {}) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      const upload = /\/storage\/v1\/object\//.test(String(url)) && ['POST','PUT'].includes(options.method);
      const timer = setTimeout(abort, upload ? 120000 : 10000);
      if (options.signal?.aborted) abort();
      else options.signal?.addEventListener('abort', abort, { once: true });
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        if (!response.body) return response;
        const body = await response.arrayBuffer();
        return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
      }
      finally {
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
      }
    } }
  }
);
