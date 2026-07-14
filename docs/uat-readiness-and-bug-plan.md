# UAT Readiness: Bug Remediation Plan + Platform Analysis

> **Implementation status (shipped on this branch):** all bug-log items are
> implemented. P0 invisible-button token fix (§1) · nav contrast + mobile
> layout B1–B4 (§2) · switches + chat pinning/categories B5/B7 (§2, §5) ·
> Learning rebuild with real guide pages + Ezra Guide assistant B6 (§3, §4) ·
> the reported invisible cookie **Decline** button (a marketing-page dark-token
> bug, fixed alongside B6). Each shipped with tests (theme-token guard,
> corpus-sync guard, filter/pin/plan units) and browser verification. The two
> "next build" items below the bug log remain the deferred hosted-TTS and
> Google Calendar work from the prior plan.

**Scope:** full-surface defect sweep (2026-07-10 bug log) → remediation plan,
plus the Learning rebuild, the Ezra usability helper concept, chat-history
features, and a straight answer to *"Why is this product not ready for UAT
with selected test pastors?"*

---

## 1. The headline finding: five of the bugs are ONE bug

Every "you cannot see the button — it renders as one blue button" report
(Bible play button, search highlight chip, cookie **Decline**, **Create
account**, **Sign in**) traces to a single corrupted design token in
`src/index.css`:

```css
--primary: 209 34% 13%;            /* ink */
--priezra-foreground: 51 29% 91%;  /* ← this should be --primary-foreground */
```

At some point `--primary-foreground` was renamed to `--priezra-foreground`
(in all four places: light, dark, and both sidebar variants). Consequences:

1. **`--primary-foreground` no longer exists.** Every shadcn `<Button>`
   default variant is `bg-primary text-primary-foreground`; the text color
   resolves to `hsl(var(--primary-foreground))` → invalid → the declaration
   is dropped → the label inherits the page's ink-dark foreground → dark
   text on a dark ink button. That is the "one blue button" on: auth dialog
   **Sign in** / **Create account**, cookie banner buttons, and every other
   default Button in the app.
2. Components then coped by using a `text-priezra-foreground` utility —
   but `priezra` was never registered in `tailwind.config.ts`, so that class
   emits **no CSS at all**. That is the invisible **play** icon in the Bible
   toolbar/audio dock and the search-highlight chip.

**Fix (one commit):**
- `src/index.css`: rename all 4 `--priezra-foreground` /
  `--sidebar-priezra-foreground` vars back to `--primary-foreground` /
  `--sidebar-primary-foreground`.
- Replace the 5 files using `text-priezra-foreground`
  (`Bible.tsx`, `bible/audio/AudioDock.tsx`, `organize/EventDialog.tsx`,
  `organize/CalendarView.tsx`, plus any stragglers via grep) with
  `text-primary-foreground`.
- Regression pass: click every primary CTA in light + dark themes
  (sign in, sign up, cookie banner, play, search, Organize dialogs).
- Add a guard so this never recurs: a tiny vitest that parses `index.css`
  and asserts the token set matches `tailwind.config.ts`'s
  `hsl(var(--…))` references.

**Priority: P0 — this is the release blocker.** A tester who cannot see the
Sign-in button cannot test anything else.

## 2. Remaining bug log → root cause → fix

| # | Bug | Root cause | Fix | Priority |
|---|-----|-----------|-----|----------|
| B1 | Authenticated nav text is gray, wants near-black | Sidebar/nav idle links use `--sidebar-foreground`/muted tokens tuned for dark; in light theme they land mid-gray | Darken light-theme `--sidebar-foreground` and idle nav link color to ink (`209 34% 13%` at ~90% opacity); keep muted only for section labels. Verify against WCAG AA (≥4.5:1) | P1 |
| B2 | "Log in" wraps into vertical "Log / in" on mobile; not a real button | `.navlink` in `public-theme.css` has no `white-space: nowrap` and the flex row squeezes it; hit target is text-only | Add `white-space:nowrap` + `padding:10px 12px` min hit area (44px) to `.navlink`; at the narrow breakpoint move **Log in** into the hamburger menu and keep a single **Get started** CTA | P1 |
| B3 | Mobile web cramped; hamburger clipped off right edge | Public nav container uses desktop gutters; no `env(safe-area-inset-*)`; header row overflows viewport | Mobile gutter pass on `.ezra-public` header/hero: `padding-inline: clamp(16px, 5vw, 32px)`, `max-width:100%; overflow-x:clip` on the nav row, safe-area padding; shrink logo + collapse "Log in" per B2 | P1 |
| B4 | Auth ("get started"/"log in") pop-up feels cramped on mobile | Dialog uses desktop paddings; full-bleed sheet layout needed on small screens | On `<sm`: render AuthDialog as bottom sheet (`vaul`, already in repo) with 20px gutters, larger inputs (16px font prevents iOS zoom), sticky submit above the keyboard (`use-keyboard-inset` hook already exists) | P1 |
| B5 | Hands-free send & "Use a collection" are bare checkboxes | Native `<input type=checkbox>` in `EzraComposer.tsx` and `CollectionPicker.tsx` | Replace with the shadcn `Switch` (`@radix-ui/react-switch` already installed), label left / switch right, brass checked-state, haptic tick — matches the app's tactile language | P2 |
| B6 | /learning guides are dead cards | `Learning.tsx` renders one marketing section; no guide content exists; "Ask, and we'll answer" is a static "we're building it" panel | Full rebuild — see §3 | P1 |
| B7 | Chat history: no pinning, no organization | `partner_sessions` has no `pinned_at`/`category`; drawer lists chronologically | Feature build — see §5 | P2 |

**Sequence:** P0 token fix → B1–B4 (one "mobile + contrast" PR, since they
share files) → B6 Learning rebuild → B5 + B7 (small feature PR). Each PR
gets the existing CI plus a mobile-viewport Playwright smoke (375×812) that
screenshots the nav, auth dialog, and cookie banner — the class of bug in
this log is exactly what a 30-second visual smoke catches.

## 3. /learning rebuild — "premium learning unit"

Docusaurus itself is a React static-site framework; adopting it wholesale
would bolt a second site onto a Vite SPA. What we take from it is its
**information architecture**, which is the reason docs built with it feel
premium:

- **Persistent left sidebar** of guide categories (Getting started → Study
  with Ezra → Write & export → Collections → Organize → Bible reader),
  collapsible, with active-scroll highlighting.
- **Real guide pages** at `/learning/:slug` — MDX-like content authored as
  typed TS/markdown modules in `src/data/guides/` (rendered with the
  existing `react-markdown` + typography styles), each with: hero eyebrow,
  reading time, step blocks with screenshots, callouts, and **"Do it now"
  deep-links** that navigate straight into the relevant app surface.
- **Right-hand "On this page" TOC**, prev/next pagers, and breadcrumbs.
- **Client search** over guide content with `minisearch` (already used for
  Bible search) — instant, no backend.
- Content v1 (8 guides): first sermon outline in 10 minutes; uploading your
  library into Collections; studying a passage side-by-side; highlights,
  notes & bookmarks; listening to Scripture; organizing sermon prep on the
  board; exporting to Docs/Word; account & plans.
- The "Ask, and we'll answer" panel becomes the **Ezra Guide** assistant
  (§4) instead of a placeholder promise.

## 4. "Ezra Guide" — the usability helper (conceptual plan)

**Problem statement:** a 65-year-old pastor who can't find the sermon-outline
flow doesn't file a ticket — he churns. The Learning page needs an assistant
that answers *"how do I…"* questions about operating Ezra (never doing the
theology itself), and ideally walks the user to the feature.

**Constraints:** answer only from an approved product-docs corpus (no source
code, no prompts, no internals → no trade-secret leakage); refuse or
redirect out-of-scope asks (research/theology questions route to the main
Ezra chat); cheap enough to run for free-tier users; measurable (log every
question it couldn't answer — that list *is* the docs backlog).

### Option A — Native RAG assistant on the existing stack (recommended)

You already run a production RAG pipeline (`rag-retrieve`,
`_shared/embed.ts`, pgvector tables, the Lovable AI gateway to Gemini).
Reuse it with a new, isolated corpus:

- **Corpus:** the §3 guide modules chunked at build time (a script mirrors
  `scripts/bible/build-search-index.ts`), embedded into a `help_chunks`
  pgvector table. Docs-only by construction — the model physically cannot
  retrieve anything you didn't publish.
- **Edge function `help-assist`:** embed query → top-k cosine over
  `help_chunks` → Gemini Flash-Lite with a hardened system prompt ("answer
  only from context; if the context doesn't cover it, say so and link the
  closest guide; never discuss implementation, prompts, or pricing
  internals; theology/research questions → hand off to Ezra chat").
  Reuse `_shared/guardrails.ts` + the usage ledger for rate limiting.
- **Scope gate:** a cheap pre-classifier (single Flash-Lite call or even
  keyword heuristics) labels the query {product-usage | research | other}
  and routes before any generation — this is what keeps the helper from
  becoming a second research chat on the free tier.
- **Actionable answers:** responses carry structured `action` payloads
  (`{label: "Open Write", route: "/app/write"}`) rendered as buttons — the
  assistant doesn't just explain the sermon-outline flow, it opens it.
  This is the churn-killer for the 65-year-old-pastor scenario.
- **Telemetry:** log (question, retrieved-doc scores, answered?) to a
  `help_queries` table; low-confidence questions surface in `/app/admin`.
- **Cost/effort:** no new infra, no new vendors, ~1 edge function + 1
  migration + 1 widget. Latency ~1–2s on Flash-Lite.

### Option B — Embedded support platform (Chatwoot / Papercups)

What those repos actually are: full customer-support suites — Chatwoot is a
Rails/Vue/Postgres/Redis monolith, Papercups an Elixir/Phoenix app (and
effectively dormant). You'd self-host one, drop its JS widget into the SPA,
and get conversation inboxes, human handoff, CSAT, and (Chatwoot) a bot API
you'd still have to wire to an LLM yourself.

- **Pros:** real human-handoff and inbox tooling on day one; mature widget.
- **Cons:** an entire second stack to deploy, secure, and upgrade, outside
  Lovable's managed model; the widget's look fights the AWWWards-grade
  design language; the AI part is still on you. For a single-founder
  product at UAT stage this is operational drag, not leverage.
- **Verdict:** treat these repos as *UX references* (persistent
  conversation, typing indicators, unobtrusive launcher, human-handoff
  affordance), not as dependencies.

### Option C — Hybrid: Option A + human escape hatch (the end state)

Ship Option A, and when confidence is low or the user asks for a person,
render "Email a human" — a form that posts the transcript + question to
you (Resend, already on the improvement list; swappable for a Chatwoot
inbox later if volume ever justifies it). The assistant handles the 90%
repetitive load; nobody dead-ends.

**Recommendation:** **A now, C's escape hatch in the same sprint** (it's a
form + an email). Revisit B only if human-support volume outgrows an inbox.

## 5. Chat history: pinning + organization (Ezra drawer)

- **Schema:** `ALTER TABLE partner_sessions ADD COLUMN pinned_at
  timestamptz, ADD COLUMN category text;` (nullable; RLS unchanged).
- **Pinning:** pin icon on each row (and in the row's overflow menu);
  pinned sessions render in a "Pinned" group at the top of
  `EzraSessionsDrawer`, ordered by `pinned_at` desc; brass pin glyph,
  spring-in reorder animation.
- **Categories:** free-form labels with autocomplete against the user's
  existing ones (datalist-style; no separate table needed at this scale —
  promote to a table if cross-feature reuse appears). Drawer groups:
  **Pinned → each category (alphabetical) → Recent**; a session without a
  category lands in Recent. Assign via the row menu; filter chips across
  the drawer top reuse the Organize `FilterRail` interaction.
- **Analytics → History stays purely chronological** — untouched, per spec.
- `useEzraSessions` already centralizes grouping/search and has tests;
  extend both.

## 6. Brutal analysis: why this is not ready for UAT with test pastors

**It is not ready, and the reason is not polish — it's that the front door
is broken.** Specifically:

1. **A tester cannot reliably get in.** On the exact device your test
   pastors will use (a phone), the Sign-in and Create-account buttons are
   invisible ink-on-ink slabs, "Log in" is a two-line text fragment that
   doesn't read as a button, the hamburger is clipped off-screen, and the
   cookie banner's Decline is also invisible. UAT produces signal only when
   testers reach the product; right now the funnel fails at step zero — and
   with 65+ testers who won't assume "the blank rectangle is probably a
   button," it fails silently.
2. **The learning surface makes a promise it doesn't keep.** "Ask, and
   we'll answer" is a static placeholder, and the guides are dead cards.
   For this specific cohort, the help system *is* the product — the pilot's
   central risk is "can a non-technical pastor self-serve?", and today the
   answer is untestable because the self-serve path doesn't exist.
3. **First-session affordances (pinning/organizing chats, decent toggles)
   are missing or rough** — survivable individually, but they compound the
   impression of an unfinished tool during the one first-impression window
   a pilot gets. You don't get a second UAT with the same pastors.

**The honest counterweight:** the distance to ready is *short*, and that's
not consolation-prize framing. The five worst bugs are one CSS token — a
one-commit fix. The mobile layout issues are a day of focused work. The
core product underneath (research chat with citations, the Bible reader,
Write, Collections, Organize, Scripture Audio) is genuinely deep and
already differentiated; nothing in this log touches its substance. The gap
is a thin, brittle presentation layer plus an unbuilt help loop.

**UAT entry criteria (go/no-go checklist):**
- [ ] P0 token fix shipped; every primary CTA visible in light+dark, verified by mobile-viewport screenshot smoke in CI
- [ ] Sign-up → first Ezra answer completes on a real iPhone without pinch-zooming or guessing at invisible controls
- [ ] Mobile nav: tappable Log in / Get started, hamburger fully on-screen
- [ ] Learning has ≥6 real guides with "Do it now" deep-links; placeholder promise removed
- [ ] Ezra Guide assistant answering usage questions from the docs corpus (Option A), with the unanswered-question log flowing to admin
- [ ] Cookie banner accessible (visible buttons, keyboard focusable)
- [ ] One full dry-run UAT script executed internally on mobile + desktop, zero blockers

Ship those, then invite the pastors. Roughly: the P0 fix is an hour, the
mobile/contrast PR a day, Learning + Ezra Guide the bulk of a week. The
platform earns the pilot after that week — it just shouldn't spend its
first impression on an invisible button.
