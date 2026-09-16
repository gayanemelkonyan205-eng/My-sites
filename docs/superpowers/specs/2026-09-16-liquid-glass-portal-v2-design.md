# Liquid Glass Portal V2 — Design Specification

## Goal

Rebuild the public Class Portal into a premium app-like interface inspired by modern iOS/macOS interaction patterns, using a true black dark theme, restrained Liquid Glass surfaces, springy navigation, and a powerful but safe administration model. The existing Supabase project remains the source of truth for authentication, profiles, chat, content, roles, RLS, Storage, and Realtime.

## Product direction

The portal should feel like a native Apple-style application rather than a marketing page. Liquid Glass is used for navigation, toolbars, sheets, modals, contextual actions, and selected controls. Content cards remain calm and readable instead of turning every surface into glass.

The visual language must be original to Class Portal rather than a pixel-for-pixel copy of Apple. The reference is the interaction model: depth, material hierarchy, spacing, focus, animation, typography, motion, and responsive behavior.

## Visual system

### Dark mode

- App background: `#000000`.
- Elevated content surface: `#0A0A0A` to `#111111`.
- Glass surfaces: translucent black/neutral layers with backdrop blur and thin white highlights.
- Primary text: `#F5F5F7`.
- Secondary text: neutral gray, never blue-gray.
- Accent: user-configurable, default Apple-like electric blue.
- No large navy or purple background fields.

### Light mode

- App background: `#F5F5F7`.
- Content surfaces: `#FFFFFF` / very light neutral.
- Glass surfaces: translucent white with subtle refraction/highlight.
- Text: `#1D1D1F`.

### Liquid Glass material

Glass components use four layers:

1. translucent base fill;
2. backdrop blur/saturation;
3. inner highlight and outer hairline border;
4. subtle radial/specular highlight that follows active state.

Glass is reserved for the floating bottom dock, top action bar, sheets, dropdowns, dialogs, contextual toolbars, and Super Admin floating controls.

### Typography

Use the system font stack (`-apple-system`, `BlinkMacSystemFont`, `SF Pro` when available, then Inter/system fallback). Headings are large and tight; body text remains highly readable in Armenian, Russian, and English.

## Navigation

### Mobile bottom dock

A floating Liquid Glass pill sits above the safe-area inset and contains five primary destinations:

1. Գլխավոր / Home
2. Ուսում / Study
3. Չատ / Chat
4. Ծանուցումներ / Notifications
5. Ավելին / More

The active destination uses a raised circular/capsule lens that smoothly slides between items. Motion uses spring-like easing; the icon lifts slightly and the active lens brightens. The bar never touches the physical screen edge.

`More` opens a full-height or medium-height Liquid Glass sheet containing the rest of the portal: schedule, homework, announcements, board, files, classmates, polls, profile, Admin, and Super Admin sections according to role.

### Desktop/tablet

The same navigation model becomes a slim floating dock/sidebar. It may collapse to icons and expand on hover/focus. Content keeps a generous centered max-width.

## Motion

- Screen transitions: short fade + translate.
- Active dock lens: spring interpolation.
- Buttons: small press scale and release.
- Sheets/modals: scale/fade from action origin where practical.
- Cards: restrained stagger on first entry only.
- `prefers-reduced-motion: reduce` disables nonessential motion and spring effects.

## Roles and authorization

Roles remain exactly:

- `STUDENT`
- `ADMIN`
- `SUPER_ADMIN`

The browser never receives unrestricted service-role credentials. All privileged mutations continue through RLS or explicit `SECURITY DEFINER` RPCs with role checks.

### Admin promotion by consensus

An Admin cannot unilaterally promote another user to Admin.

New table: `admin_role_requests`

Required fields:

- `id uuid primary key`
- `target_user_id uuid`
- `requested_by uuid`
- `status` (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`)
- `created_at`
- `resolved_at`

New table: `admin_role_request_votes`

Required fields:

- `request_id uuid`
- `voter_id uuid`
- `decision` (`APPROVE`, `REJECT`)
- `created_at`
- unique `(request_id, voter_id)`

Rules:

- requester must currently be `ADMIN` or `SUPER_ADMIN`;
- requester cannot vote on their own request;
- target cannot already be `ADMIN` or `SUPER_ADMIN`;
- two distinct active Admin/Super Admin approvals promote the target to `ADMIN`;
- any rejection closes the request as `REJECTED`;
- `SUPER_ADMIN` may directly assign `ADMIN` through the existing protected role RPC;
- every request, vote, promotion, rejection, cancellation, and direct role change is written to `audit_logs`.

## Subject management

Admins and Super Admins can create, edit, archive, reorder, and assign subject metadata. Students can only read active subjects.

Subject fields should support:

- name;
- short name;
- optional emoji/icon;
- optional accent color;
- active/archived state;
- display order.

No hard-coded complete school subject list is required; admins can add the exact subjects the class studies. A starter seed may include common Armenian school subjects.

## Admin workspace

Admin receives an app-style workspace for:

- subjects;
- schedule;
- homework;
- announcements;
- events;
- polls;
- files;
- basic class content moderation;
- Admin promotion requests and voting.

Admin cannot alter site-wide security rules, arbitrary database rows, appearance engine internals, or Super Admin privileges.

## Super Admin Control Center

Super Admin receives a dedicated Control Center with modules:

- Users & Roles
- Admin Requests
- Subjects
- Schedule
- Homework
- Announcements
- Events
- Polls
- Files
- Chat moderation
- Appearance
- Animations
- Site Identity
- Permissions overview
- Database Manager
- Security
- Audit Log

### Appearance / animation settings

Site appearance is data-driven through `site_settings` or a typed settings RPC. Supported keys include:

- `appearance.theme_mode`
- `appearance.accent`
- `appearance.radius`
- `appearance.glass_opacity`
- `appearance.glass_blur`
- `appearance.surface_contrast`
- `appearance.background_style`
- `motion.enabled`
- `motion.speed`
- `motion.spring_strength`
- `identity.site_name`
- `identity.logo_path`

The client applies safe validated values through CSS custom properties. Arbitrary CSS/JS injection is explicitly forbidden.

## Safe Database Manager

Super Admin can inspect and edit approved public tables through a safe table gateway rather than raw SQL.

Allowed operations:

- list supported tables;
- view rows with pagination;
- insert validated records;
- update validated records;
- soft-delete/archive where the schema supports it;
- hard-delete only for explicitly whitelisted entities and only after confirmation;
- show row counts and basic schema metadata.

Raw unrestricted SQL is not exposed in the browser. Auth schema, private schemas, secrets, RLS policy definitions, extensions, and functions are not directly editable from the web UI.

## Chat

The class chat remains Supabase-backed. Sending a message must update locally after a confirmed insert and also subscribe to Realtime for other users. Realtime failure must not make successful inserts appear lost.

The redesigned chat includes:

- class conversation;
- direct conversations;
- message status/loading state;
- mobile input dock that stays above the bottom navigation;
- unread badge;
- empty/error/loading states.

## Accessibility and responsiveness

- All controls must be keyboard focusable.
- Visible focus ring must work in both themes.
- Tap targets should be approximately 44px or larger.
- Respect safe-area insets.
- Do not rely on color alone for active/error states.
- Respect `prefers-reduced-motion`.
- Ensure Armenian labels do not overflow narrow screens.

## Security constraints

- Never expose service-role keys in frontend code.
- RLS remains enabled on all user-facing tables.
- Role changes happen only through protected RPCs.
- A user cannot update their own role or active state through profile editing.
- Site customization accepts typed values only; no arbitrary script or stylesheet injection.
- Database Manager works through explicit whitelists and validation.
- All privileged changes write audit records.

## Delivery strategy

The work is split into independently testable phases:

1. Liquid Glass design system and responsive navigation.
2. Admin subject management and two-admin promotion workflow.
3. Super Admin Control Center and appearance engine.
4. Safe Database Manager, security view, and audit improvements.
5. Final integration, regression testing, and production rollout.

The existing public GitHub Pages portal remains available until the V2 branch is reviewed and verified.