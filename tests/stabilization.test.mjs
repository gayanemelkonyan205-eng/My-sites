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
  assert.deepEqual([...sheet.querySelectorAll('[data-sheet-view]')].map(item => item.dataset.sheetView), ['settings', 'profile', 'announcements', 'board', 'classmates', 'polls', 'files', 'events']);
  assert.ok(sheet.querySelector('[data-sheet-action="logout"]'));
  let requestedView=null;
  window.addEventListener('portal:open',event=>{requestedView=event.detail.view});
  sheet.querySelector('[data-sheet-view="settings"]').click();
  assert.equal(requestedView,'settings','Settings must open without clicking the hidden desktop sidebar');
  assert.equal(window.document.querySelector('.sn-sheet'),null);
  dock.querySelector('[data-simple-key="more"]').click();
  window.document.querySelector('.sn-sheet-close').click();
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

test('Chrome can discover an installable portal manifest and both PNG icon sizes', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /rel="manifest" href="\.\/manifest\.webmanifest/);
  const manifest = JSON.parse(await readFile(new URL('manifest.webmanifest', root), 'utf8'));
  assert.equal(manifest.start_url, '/My-sites/');
  assert.equal(manifest.scope, '/My-sites/');
  assert.equal(manifest.display, 'standalone');
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(item => item.sizes === `${size}x${size}` && item.type === 'image/png');
    assert.ok(icon, `missing ${size}px PNG icon`);
    const png = await readFile(new URL(icon.src.slice('/My-sites/'.length), root));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
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
  let currentUser = 'student-a', owner = null;
  const sb = {
    auth: { async getUser() { return { data: { user: { id: currentUser } }, error: null }; } },
    async rpc(name,args) {
      assert.equal(name,'claim_push_subscription');
      assert.equal(args.p_endpoint,'https://push.test/one');
      owner=currentUser;
      return { data:true,error:null };
    },
    from() {
      let userId=null;
      return {
        select() { return this; },
        eq(column,value) { if(column==='user_id')userId=value; return this; },
        async maybeSingle() { return { data: owner===userId ? { id:'one' } : null,error:null }; },
        delete() { return { eq() { return this; }, async then(resolve) { owner=null; resolve({error:null}); } }; }
      };
    }
  };
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
  currentUser='student-b';
  assert.equal(await module.namespace.getPushStatus(), 'disabled');
  assert.equal(await module.namespace.syncPushIfAllowed(), true,'existing browser permission links the new account');
  assert.equal(requested,1,'account switch must not open another permission prompt');
  assert.equal(owner,'student-b');
  assert.equal(await module.namespace.getPushStatus(), 'enabled');
  assert.equal(await module.namespace.disablePush(), true);
  assert.equal(await module.namespace.getPushStatus(), 'disabled');
  assert.equal(await module.namespace.syncPushIfAllowed(), false,'explicitly disabled push stays off');
  window.Notification.permission = 'denied';
  assert.equal(await module.namespace.getPushStatus(), 'denied');
  await assert.rejects(module.namespace.enablePush(), /denied/);
  assert.equal(requested, 1);
  delete window.PushManager;
  assert.equal(await module.namespace.getPushStatus(), 'unsupported');
});
