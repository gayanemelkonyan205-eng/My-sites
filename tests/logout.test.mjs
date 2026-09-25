import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);

async function source(name) {
  return readFile(new URL(name, root), 'utf8');
}

test('shared logout runtime handles desktop and mobile using local signout', async () => {
  const logout = await source('logout-runtime.js');
  assert.match(logout, /signOut\s*\(\s*\{\s*scope\s*:\s*['"]local['"]\s*\}\s*\)/, 'logout should use local sign-out so it cannot hang on a global revoke request');
  assert.match(logout, /#logout/, 'desktop logout button should be intercepted by the shared logout runtime');
  assert.match(logout, /portal:logout/, 'mobile navigation should be able to request the same logout flow');
  assert.match(logout, /stopImmediatePropagation/, 'desktop legacy onclick must not also fire a second global sign-out');
});

test('stale server session is treated as a completed local logout', async () => {
  const logout = await source('logout-runtime.js');
  const client = await source('supabase-client.js');
  assert.match(client, /AUTH_STORAGE_KEY/, 'auth storage key should be explicit so stale browser state can be cleared safely');
  assert.match(logout, /session_not_found/, 'logout should recognize Supabase stale-session responses');
  assert.match(logout, /clearLocalAuthSession/, 'stale sessions should be removed from browser storage instead of trapping the user in the portal');
  assert.match(logout, /location\.reload/, 'the portal should reload after clearing stale auth state');
});

test('logout error toast is deduplicated', async () => {
  const logout = await source('logout-runtime.js');
  assert.match(logout, /data-toast-key/, 'logout errors should carry a stable dedupe key');
  assert.match(logout, /querySelector\([^\n]*logout-error/, 'a second logout error should reuse or suppress the existing toast');
});

test('mobile more sheet includes a destructive logout action', async () => {
  const nav = await source('simple-nav.js');
  const css = await source('simple-nav.css');
  assert.match(nav, /sn-logout/, 'mobile menu should render a dedicated logout action');
  assert.match(nav, /portal:logout/, 'mobile logout should delegate to shared auth instead of creating another Supabase client');
  assert.match(css, /\.sn-logout/, 'mobile logout should have a visible destructive treatment');
});

test('a failed remote sign-out still clears the local session and exits', async () => {
  let cleared = 0;
  let reloaded = 0;
  const context = vm.createContext({
    document: { querySelector: () => null, addEventListener() {} },
    window: { addEventListener() {}, dispatchEvent() {} },
    location: { reload() { reloaded++; } },
    localStorage: { getItem() { return cleared ? null : 'session'; } },
    CustomEvent: class {},
    console: { warn() {} }
  });
  const client = new vm.SyntheticModule(['sb', 'AUTH_STORAGE_KEY', 'clearLocalAuthSession'], function () {
    this.setExport('sb', { auth: { async signOut() { return { error: { name: 'AbortError', message: 'Request timed out' } }; } } });
    this.setExport('AUTH_STORAGE_KEY', 'test-auth-token');
    this.setExport('clearLocalAuthSession', () => { cleared++; return true; });
  }, { context });
  const push = new vm.SyntheticModule(['disablePush'], function () {
    this.setExport('disablePush', async () => true);
  }, { context });
  const module = new vm.SourceTextModule(await source('logout-runtime.js'), { context });
  await module.link(specifier => specifier.startsWith('./push-client.js') ? push : client);
  await module.evaluate();
  await module.namespace.logout();
  assert.equal(cleared, 1);
  assert.equal(reloaded, 1);
});
