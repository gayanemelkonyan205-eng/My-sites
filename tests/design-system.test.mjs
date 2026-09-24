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
  assert.doesNotMatch(js, /--lg-bg/);
});

test('portal shell exposes premium styling hooks', async () => {
  const js = await src('portal.js');
  assert.match(js, /portal-shell/);
  assert.match(js, /portal-main/);
  assert.match(js, /portal-sidebar/);
});
