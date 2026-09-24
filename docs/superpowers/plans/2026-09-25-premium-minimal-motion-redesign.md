# Premium Minimal Motion Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire 9Ա Class Portal into one consistent black/graphite, purple-blue, minimal, softly animated interface while preserving the current Supabase/Auth/chat/admin behavior.

**Architecture:** Keep the current static HTML + ES modules + Supabase runtime. Consolidate appearance into one shared token/component CSS layer, make `appearance-runtime.js` only override approved tokens, then progressively restyle the shell, shared components, chat, Admin and Super Admin without changing data flow. Existing runtime modules stay isolated from boot/auth.

**Tech Stack:** HTML, CSS, vanilla ES modules, Supabase JS, JSDOM/Node test runner, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-25-premium-minimal-motion-design.md`

## Global Constraints

- Preserve existing Supabase project, schema, authentication, invite-code logic, roles, RLS, chat authorization, Admin/Super Admin permissions, message deletion permissions, and existing data.
- Baseline dark theme must be true black/graphite, not navy/blue.
- Accent remains restrained purple-to-blue and is used mainly for active states, primary actions, avatars, and own chat messages.
- Motion must stay short and premium: roughly 220–320ms for section/modal transitions, 25–50ms stagger increments, subtle press scale only.
- Respect `prefers-reduced-motion` and the existing `motion.enabled` setting.
- Visual enhancement modules must never block login, auth checking, or the portal boot path.
- Mobile primary navigation remains Home, Study, Chat, Notifications, More.

## Review Focus

- Refresh after Super Admin appearance changes must preserve the approved black/graphite baseline instead of reverting to the older navy palette.
- Light mode/custom appearance settings must not override structural spacing, component radii, navigation layout, or semantic colors into unreadable combinations.
- Mobile viewport widths from 320px upward must keep the bottom navigation usable, avoid horizontal page overflow, and expose logout through More.
- Chat composer, message list and mobile keyboard must not be obscured by the bottom dock.
- `prefers-reduced-motion: reduce` and `motion.enabled=false` must remove meaningful translation/scale animation while retaining a usable interface.

---

### Task 1: Lock the design contract with regression tests

**Files:**
- Create: `tests/design-system.test.mjs`
- Modify: `tests/syntax-check.mjs`

**Interfaces:**
- Consumes: current root CSS files and runtime modules.
- Produces: source-level regression checks that later tasks must satisfy.

- [ ] **Step 1: Write failing design-system tests**

```js
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
```

- [ ] **Step 2: Run tests and verify they fail before implementation**

Run: `npm test --prefix tests`

Expected: FAIL because `premium-minimal.css` and premium shell hooks do not yet exist.

- [ ] **Step 3: Extend syntax check to include new JS files created later**

Keep `tests/syntax-check.mjs` scanning all root `*.js` ES modules and explicitly exclude only third-party/generated files. Do not exclude the redesign runtime.

- [ ] **Step 4: Commit the failing contract tests**

```bash
git add tests/design-system.test.mjs tests/syntax-check.mjs
git commit -m "test: lock premium design system contract"
```

---

### Task 2: Create one source of truth for colors, spacing, surfaces and motion

**Files:**
- Create: `premium-minimal.css`
- Modify: `index.html`
- Modify: `appearance-runtime.js`

**Interfaces:**
- Consumes: `data-theme`, `appearance.*` and `motion.*` settings already returned by `get_public_site_settings`.
- Produces: shared tokens `--pm-bg`, `--pm-surface`, `--pm-surface-strong`, `--pm-text`, `--pm-muted`, `--pm-line`, `--pm-accent`, `--pm-accent-2`, `--pm-radius`, `--pm-blur`, `--pm-motion`.

- [ ] **Step 1: Add the final CSS layer to `index.html` after all legacy styles**

```html
<link rel="stylesheet" href="./simple-nav.css?v=3">
<link rel="stylesheet" href="./premium-minimal.css?v=1">
```

This layer must be last so it intentionally resolves the current stack of `portal.css`, `liquid-glass-v2.css`, Control Center CSS and chat polish.

- [ ] **Step 2: Define the baseline tokens and semantic colors**

Start `premium-minimal.css` with:

```css
:root{
  --pm-bg:#f5f5f7;
  --pm-surface:rgba(255,255,255,.76);
  --pm-surface-strong:#fff;
  --pm-text:#151518;
  --pm-muted:#73737a;
  --pm-line:rgba(18,18,22,.10);
  --pm-accent:#6d5dfc;
  --pm-accent-2:#2f8cff;
  --pm-good:#30d158;
  --pm-warn:#ff9f0a;
  --pm-bad:#ff453a;
  --pm-radius:22px;
  --pm-blur:24px;
  --pm-motion:1;
  --pm-shadow:0 18px 50px rgba(0,0,0,.10);
  --pm-ease:cubic-bezier(.2,.82,.2,1);
}
html[data-theme="dark"]{
  --pm-bg:#000;
  --pm-surface:rgba(15,15,17,.82);
  --pm-surface-strong:#121214;
  --pm-text:#f7f7f8;
  --pm-muted:#97979f;
  --pm-line:rgba(255,255,255,.095);
  --pm-shadow:0 22px 60px rgba(0,0,0,.48);
}
```

- [ ] **Step 3: Make appearance settings map only to approved tokens**

Replace direct legacy-token writes in `appearance-runtime.js` with:

```js
r.style.setProperty('--pm-accent', m['appearance.accent'] || '#6D5DFC');
r.style.setProperty('--pm-radius', `${Math.min(30, Math.max(14, Number(m['appearance.radius'] || 22)))}px`);
r.style.setProperty('--pm-blur', `${Math.min(40, Math.max(10, Number(m['appearance.glass_blur'] || 24)))}px`);
r.style.setProperty('--pm-motion', String(Math.min(1.5, Math.max(.6, Number(m['motion.speed'] || 1)))));
```

Keep `data-theme`, identity title and `motion-off` behavior. Do not let settings rewrite layout dimensions or background to navy.

- [ ] **Step 4: Add reduced-motion handling in the shared layer**

```css
.motion-off *,
.motion-off *::before,
.motion-off *::after{
  animation-duration:.01ms!important;
  animation-iteration-count:1!important;
  transition-duration:.01ms!important;
}
@media (prefers-reduced-motion:reduce){
  *,*::before,*::after{
    animation-duration:.01ms!important;
    animation-iteration-count:1!important;
    transition-duration:.01ms!important;
    scroll-behavior:auto!important;
  }
}
```

- [ ] **Step 5: Run the design contract tests**

Run: `npm test --prefix tests`

Expected: the token/index/appearance tests from Task 1 pass; shell-hook test still fails.

- [ ] **Step 6: Commit**

```bash
git add premium-minimal.css index.html appearance-runtime.js
git commit -m "feat: add premium minimal design tokens"
```

---

### Task 3: Restyle the application shell and navigation

**Files:**
- Modify: `portal.js`
- Modify: `premium-minimal.css`
- Modify: `simple-nav.css`
- Test: `tests/design-system.test.mjs`

**Interfaces:**
- Consumes: `items()`, existing `data-nav` behavior, existing mobile `simple-nav.js` augmentation.
- Produces: stable hooks `.portal-shell`, `.portal-sidebar`, `.portal-main`, `.portal-topbar`, `.portal-view` without changing navigation semantics.

- [ ] **Step 1: Add a failing DOM test for shell hooks**

Extend `tests/design-system.test.mjs` to assert the premium hook names exist in `portal.js` and that `.portal-sidebar` becomes hidden at `max-width:900px` in `premium-minimal.css`.

- [ ] **Step 2: Add semantic shell hooks without changing event behavior**

Change the existing portal wrapper markup so the same elements also include:

```html
<div class="portal portal-shell">
  <aside class="sidebar portal-sidebar">...</aside>
  <main class="main portal-main">
    <div class="top portal-topbar">...</div>
    <section id="view" class="portal-view"></section>
  </main>
</div>
```

Keep every existing `data-nav`, `#refresh`, `#theme`, `#theme2`, `#logout` id unchanged.

- [ ] **Step 3: Implement the desktop shell visual language**

Add to `premium-minimal.css`:

```css
body{background:var(--pm-bg)!important;color:var(--pm-text)!important}
.portal-shell{grid-template-columns:248px minmax(0,1fr)!important;gap:0}
.portal-sidebar{
  margin:14px 0 14px 14px!important;
  height:calc(100svh - 28px)!important;
  border:1px solid var(--pm-line)!important;
  border-radius:26px!important;
  background:color-mix(in srgb,var(--pm-surface) 88%,transparent)!important;
  box-shadow:var(--pm-shadow)!important;
  backdrop-filter:blur(var(--pm-blur)) saturate(145%)!important;
}
.portal-main{max-width:1500px;width:100%;margin:0 auto;padding:28px clamp(18px,3.5vw,48px) 110px!important}
.portal-topbar h1{font-size:clamp(32px,4vw,48px)!important;font-weight:820;letter-spacing:-.055em}
```

- [ ] **Step 4: Simplify sidebar states**

Use a neutral hover and a restrained accent active state, not a filled blue block:

```css
.portal-sidebar .nav button{color:var(--pm-muted)!important;background:transparent!important;border-radius:14px!important}
.portal-sidebar .nav button:hover{color:var(--pm-text)!important;background:rgba(127,127,127,.07)!important}
.portal-sidebar .nav button.active{color:var(--pm-text)!important;background:linear-gradient(135deg,rgba(109,93,252,.14),rgba(47,140,255,.08))!important;box-shadow:inset 0 0 0 1px var(--pm-line)}
```

- [ ] **Step 5: Keep mobile dock glassy but minimal**

In `simple-nav.css`, remove excessive glow and keep one subtle active lift. The dock remains five items and the More sheet stays the place for secondary pages/logout.

- [ ] **Step 6: Run tests and syntax check**

Run:

```bash
npm test --prefix tests
node tests/syntax-check.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add portal.js premium-minimal.css simple-nav.css tests/design-system.test.mjs
git commit -m "feat: unify premium portal shell"
```

---

### Task 4: Unify cards, forms, buttons, lists, tables, modals, toasts and loading states

**Files:**
- Modify: `premium-minimal.css`
- Modify: `portal.js`
- Modify: `control-center.css`
- Modify: `control-center-extensions.css`
- Test: `tests/design-system.test.mjs`

**Interfaces:**
- Consumes: existing `.card`, `.item`, `.btn`, `.badge`, `.modal`, `.toast`, `.empty` class names.
- Produces: one shared component appearance across student/Admin/Super Admin views.

- [ ] **Step 1: Add source tests preventing blue/navy dark surfaces**

Add assertions that `premium-minimal.css` contains `--pm-bg:#000` and that newly introduced shared dark surfaces do not use `#0b1020`, `#0b1434`, or `#18234a`.

- [ ] **Step 2: Restyle shared surfaces**

```css
.card,.chat-list,.chat-room,.modal,.cc-card,.cc-hero{
  border:1px solid var(--pm-line)!important;
  background:var(--pm-surface)!important;
  box-shadow:none!important;
  backdrop-filter:blur(calc(var(--pm-blur) * .8)) saturate(135%)!important;
}
.card,.cc-card{border-radius:var(--pm-radius)!important}
.item{background:rgba(127,127,127,.045)!important;border-color:var(--pm-line)!important}
```

- [ ] **Step 3: Restyle buttons by semantic importance**

Primary buttons use the purple-blue gradient; normal buttons remain neutral; destructive buttons use restrained red. Preserve existing `.btn.good`, `.btn.bad`, `.cc-primary`, `.cc-danger` selectors so JS does not need to change.

- [ ] **Step 4: Simplify inputs and tables**

Inputs use one neutral surface and visible focus ring. Tables lose spreadsheet-heavy borders; keep only row separators and enough spacing for touch targets.

- [ ] **Step 5: Replace toast stacking overflow with a capped presentation**

Add:

```css
#toast{display:flex!important;flex-direction:column;align-items:flex-end;max-height:min(52vh,420px);overflow:hidden;pointer-events:none}
.toast{pointer-events:auto;animation:pmToastIn calc(240ms * var(--pm-motion)) var(--pm-ease)}
#toast .toast:nth-last-child(n+5){display:none}
```

This prevents repeated error messages from covering half the screen without changing error generation logic.

- [ ] **Step 6: Add shared motion primitives**

```css
.portal-view{animation:pmViewIn calc(280ms * var(--pm-motion)) var(--pm-ease)}
.card,.cc-card{animation:pmCardIn calc(260ms * var(--pm-motion)) var(--pm-ease) both}
.btn:active,.cc-primary:active,.cc-secondary:active{transform:scale(.97)!important}
@keyframes pmViewIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes pmCardIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes pmToastIn{from{opacity:0;transform:translateY(8px) scale(.98)}to{opacity:1;transform:none}}
```

- [ ] **Step 7: Run tests and commit**

```bash
npm test --prefix tests
node tests/syntax-check.mjs
git add premium-minimal.css portal.js control-center.css control-center-extensions.css tests/design-system.test.mjs
git commit -m "feat: unify premium portal components"
```

---

### Task 5: Redesign login, dashboard, study screens and profile with minimal content hierarchy

**Files:**
- Modify: `portal.js`
- Modify: `premium-minimal.css`
- Test: `tests/portal-runtime.test.mjs`

**Interfaces:**
- Consumes: existing auth handlers, dashboard queries, schedule/homework/profile queries and form submissions.
- Produces: same ids/forms/data behavior with simpler markup and stronger hierarchy.

- [ ] **Step 1: Extend regression tests so auth and dashboard selectors remain stable**

Pin `#login`, `#glogin`, `#forgot-password`, `[data-nav="dashboard"]`, `#refresh`, and profile form `#pr` so visual markup refactors cannot break handlers.

- [ ] **Step 2: Simplify login hero**

Remove the four decorative hero-grid boxes from the rendered auth page. Keep one logo, one headline, one concise supporting paragraph and the form card. Use the same black/graphite language as the app instead of a navy hero gradient.

- [ ] **Step 3: Simplify dashboard**

Keep the greeting, three stats, upcoming homework and announcements, but reduce nested cards and helper text. Use a compact stat row and two primary content surfaces.

- [ ] **Step 4: Restyle Schedule/Homework/Profile using the shared primitives**

Keep existing query and form code untouched; only adjust wrapper classes/markup where needed to create cleaner list rows and section spacing.

- [ ] **Step 5: Verify auth and data actions**

Run:

```bash
npm test --prefix tests
node tests/syntax-check.mjs
```

Expected: PASS, including password recovery, repeated auth events, profile rendering and navigation regression tests.

- [ ] **Step 6: Commit**

```bash
git add portal.js premium-minimal.css tests/portal-runtime.test.mjs
git commit -m "feat: simplify core portal screens"
```

---

### Task 6: Make chat feel like the same premium application

**Files:**
- Modify: `chat-polish.css`
- Modify: `chat-reliable.js`
- Modify: `premium-minimal.css`
- Test: `tests/portal-runtime.test.mjs`

**Interfaces:**
- Consumes: existing `mountChat(conversationId, profileId)` and `stopChat()` behavior.
- Produces: unchanged chat data/realtime behavior with premium conversation rows, message bubbles and composer.

- [ ] **Step 1: Add regression coverage for composer and message ownership hooks**

Keep the existing test `confirmed send appears without a realtime event`. Add assertions that rendering preserves `#messages`, `#compose`, `.msg` and `.msg.mine` hooks.

- [ ] **Step 2: Restyle conversation list and bubbles**

Others use neutral graphite bubbles; own messages use restrained purple-blue gradient. Author metadata becomes smaller and muted. Message action buttons remain contextual rather than permanently loud.

- [ ] **Step 3: Make composer sticky and mobile-safe**

```css
.chat-room .compose{position:sticky;bottom:0;z-index:5;background:color-mix(in srgb,var(--pm-surface-strong) 86%,transparent)!important;backdrop-filter:blur(var(--pm-blur))}
@media(max-width:900px){
  .chat-room{min-height:calc(100svh - 210px)}
  body:has(#compose input:focus) .mobile{transform:translateY(calc(120% + env(safe-area-inset-bottom)));opacity:0;pointer-events:none}
}
```

- [ ] **Step 4: Verify subscription/draft regressions**

Run: `npm test --prefix tests`

Expected: PASS for confirmed send, conversation switching, draft preservation and leaving-chat unsubscribe tests.

- [ ] **Step 5: Commit**

```bash
git add chat-polish.css chat-reliable.js premium-minimal.css tests/portal-runtime.test.mjs
git commit -m "feat: restyle premium chat experience"
```

---

### Task 7: Bring Admin and Super Admin into the same minimal system

**Files:**
- Modify: `control-center.css`
- Modify: `control-center-extensions.css`
- Modify: `control-center.js`
- Modify: `control-center-extensions.js`
- Modify: `premium-minimal.css`
- Test: `tests/portal-runtime.test.mjs`

**Interfaces:**
- Consumes: current Control Center tabs/actions/RPCs and role checks.
- Produces: same admin capabilities, fewer duplicate headings/toolbars, same shared shell/colors/motion as student pages.

- [ ] **Step 1: Add a regression test that Super Admin still renders inside the portal shell**

Assert navigating to `[data-nav="superadmin"]` creates `.cc-shell` inside `.portal-view`, and navigating home removes it. Keep the existing role/navigation regression intact.

- [ ] **Step 2: Remove duplicate page chrome**

Do not render both the portal-level `Super Admin Control Center` title and a second oversized `Control Center` hero with repeated context. Keep one compact section intro inside `.cc-shell` and let the portal topbar own the page title.

- [ ] **Step 3: Simplify Control Center tabs**

Keep horizontal tabs on desktop, scrollable on mobile, but use the same neutral active state as sidebar navigation. Avoid large gradient pills except for the single most important action.

- [ ] **Step 4: Unify cards/forms/users/tables**

Map `.cc-card`, `.cc-user-row`, `.cc-message`, `.cc-request`, `.cc-schedule-row`, `.cc-json` to premium tokens. Dense technical JSON may stay monospace/dark but should visually belong to the same card system.

- [ ] **Step 5: Run role/admin regressions**

Run:

```bash
npm test --prefix tests
node tests/syntax-check.mjs
```

Expected: PASS for Super Admin navigation, retry behavior and all existing auth/runtime tests.

- [ ] **Step 6: Commit**

```bash
git add control-center.css control-center-extensions.css control-center.js control-center-extensions.js premium-minimal.css tests/portal-runtime.test.mjs
git commit -m "feat: unify admin control center design"
```

---

### Task 8: Remove visual conflicts and make refresh persistence deterministic

**Files:**
- Modify: `portal.css`
- Modify: `liquid-glass-v2.css`
- Modify: `premium-minimal.css`
- Modify: `appearance-runtime.js`
- Modify: `index.html`
- Test: `tests/design-system.test.mjs`

**Interfaces:**
- Consumes: legacy selectors still needed for layout/functionality.
- Produces: deterministic cascade where legacy layers provide structure and `premium-minimal.css` owns appearance.

- [ ] **Step 1: Add a test for stylesheet order and one final appearance owner**

Assert `premium-minimal.css` is the last stylesheet and `appearance-runtime.js` only writes `--pm-*` appearance tokens plus theme/motion/identity values.

- [ ] **Step 2: Neutralize conflicting legacy dark colors**

Remove or replace the old `portal.css` navy dark tokens (`#0b1020`, `#18234a`) and the old auth hero navy gradient so a flash/repaint cannot show a different visual language before the premium layer loads.

- [ ] **Step 3: Keep `liquid-glass-v2.css` only for legacy structural compatibility**

Delete or neutralize rules that fight the new shared layer for background color, card shadow intensity, mobile glow and oversized glass effects. Do not delete selectors still used by JS.

- [ ] **Step 4: Bump asset versions once after the full redesign**

Update `index.html` query versions for changed CSS/JS files so GitHub Pages/browser caches fetch the redesign immediately.

- [ ] **Step 5: Run the full automated suite**

```bash
npm ci --prefix tests --no-audit --no-fund
npm test --prefix tests
node tests/syntax-check.mjs
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add portal.css liquid-glass-v2.css premium-minimal.css appearance-runtime.js index.html tests/design-system.test.mjs
git commit -m "refactor: remove legacy visual conflicts"
```

---

### Task 9: Production verification on GitHub Pages

**Files:**
- No product-code changes unless verification exposes a real regression.

**Interfaces:**
- Consumes: final `main` commit and GitHub Pages deployment.
- Produces: evidence that the redesign is deployed and stable.

- [ ] **Step 1: Verify CI**

Check the latest `Static portal regression checks` workflow for the final commit.

Expected: test and syntax-check steps both `success`.

- [ ] **Step 2: Verify GitHub Pages deployment**

Check the `pages build and deployment` workflow for the same final commit.

Expected: build and deploy jobs both `success`.

- [ ] **Step 3: Verify critical desktop flows**

Open production and check: login, dashboard, chat, profile, Admin, Super Admin, theme toggle, logout. Confirm no duplicate heading/chrome and no navy flash after refresh.

- [ ] **Step 4: Verify critical mobile flows**

At 390px width check: five-item bottom dock, More sheet, logout, study sheet, chat composer with keyboard, no horizontal page overflow.

- [ ] **Step 5: Verify persistence and motion accessibility**

Refresh while dark mode is active and confirm black/graphite colors persist. Enable reduced-motion and confirm section/card/modal translations collapse to effectively instant transitions.

- [ ] **Step 6: Final report**

Report the final production URL, final commit SHA, CI status, Pages deployment status, and any remaining limitations discovered during manual verification.
