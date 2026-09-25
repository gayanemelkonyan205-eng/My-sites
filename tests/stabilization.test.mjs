import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const root = new URL('../', import.meta.url);

test('mobile dock keeps five actions and More opens every student section', async t => {
  const dom = new JSDOM('<!doctype html><html><body><aside class="sidebar"><nav class="nav"></nav></aside><nav class="mobile"></nav></body></html>', { url: 'https://portal.test/My-sites/', runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const { window } = dom;
  window.CSS ??= {};
  window.CSS.escape ??= value => value;
  window.MutationObserver = class { observe() {} disconnect() {} };
  window.requestAnimationFrame = callback => callback();
  const views = ['dashboard', 'schedule', 'homework', 'chat', 'notifications', 'announcements', 'board', 'classmates', 'polls', 'files', 'events', 'profile', 'settings'];
  for (const view of views) {
    const button = window.document.createElement('button');
    button.dataset.nav = view;
    if (view === 'dashboard') button.className = 'active';
    window.document.querySelector('.sidebar .nav').append(button);
  }
  const cache = new Map();
  async function load(name) {
    const url = new URL(name, root).href;
    if (cache.has(url)) return cache.get(url);
    const pending = (async () => {
      const module = new vm.SourceTextModule(await readFile(new URL(name, root), 'utf8'), { context: dom.getInternalVMContext(), identifier: url });
      await module.link((specifier, ref) => load(new URL(specifier, ref.identifier).href));
      return module;
    })();
    cache.set(url, pending);
    return pending;
  }
  const module = await load('simple-nav.js');
  await module.evaluate();
  const dock = window.document.querySelector('.mobile');
  assert.deepEqual([...dock.querySelectorAll('[data-simple-key]')].map(item => item.dataset.simpleKey), ['dashboard', 'study', 'chat', 'notifications', 'more']);
  dock.querySelector('[data-simple-key="more"]').click();
  const sheet = window.document.querySelector('.sn-sheet.sn-more');
  assert.ok(sheet);
  assert.deepEqual([...sheet.querySelectorAll('[data-sheet-view]')].map(item => item.dataset.sheetView), ['announcements', 'board', 'classmates', 'polls', 'files', 'events', 'profile', 'settings']);
  assert.ok(sheet.querySelector('[data-sheet-action="logout"]'));
  sheet.querySelector('.sn-sheet-close').click();
  assert.equal(window.document.querySelector('.sn-sheet'), null);
  assert.equal(dock.children.length, 5);
});

test('boot recovery never discards the stored auth session', async () => {
  const source = await readFile(new URL('boot-watchdog.js', root), 'utf8');
  assert.doesNotMatch(source, /localStorage\.removeItem/);
  assert.match(source, /data-boot-state|dataset\.bootState/);
});

test('service worker handles only portal navigations and never API traffic', async () => {
  const source = await readFile(new URL('sw.js', root), 'utf8');
  assert.match(source, /request\.mode!==['"]navigate['"]/);
  assert.match(source, /url\.origin!==self\.location\.origin/);
  assert.match(source, /const CACHE_NAME='class-portal-shell-v\d+'/);
});

test('push asks permission only on explicit enable and can be disabled', async t => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://portal.test/My-sites/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const { window } = dom;
  Object.defineProperty(window, 'isSecureContext', { value: true });
  let requested = 0;
  window.Notification = { permission: 'default', async requestPermission() { requested++; this.permission = 'granted'; return 'granted'; } };
  window.PushManager = class {};
  let subscription = null;
  const registration = { pushManager: { async getSubscription() { return subscription; }, async subscribe() { subscription = { endpoint: 'https://push.test/one', toJSON: () => ({ endpoint: 'https://push.test/one', keys: { p256dh: 'a', auth: 'b' } }), async unsubscribe() { subscription = null; return true; } }; return subscription; } } };
  window.navigator.serviceWorker = { async getRegistration() { return registration; }, async register() { return registration; } };
  let saved = false;
  const sb = { auth: { async getUser() { return { data: { user: { id: 'student-a' } }, error: null }; } }, from() { return { select() { return this; }, eq() { return this; }, async maybeSingle() { return { data: saved ? { id: 'one' } : null, error: null }; }, async upsert() { saved = true; return { error: null }; }, delete() { return { async eq() { saved = false; return { error: null }; } }; } }; } };
  const context = dom.getInternalVMContext();
  const client = new vm.SyntheticModule(['sb'], function () { this.setExport('sb', sb); }, { context });
  const module = new vm.SourceTextModule(await readFile(new URL('push-client.js', root), 'utf8'), { context, identifier: new URL('push-client.js', root).href });
  await module.link(() => client);
  await module.evaluate();
  assert.equal(requested, 0);
  assert.equal(await module.namespace.getPushStatus(), 'permission_required');
  assert.equal(requested, 0);
  assert.equal(await module.namespace.enablePush(), true);
  assert.equal(requested, 1);
  assert.equal(await module.namespace.getPushStatus(), 'enabled');
  assert.equal(await module.namespace.disablePush(), true);
  assert.equal(await module.namespace.getPushStatus(), 'disabled');
  window.Notification.permission = 'denied';
  assert.equal(await module.namespace.getPushStatus(), 'denied');
  await assert.rejects(module.namespace.enablePush(), /denied/);
  assert.equal(requested, 1);
  delete window.PushManager;
  assert.equal(await module.namespace.getPushStatus(), 'unsupported');
});
