# Portal stabilization

Baseline: main `3e9155a`; production is the root static application, not the
separate `class-portal` Next.js application. Preserve both and the existing DB.

1. Reproduce startup/auth/DOM regressions with isolated DOM tests.
2. Share one Supabase client, defer auth work outside auth callbacks, reject stale identity results.
3. Make boot/error transitions explicit; only start enhancements after a successful render.
4. Preserve class-label containers and stop observer feedback loops.
5. Verify tests, JS syntax, database settings/RLS, and production before reporting readiness.

## Implemented

- One shared Supabase client, PKCE, deferred auth callbacks, stale-session guards.
- Explicit BOOTING / AUTH_CHECK / LOGIN / PORTAL / ERROR states and retry UI.
- Non-destructive, idempotent class labels; all remaining class labels use 9Ա.
- Password recovery UI and a distinct PASSWORD_RECOVERY event handler.
- One chat renderer/subscription, cleanup on navigation, polling catch-up,
  immediate refresh after confirmed sends, preserved input after failed sends,
  and stale-conversation-response protection.
- Control Center follows core navigation and renders retry UI on load failure.
- Request deadlines include response-body reads; uploads have a longer deadline.

## Verification (2026-09-24)

- `npm test --prefix tests`: 15 DOM/lifecycle regression tests passed.
- `node tests/syntax-check.mjs`: syntax/import checks passed for 17 root modules.
- `node tests/api-smoke.mjs`: anonymous profile/message access denied; server
  secrets are not exposed as a public REST table.
- Existing Supabase project restored from INACTIVE to ACTIVE_HEALTHY. No schema,
  RLS, user roles, invite codes, or business records were changed.
- Database: 29 public tables, all with RLS; class.name is 9Ա; one CLASS
  conversation; zero active profiles missing CLASS membership.
- Anonymous administrative overview/row RPC calls return no data.
- Local browser: login and registration rendered at 390px, without horizontal
  overflow. The recovery link is visible. Browser automation was intermittent.

## Remaining acceptance checks

Google provider is disabled in the real Supabase Auth settings. Email/password is
enabled and email confirmation is required. Google credentials and allowed
redirect URLs have not been configured or independently verified in this stage.
Real sign-in, email delivery/recovery, two-user realtime, and authenticated
Admin/Super Admin end-to-end testing require a permitted test session. The DOM
tests exercise these client transitions with a mocked backend and are not proof
of those production flows. Reactions/read receipts and the other full portal
requirements still need their own acceptance pass.

The separate `class-portal` Next.js app is not the GitHub Pages production app.
Only its obsolete class label was changed in this stage.
