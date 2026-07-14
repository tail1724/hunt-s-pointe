# Mobile Web Redesign — "Sanctuary" Navigation

**Scope:** Authenticated experience, mobile-web viewport only (`< 768px`). Desktop — including the existing left/top nav placement toggle — is untouched.
**Status:** Plan for review. No implementation until approved.

---

## 1. Vision

The current mobile experience uses a slide-up dock at the bottom of the screen. It is clever, but clever is not what earns trust. The people who use this product — pastors, Bible-study leaders, ministry staff — deserve an interface that feels like a well-kept sanctuary: calm, ordered, warm, and instantly familiar. Every interaction should say *you are safe here, and you will not get lost.*

We replace the slide-up dock with the pattern the reference screenshots establish (Claude.ai and Gemini mobile web) — a **left-side navigation drawer opened from a top-left hamburger button** — with one deliberate signature difference: a **five-bar hamburger icon**, evoking the lines of a page of scripture or a musical staff. It becomes a small brand mark, not just a control.

Design principles (the AWWWards bar):

1. **Trust through stillness.** Warm paper surfaces (`#E8E5D8`), slate ink (`#16222D`), brass accent (`#A8823A`) — the existing brand palette, applied with generous whitespace and no visual noise. Nothing flashes, nothing bounces gratuitously.
2. **Fellowship in the details.** Personal greeting on the Ezra landing ("Good evening, Pastor Dan"), the user's name always one glance away at the drawer's foot, verse-of-the-day micro-moments where they don't interrupt.
3. **One gesture to anywhere.** Every destination in the app is reachable in two taps: hamburger → item. No hidden gestures, no drag thresholds to learn.
4. **Craft in motion.** A single, consistent spring for the drawer; ink-soft scrim; staggered 30ms fade-rise of nav items on open; full `prefers-reduced-motion` respect. Motion explains hierarchy, never decorates.

---

## 2. What is removed

- `MobileShell`'s bottom dock: the drag-to-open sheet, the "Pull up · Navigate" fret, the tile grid, and the `SlideToSignOut` control (sign-out moves into the account modal).
- `mobile-dock-context` overrides that pages use to inject tiles into the dock (each usage will be audited; page-specific actions move into the page body or the header's contextual slot).

The `MobileShell` status bar concept survives but is redesigned as the new **MobileHeader**.

---

## 3. Information architecture

### 3.1 MobileHeader (fixed, top)

| Zone | Content |
|---|---|
| Left | **Five-bar hamburger button** (44×44pt touch target, custom SVG: five 1.5px ink bars, staggered widths for character; morphs to an X when the drawer is open) |
| Center/left | Wordmark or current page title (serif, Spectral — matches Claude.ai's editorial feel) |
| Right | Contextual slot per page (e.g. Ezra: sessions/history icon; Write: document actions) |

Height ~56px + safe-area inset. Backdrop-blurred paper so content scrolls beneath it.

### 3.2 Navigation drawer (left slider — MD3/MD8 pattern)

Opens from the left edge, 85% viewport width (max 340px), over an ink scrim (40% opacity). Slide-in spring: stiffness 320 / damping 34 (matches the app's existing motion signature). Also closable by scrim tap, left-swipe, and Escape.

Internal structure — **the drawer body scrolls in isolation; header and footer are pinned:**

```
┌──────────────────────────────┐
│  Ezra (wordmark)      ✕      │  ← pinned header
├──────────────────────────────┤
│  ✦ Ezra          /app/ezra   │
│  ▤ Bible         /app/bible  │
│  ✎ Write         /app/write  │
│  ▣ File Cabinet  /app/file-cabinet
│  ◫ Collections   /app/knowledge
│  ୷ Analytics     /app/analytics
│  ⌘ Integrations  /app/integrations
│  ? Help          /app/help   │
│                              │  ← this region scrolls
│  (room for future: recents,  │
│   pinned studies)            │
├──────────────────────────────┤
│ (A) Dan Carter        ⚙  ◐  │  ← pinned utility bar
│     Pro plan                 │
└──────────────────────────────┘
```

- **Nav items:** icon + label rows, 48px tall, brass left-edge indicator + tinted background on the active route. Route-driven active state (`location.pathname.startsWith`).
- **Utility bar (bottom-left of the drawer, per requirement):** pinned row with the user's avatar + name + plan on the left, and inline **Settings** (⚙ → `/app/admin`) and **light/dark toggle** (◐ → `next-themes` `setTheme`) on the right.
- Tapping the **name/avatar** opens the **account modal**.

### 3.3 Account modal (MD4/MD9 pattern)

A pop-up sheet anchored above the utility bar (Claude.ai style), containing:

- User email header (muted)
- Settings, Appearance (light/dark/system), Get help
- Divider
- Log out (destructive tint; replaces `SlideToSignOut`)

Dismissed by scrim tap or ✕. Built on the existing Radix `Popover`/`Dialog` primitives for focus-trapping and a11y for free.

### 3.4 Ezra landing (MD1/MD2/MD7 pattern)

Within this redesign's scope only insofar as the shell frames it: on `/app/ezra` the header shows the hamburger + a quiet wordmark, and the page's existing greeting/composer becomes the hero, centered vertically like the Claude.ai/Gemini home. Composer stays pinned above the keyboard using the existing `useKeyboardInset` hook. (Deeper Ezra-page changes are a follow-up, not part of this nav plan.)

---

## 4. Technical plan

### 4.1 Breakpoint gating

- Keep the existing `useIsMobile` hook as the single gate (confirm its breakpoint is 768px; adjust if needed). `App.tsx` already branches on it to wrap protected routes in `MobileShell` — the branch point stays, only the component swaps.
- Desktop `AppSidebar` / top nav and `useNavPlacement` are not modified.

### 4.2 New components (`src/components/mobile/`)

| File | Responsibility |
|---|---|
| `MobileHeader.tsx` | Fixed header, five-bar hamburger, title, contextual action slot |
| `FiveBarIcon.tsx` | Animated SVG icon (5 bars ⇄ X morph, ~200ms, reduced-motion safe) |
| `MobileNavDrawer.tsx` | Left slider: scrim, spring panel, scrollable nav list, pinned utility bar |
| `AccountModal.tsx` | Account pop-up: settings, appearance, help, log out |
| `MobileAppShell.tsx` | Composition root replacing `MobileShell`; owns open/close state |

Reuse: `framer-motion` (already installed) for drawer/scrim/stagger; Radix Dialog for the drawer's focus trap and inert background; `haptics.tap()` on open/close; `next-themes` for the toggle; lucide icons matching the current tile icons (Hexagon, BookOpen, FileText, Archive, Library, BarChart3, Plug, LifeBuoy).

### 4.3 Removals / migrations

1. Delete the dock markup from `MobileShell.tsx` (or retire the file) and `mobile-shell.css` dock styles; keep/port keyboard-inset handling.
2. `SlideToSignOut` → replaced by "Log out" in `AccountModal` (with a confirm step to preserve the accidental-signout protection the slider provided).
3. Audit every `useMobileDock`/`override.tiles` consumer (Ezra, Bible, Write, FileCabinet, Help, Customers pages reference mobile-shell today) and move page-specific actions to the header's contextual slot or into the page.
4. Add `/app/bible` and `/app/integrations` to mobile nav (they exist as routes but are missing from the current dock tiles) — the full eight: Ezra, Bible, Write, File Cabinet, Collections, Analytics, Integrations, Help.

### 4.4 Accessibility & quality gates

- Drawer: `role="dialog"` `aria-modal`, focus trapped, focus returns to hamburger on close, background inert.
- Hamburger: `aria-expanded`, `aria-controls`, `aria-label="Open navigation"`.
- All touch targets ≥ 44px; WCAG AA contrast in both themes (brass-on-paper checked at small sizes).
- `prefers-reduced-motion`: crossfade instead of slide/stagger.
- No layout shift on open (scrim overlays; body scroll locked).
- Tests: unit tests for drawer open/close/route-change-closes/Escape; existing `vitest` setup.

### 4.5 Implementation phases (post-approval)

1. **Shell swap** — build the five new components behind the `useIsMobile` gate; header + drawer + utility bar functional with all 8 routes.
2. **Account modal + theme toggle** — modal, log-out confirm, light/dark wired to `next-themes`.
3. **Dock removal & page audits** — delete dock, migrate `useMobileDock` consumers, remove dead CSS.
4. **Polish pass** — motion tuning, stagger, icon morph, safe-area/keyboard edge cases, dark theme sweep, reduced-motion, contrast audit.
5. **Verify** — run the app at 390×844, walk all 8 routes in both themes, screenshot set for review.

### 4.6 Risks

- Pages that relied on dock tile overrides for primary actions could lose functionality — mitigated by the explicit audit in phase 3.
- The Ezra composer vs. drawer vs. keyboard interplay: drawer must be inaccessible-but-recoverable while the keyboard is open (reuse the existing `useKeyboardInset` guard).
- `/app/admin` currently doubles as Profile/Settings; the utility bar's ⚙ points there — no new settings page is created.

---

## 5. Acceptance criteria

- [ ] On viewports `< 768px`, authenticated pages show the fixed header with the five-bar hamburger at top-left; the slide-up bottom menu no longer exists anywhere.
- [ ] The drawer slides from the left, lists exactly: Ezra, Bible, Write, File Cabinet, Collections, Analytics, Integrations, Help; the list scrolls in isolation; the utility bar (user row + settings + light/dark) is pinned at the bottom-left.
- [ ] Tapping the user's name opens the account modal containing the utility actions and log out.
- [ ] Desktop (≥ 768px) is pixel-identical to today, including the nav placement toggle.
- [ ] Both themes pass AA contrast; reduced-motion honored; drawer fully keyboard- and screen-reader-operable.
