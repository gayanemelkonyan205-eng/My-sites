# Premium Minimal Motion Design System — 9Ա Class Portal

Date: 2026-09-25
Status: Approved direction, pending implementation plan

## Goal

Unify the entire 9Ա Class Portal around the visual language currently seen in the Super Admin screen the user liked: deep black background, graphite panels, restrained purple/blue accents, minimal chrome, generous spacing, and smooth premium motion.

The redesign must preserve existing Supabase data, authentication, roles, chat logic, permissions, and admin workflows. This is a visual-system and interaction-layer redesign, not a rewrite of the application logic.

## Visual Direction

### Core palette

- Page background: near-black / true black.
- Elevated surfaces: graphite to soft-black.
- Borders: subtle neutral gray with low contrast.
- Primary text: near-white.
- Secondary text: muted cool gray.
- Accent: purple-to-blue gradient, used sparingly for active states, primary buttons, avatars, and selected navigation.
- Success / warning / destructive colors remain semantic and restrained.

The site must avoid the older blue-tinted dark theme. Dark mode should visually read as black, not navy.

## Minimalism Rules

- Remove unnecessary visual boxes, labels, decorative gradients, and repeated helper text.
- Prefer whitespace and typography over extra containers.
- Keep one clear primary action per area when possible.
- Use secondary actions with lower visual emphasis.
- Avoid dense toolbars.
- Tables and lists should feel lightweight, not spreadsheet-heavy.
- Keep labels short and understandable for students.

## Shared Layout

Desktop:

- Fixed or sticky left sidebar in the same family as the liked Super Admin layout.
- Sidebar uses a compact glass/graphite surface with rounded corners.
- Main content area has generous horizontal breathing room.
- Large section title at top with a small contextual eyebrow above when useful.
- Top-right contains only high-value controls such as refresh/theme/profile actions.

Mobile:

- Bottom navigation remains the main navigation pattern.
- The bar uses a dark glass surface with a subtle active indicator.
- Primary items remain: Home, Study, Chat, Notifications, More.
- Secondary areas open in a sheet instead of adding more bottom buttons.

## Component System

All sections should reuse the same primitives:

- Surface / Card
- Section header
- Pill / Badge
- Primary button
- Secondary button
- Destructive button
- Input / Select / Textarea
- Table/List row
- Modal / Bottom sheet
- Toast
- Empty state
- Skeleton / Loading state

Admin and Super Admin must no longer look like a separate website. They can remain denser than student screens, but must use the same colors, spacing, radius, typography, and motion system.

## Motion System

Motion should feel premium and responsive, never decorative or distracting.

### Page/section transitions

When switching sections:

- fade from 0 to 1;
- translate upward by roughly 8–12px;
- duration around 220–320ms;
- spring-like easing similar to the existing Control Center entrance.

### Card entrance

Visible card groups should use a short staggered entrance:

- first item begins immediately;
- following items start 25–50ms later;
- maximum total stagger should remain short so the interface still feels fast.

### Navigation

- Active item highlight moves smoothly instead of instantly flashing.
- Sidebar hover uses a tiny horizontal shift or luminance change.
- Mobile active item can lift slightly and animate the glass indicator beneath it.

### Buttons

- Hover: subtle elevation / brightness change.
- Press: scale to approximately 0.96–0.98.
- No bouncing or large movement.

### Modals and sheets

- fade in backdrop;
- content scales from ~0.97 and rises slightly;
- duration ~250–320ms.

### Loading

- Avoid infinite spinners where possible.
- Prefer skeletons for lists/cards.
- Boot screen remains minimal and must never be blocked by decorative runtime modules.

### Accessibility

Respect `prefers-reduced-motion`. When enabled, remove meaningful translation/scale transitions and reduce animation duration to effectively instant.

## Screens to Restyle

The design system applies to all major areas:

- Login / Register
- Dashboard
- Schedule
- Homework
- Announcements
- Board
- Calendar / Events
- Polls
- Files
- Notifications
- Classmates
- Profile
- Chat
- Admin Center
- Super Admin Control Center
- Modals / confirmation dialogs
- Empty / error / loading states

## Chat

Chat should remain visually distinct enough to feel like a messenger but still belong to the same design system.

- Conversation list: compact graphite rows with a clear active state.
- Message bubbles: neutral dark surfaces for others, purple/blue gradient for own messages.
- Composer: fixed/sticky glass input area.
- On mobile, the main bottom nav must hide while typing if it interferes with the keyboard.
- Message actions appear contextually, not as permanently visible button clutter.

## Theme Persistence

The liked appearance must not disappear after refresh.

The application should define a single source of truth for appearance. The current runtime behavior that reapplies settings from `site_settings` must be aligned with the new design tokens so it cannot unexpectedly switch the site back to an older palette.

The new baseline dark theme should use black/graphite tokens and purple/blue accent tokens. Appearance settings may still support controlled customization, but they must not override the structural design system or reintroduce inconsistent per-page styling.

## Technical Approach

1. Consolidate design tokens in one shared CSS layer.
2. Keep `portal.css` focused on layout/base component structure.
3. Replace scattered visual overrides with one premium theme layer rather than stacking more patch files.
4. Reuse the current Control Center visual/motion language as the reference implementation.
5. Keep JS responsible for state and interaction; avoid JS that rewrites large DOM regions only for appearance.
6. Keep animation helpers lightweight and CSS-first.
7. Preserve the current boot isolation: visual enhancements must not block auth or portal rendering.

## Safety / Regression Constraints

The redesign must not change:

- Supabase project or schema merely for appearance;
- authentication behavior;
- invite-code logic;
- role checks;
- RLS policies;
- chat authorization;
- Admin/Super Admin permissions;
- message deletion permissions already implemented;
- existing content/data.

Any interaction refactor must retain existing behavior and be covered by regression checks.

## Verification

Before declaring the redesign complete:

- run static regression tests;
- run syntax checks;
- verify GitHub Pages deployment completes successfully;
- open production on desktop and mobile widths;
- verify refresh preserves the new style;
- verify login screen, dashboard, chat, Admin, and Super Admin all share the same visual system;
- verify dark mode is black/graphite, not blue/navy;
- verify reduced-motion behavior;
- verify no runtime module causes blank screens or boot hangs.

## Success Criteria

The user should be able to move from Dashboard to Chat to Files to Super Admin and feel that every screen belongs to one premium application.

The strongest visual cues should match the liked Super Admin screenshot:

- black background;
- graphite rounded panels;
- white typography;
- subtle borders;
- sparse purple/blue accents;
- minimal interface density;
- smooth, short, premium transitions.
