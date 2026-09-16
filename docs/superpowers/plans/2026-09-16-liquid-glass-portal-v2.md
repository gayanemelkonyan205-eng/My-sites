# Liquid Glass Portal V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current public Class Portal UI with a modular Liquid Glass application and add safe Admin/Super Admin management features without weakening Supabase security.

**Architecture:** Keep Supabase Auth/Postgres/RLS/Storage/Realtime as the backend. Replace the monolithic GitHub Pages frontend with browser-native ES modules under `portal-v2/`, while keeping the old public files untouched until V2 passes review. Privileged workflows are implemented as RLS-backed tables and protected RPCs, never as client-side role checks alone.

**Tech Stack:** HTML5, CSS custom properties, browser ES modules, Supabase JS 2.x, PostgreSQL/Supabase RLS + RPC, Node built-in test runner for pure modules.

**Spec:** `docs/superpowers/specs/2026-09-16-liquid-glass-portal-v2-design.md`

## Global Constraints

- Dark app background must be `#000000`.
- Roles remain exactly `STUDENT`, `ADMIN`, `SUPER_ADMIN`.
- No service-role key or secret may appear in frontend code.
- Role changes must occur through protected RPCs.
- Admin promotion needs two distinct approvers; request author cannot vote on their own request.
- `SUPER_ADMIN` may directly assign roles through protected RPCs.
- Site customization is typed/validated only; arbitrary CSS/JS injection is forbidden.
- Safe Database Manager must never expose raw unrestricted SQL.
- Existing public site remains available until V2 is verified.

---

### Task 1: V2 shell and design tokens

**Files:**
- Create: `portal-v2/index.html`
- Create: `portal-v2/styles/tokens.css`
- Create: `portal-v2/styles/base.css`
- Create: `portal-v2/styles/liquid.css`
- Create: `portal-v2/styles/components.css`
- Create: `portal-v2/styles/responsive.css`
- Create: `portal-v2/app.js`
- Create: `portal-v2/lib/theme.js`
- Test: `portal-v2/tests/theme.test.mjs`

**Interfaces:**
- Produces: `applyTheme(settings)`, `setThemeMode(mode)`, CSS variables `--bg`, `--surface`, `--text`, `--glass-opacity`, `--glass-blur`, `--accent`.

- [ ] **Step 1: Write theme tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeThemeSettings } from '../lib/theme.js';

test('dark mode stays true black', () => {
  const x = normalizeThemeSettings({ theme_mode: 'dark' });
  assert.equal(x.background, '#000000');
});

test('glass values are clamped', () => {
  const x = normalizeThemeSettings({ glass_opacity: 4, glass_blur: 400 });
  assert.equal(x.glass_opacity, 0.92);
  assert.equal(x.glass_blur, 48);
});
```

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test portal-v2/tests/theme.test.mjs`
Expected: FAIL because `portal-v2/lib/theme.js` does not exist.

- [ ] **Step 3: Implement normalized tokens**

```js
export function normalizeThemeSettings(input = {}) {
  const dark = input.theme_mode !== 'light';
  return {
    theme_mode: dark ? 'dark' : 'light',
    background: dark ? '#000000' : '#F5F5F7',
    accent: /^#[0-9A-Fa-f]{6}$/.test(input.accent || '') ? input.accent : '#0A84FF',
    glass_opacity: Math.min(.92, Math.max(.36, Number(input.glass_opacity ?? .58))),
    glass_blur: Math.min(48, Math.max(12, Number(input.glass_blur ?? 28))),
    radius: Math.min(34, Math.max(14, Number(input.radius ?? 24)))
  };
}
```

- [ ] **Step 4: Build the V2 shell**

`portal-v2/index.html` loads only the V2 styles and `app.js` as a module. The shell contains `#app`, `#overlay-root`, and `#toast-root`; no legacy `portal.js` or `mobile-fixes.js` is loaded.

- [ ] **Step 5: Run tests**

Run: `node --test portal-v2/tests/theme.test.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add portal-v2
git commit -m "feat: add Liquid Glass v2 design system"
```

---

### Task 2: Floating Liquid Glass navigation and More sheet

**Files:**
- Create: `portal-v2/ui/icons.js`
- Create: `portal-v2/ui/liquid-nav.js`
- Create: `portal-v2/ui/sheet.js`
- Create: `portal-v2/lib/navigation.js`
- Modify: `portal-v2/app.js`
- Test: `portal-v2/tests/navigation.test.mjs`

**Interfaces:**
- Produces: `primaryDestinations`, `buildRoleDestinations(role)`, `mountLiquidNav({role,onNavigate})`, `openMoreSheet(items)`.

- [ ] **Step 1: Test role destination rules**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoleDestinations } from '../lib/navigation.js';

test('student never gets admin destinations', () => {
  const keys = buildRoleDestinations('STUDENT').map(x => x.key);
  assert.equal(keys.includes('admin'), false);
  assert.equal(keys.includes('superadmin'), false);
});

test('super admin gets both privileged destinations', () => {
  const keys = buildRoleDestinations('SUPER_ADMIN').map(x => x.key);
  assert.equal(keys.includes('admin'), true);
  assert.equal(keys.includes('superadmin'), true);
});
```

- [ ] **Step 2: Implement navigation data**

Primary dock is exactly `home`, `study`, `chat`, `notifications`, `more`. `More` contains schedule, homework, announcements, board, polls, files, classmates, profile, plus role-specific Admin/Control Center items.

- [ ] **Step 3: Implement active Liquid Glass lens**

Use one absolutely positioned `.liquid-nav__lens` whose transform is updated from the active button bounding box. Animate transform/width with spring-like cubic-bezier; disable transitions under `prefers-reduced-motion`.

- [ ] **Step 4: Implement More sheet**

The sheet is focus-contained, closes on Escape/backdrop, respects safe-area insets, and uses the same glass material as navigation.

- [ ] **Step 5: Run tests and commit**

Run: `node --test portal-v2/tests/navigation.test.mjs`
Expected: PASS.

```bash
git add portal-v2
git commit -m "feat: add floating Liquid Glass navigation"
```

---

### Task 3: Supabase session, profile, and feature router

**Files:**
- Create: `portal-v2/lib/supabase.js`
- Create: `portal-v2/lib/session.js`
- Create: `portal-v2/lib/router.js`
- Create: `portal-v2/views/auth.js`
- Create: `portal-v2/views/home.js`
- Create: `portal-v2/views/study.js`
- Create: `portal-v2/views/profile.js`
- Modify: `portal-v2/app.js`
- Test: `portal-v2/tests/router.test.mjs`

**Interfaces:**
- Produces: `sb`, `loadIdentity()`, `navigate(key)`, `registerView(key, renderer)`.

- [ ] **Step 1: Preserve current public Supabase client configuration**

Use only the public project URL and publishable key. Never add service-role credentials.

- [ ] **Step 2: Implement session bootstrap**

`loadIdentity()` calls `sb.auth.getSession()` and `get_my_profile()`. A missing session renders auth; inactive profiles render blocked state; active profiles initialize role-aware navigation.

- [ ] **Step 3: Implement router**

Route changes replace only `#view-root`, update active Liquid Glass lens, and persist the last valid destination in `sessionStorage`.

- [ ] **Step 4: Migrate Home / Study / Profile data queries from legacy `portal.js`**

Home keeps upcoming homework, unread notifications, announcements, events. Study groups schedule + homework under one app-style destination.

- [ ] **Step 5: Test and commit**

Run: `node --test portal-v2/tests/router.test.mjs`
Expected: PASS.

```bash
git add portal-v2
git commit -m "feat: add v2 session and feature router"
```

---

### Task 4: Reliable redesigned chat

**Files:**
- Create: `portal-v2/views/chat.js`
- Create: `portal-v2/lib/chat.js`
- Test: `portal-v2/tests/chat.test.mjs`

**Interfaces:**
- Produces: `sendMessage({conversationId,userId,body})`, `subscribeToConversation(id,onInsert)`, chat renderer.

- [ ] **Step 1: Test message normalization**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMessageBody } from '../lib/chat.js';

test('chat rejects blank messages', () => assert.equal(normalizeMessageBody('   '), null));
test('chat trims valid messages', () => assert.equal(normalizeMessageBody('  hi  '), 'hi'));
```

- [ ] **Step 2: Implement insert-first behavior**

After a successful `messages.insert`, append/refetch immediately. Realtime is used only to receive other users' inserts and must not be required for the sender to see success.

- [ ] **Step 3: Build mobile chat layout**

Composer is a compact glass bar above the bottom dock. Conversation list opens as a sheet on narrow screens.

- [ ] **Step 4: Test and commit**

Run: `node --test portal-v2/tests/chat.test.mjs`
Expected: PASS.

```bash
git add portal-v2
git commit -m "feat: rebuild realtime chat experience"
```

---

### Task 5: Subjects management

**Files:**
- Create: `supabase/migrations/20260916_120000_subject_management.sql`
- Create: `portal-v2/views/admin-subjects.js`
- Modify: `portal-v2/views/study.js`

**Interfaces:**
- Produces RPCs: `admin_create_subject(p_name,p_short_name,p_icon,p_color)`, `admin_update_subject(p_id,p_name,p_short_name,p_icon,p_color,p_is_active,p_display_order)`.

- [ ] **Step 1: Extend subject schema safely**

Migration adds nullable `icon text`, `color text`, `is_active boolean not null default true`, and `display_order integer not null default 0` if absent.

- [ ] **Step 2: Add protected RPCs**

Both RPCs return `false` unless `app_private.current_role()` is `ADMIN` or `SUPER_ADMIN`; validate names and color format; write `audit_logs` entries.

- [ ] **Step 3: Restrict direct writes**

Students retain SELECT access to active subjects only. Direct INSERT/UPDATE from ordinary authenticated users is not relied on; UI uses RPCs.

- [ ] **Step 4: Build Admin Subjects view**

Admin can add/edit/archive/reorder subjects. Changes immediately update Study and Schedule views.

- [ ] **Step 5: Verify with SQL**

Run role checks using Supabase SQL/JWT claims for STUDENT and ADMIN identities; STUDENT mutations must fail, ADMIN RPC must succeed.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations portal-v2
git commit -m "feat: add admin subject management"
```

---

### Task 6: Two-admin promotion approval workflow

**Files:**
- Create: `supabase/migrations/20260916_123000_admin_consensus.sql`
- Create: `portal-v2/views/admin-requests.js`
- Modify: `portal-v2/views/superadmin.js`

**Interfaces:**
- Produces RPCs: `create_admin_role_request(p_target_user_id)`, `vote_admin_role_request(p_request_id,p_decision)`, `cancel_admin_role_request(p_request_id)`.

- [ ] **Step 1: Create request/vote tables and enums**

Tables and constraints match the design spec. Unique vote constraint prevents double voting.

- [ ] **Step 2: Implement create request RPC**

Reject requests where requester lacks Admin/Super Admin role, target is already privileged, or another pending request exists for the target.

- [ ] **Step 3: Implement voting RPC atomically**

Requester cannot vote. A rejection closes the request. When two distinct approvals exist, update target profile to `ADMIN`, set request to `APPROVED`, and audit all actions in one transaction.

- [ ] **Step 4: Build Admin Requests UI**

Show pending requests, requester, target, current approval count, and Approve/Reject buttons. Own request has no voting controls.

- [ ] **Step 5: Verify with three identities**

Simulate requester Admin A, Admin B, and target Student. First vote must leave Student unchanged; second distinct approval must promote target. Requester self-vote must return false.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations portal-v2
git commit -m "feat: add two-admin promotion consensus"
```

---

### Task 7: Super Admin Control Center and appearance engine

**Files:**
- Create: `portal-v2/views/superadmin.js`
- Create: `portal-v2/views/control-center/appearance.js`
- Create: `portal-v2/views/control-center/users.js`
- Create: `portal-v2/views/control-center/security.js`
- Create: `portal-v2/lib/site-settings.js`
- Create: `supabase/migrations/20260916_130000_site_settings_v2.sql`
- Modify: `portal-v2/lib/theme.js`

**Interfaces:**
- Produces RPCs: `get_public_site_settings()`, `super_admin_set_site_setting(p_key,p_value)` using typed key validation.

- [ ] **Step 1: Define allowed settings keys and validators**

Allowed keys are exactly those listed in the spec. Reject unknown keys, script strings, CSS text, invalid colors, invalid ranges.

- [ ] **Step 2: Load settings at app boot**

Public appearance keys are readable to active users and applied through `applyTheme()`.

- [ ] **Step 3: Build Control Center shell**

Use an Apple-style settings layout: module list/sidebar, detail panel, search, glass toolbar. On mobile it becomes stacked navigation with back transitions.

- [ ] **Step 4: Build Appearance editor**

Controls: theme, accent, radius, glass opacity, blur, surface contrast, motion enabled, speed, spring strength, site name, logo path. Changes preview locally before Save.

- [ ] **Step 5: Keep role controls protected**

User role/active changes call existing protected Super Admin RPCs only.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations portal-v2
git commit -m "feat: add Super Admin Control Center"
```

---

### Task 8: Safe Database Manager and audit viewer

**Files:**
- Create: `supabase/migrations/20260916_133000_safe_db_manager.sql`
- Create: `portal-v2/views/control-center/database.js`
- Create: `portal-v2/views/control-center/audit.js`

**Interfaces:**
- Produces RPCs: `super_admin_list_db_resources()`, `super_admin_read_resource(p_resource,p_limit,p_offset)`, plus explicit per-resource update operations; no raw SQL input parameter exists.

- [ ] **Step 1: Define whitelist**

Expose only approved public resources such as subjects, schedule entries, homework, announcements, events, polls, files metadata, profiles, and site settings. Exclude `auth.*`, `app_private.*`, secrets, rate-limit internals, functions, policies, and extensions.

- [ ] **Step 2: Implement paged read gateway**

Return JSON rows for a whitelisted resource after `is_super_admin()` check. Clamp page size to 100.

- [ ] **Step 3: Implement explicit mutations**

Do not implement generic SQL. Use specific validated RPCs for supported entities, reusing existing role/subject/settings RPCs where possible.

- [ ] **Step 4: Build database UI**

Resource selector, row table/cards, pagination, search where safe, edit drawer, destructive confirmation. Show audit log alongside changes.

- [ ] **Step 5: Security verification**

Confirm anon and STUDENT cannot execute DB Manager RPCs and that `PUBLIC` does not have EXECUTE.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations portal-v2
git commit -m "feat: add safe Super Admin database manager"
```

---

### Task 9: Integration, regression, and production switch

**Files:**
- Modify: `index.html`
- Preserve temporarily: legacy `portal.js`, `portal.css`, `mobile-fixes.js`
- Create: `portal-v2/README.md`

**Interfaces:**
- Production root points to `portal-v2/` only after verification.

- [ ] **Step 1: Run all V2 pure tests**

Run: `node --test portal-v2/tests/*.test.mjs`
Expected: all PASS.

- [ ] **Step 2: Verify database security**

Check RLS on affected tables, RPC grants, role escalation prevention, admin consensus, Super Admin direct actions, subject mutations, and safe DB Manager denial for non-Super Admins.

- [ ] **Step 3: Manual mobile acceptance**

Verify true-black dark theme, floating dock, sliding active lens, More sheet, Study, chat send/receive, Profile, Admin workspace, Control Center, safe-area insets, and reduced-motion behavior.

- [ ] **Step 4: Switch production root**

Replace root `index.html` with a minimal redirect/loader into `./portal-v2/` only after all checks pass.

- [ ] **Step 5: Keep rollback path**

Legacy files remain in Git history; do not delete them in the production switch commit.

- [ ] **Step 6: Final commit**

```bash
git add index.html portal-v2 supabase/migrations
git commit -m "release: launch Liquid Glass Class Portal v2"
```
