import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function source(name) {
  return readFile(new URL(name, root), 'utf8');
}

test('portal logout uses local signout and a shared logout handler', async () => {
  const portal = await source('portal.js');
  assert.match(portal, /function\s+logout\s*\(/, 'portal should expose one shared logout handler');
  assert.match(portal, /signOut\s*\(\s*\{\s*scope\s*:\s*['"]local['"]\s*\}\s*\)/, 'logout should use local sign-out so it cannot hang on a global revoke request');
  assert.match(portal, /#logout['"]?\)?\.onclick\s*=\s*logout|\$\(['"]#logout['"]\)\.onclick\s*=\s*logout/, 'desktop logout button should use the shared handler');
  assert.match(portal, /portal:logout/, 'mobile navigation should be able to request the same logout flow');
});

test('mobile more sheet includes a destructive logout action', async () => {
  const nav = await source('simple-nav.js');
  const css = await source('simple-nav.css');
  assert.match(nav, /sn-logout/, 'mobile menu should render a dedicated logout action');
  assert.match(nav, /portal:logout/, 'mobile logout should delegate to portal auth instead of creating another Supabase client');
  assert.match(css, /\.sn-logout/, 'mobile logout should have a visible destructive treatment');
});
