import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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

test('mobile more sheet includes a destructive logout action', async () => {
  const nav = await source('simple-nav.js');
  const css = await source('simple-nav.css');
  assert.match(nav, /sn-logout/, 'mobile menu should render a dedicated logout action');
  assert.match(nav, /portal:logout/, 'mobile logout should delegate to shared auth instead of creating another Supabase client');
  assert.match(css, /\.sn-logout/, 'mobile logout should have a visible destructive treatment');
});
