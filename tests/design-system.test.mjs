import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const src = name => readFile(new URL(name, root), 'utf8');

test('premium theme owns the shared design tokens', async () => {
  const css = await src('premium-minimal.css');
  assert.match(css, /--pm-bg\s*:\s*#000/i);
  assert.match(css, /--pm-surface/);
  assert.match(css, /--pm-accent/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
});

test('index loads one final premium theme layer after legacy styles', async () => {
  const html = await src('index.html');
  assert.match(html, /premium-minimal\.css\?v=/);
  assert.ok(html.indexOf('premium-minimal.css') > html.indexOf('simple-nav.css'));
});

test('appearance runtime only overrides approved premium tokens', async () => {
  const js = await src('appearance-runtime.js');
  assert.match(js, /--pm-accent/);
  assert.match(js, /--pm-radius/);
  assert.match(js, /--pm-blur/);
  assert.match(js, /--pm-motion/);
  assert.doesNotMatch(js, /--lg-/);
  assert.doesNotMatch(js, /--cc-/);
});

test('premium layer restyles the existing shell without changing portal behavior', async () => {
  const css = await src('premium-minimal.css');
  const portal = await src('portal.js');
  assert.match(portal, /class="portal"/);
  assert.match(portal, /class="sidebar"/);
  assert.match(portal, /class="main"/);
  assert.match(css, /\.portal\s*\{/);
  assert.match(css, /\.sidebar\s*\{/);
  assert.match(css, /\.main\s*\{/);
  assert.match(css, /@media\s*\(max-width:900px\)[\s\S]*\.sidebar\s*\{[^}]*display\s*:\s*none/i);
  assert.match(css, /\.mobile\[data-simple-nav="1"\]/);
});

test('premium components are minimal, semantic and motion-safe', async () => {
  const css = await src('premium-minimal.css');
  assert.match(css, /\.card[^\{]*\{/);
  assert.match(css, /\.btn\.primary/);
  assert.match(css, /\.btn\.bad/);
  assert.match(css, /#toast \.toast:nth-last-child\(n\+5\)/);
  assert.match(css, /@keyframes\s+pmViewIn/);
  assert.match(css, /@keyframes\s+pmCardIn/);
  assert.doesNotMatch(css, /#0b1020|#0b1434|#18234a/i);
});

test('auth chat and control center share the premium minimal language', async () => {
  const css = await src('premium-minimal.css');
  assert.match(css, /\.hero-grid\s*\{[^}]*display\s*:\s*none/i);
  assert.match(css, /\.msg\.mine/);
  assert.match(css, /\.chat-room \.compose/);
  assert.match(css, /body:has\(#compose (?:input|textarea):focus\) \.mobile/);
  assert.match(css, /\.cc-hero h2\s*\{[^}]*display\s*:\s*none/i);
  assert.match(css, /\.cc-tabbar/);
});

test('critical auth and navigation selectors remain unchanged', async () => {
  const portal = await src('portal.js');
  for (const selector of ['#login','#glogin','#forgot-password','#refresh','#pr']) {
    assert.match(portal, new RegExp(selector.replace('#','\\#')));
  }
  assert.match(portal, /data-nav="\$\{k\}"/);
});
