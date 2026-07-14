# AWWWards Build Plan — Scripture Audio, Bible Bookmarks, General Improvements, Organize

**Status:** Built on this branch (phases 1–5; see commits). Hosted TTS and Google
Calendar are the two deferred items (decisions #5–6). · **Branch:** `claude/awwwards-feature-plan-wcmqna`
**North star:** every feature below is designed to win an AWWWard. The judging rubric is
Design 40% · Usability 30% · Creativity 20% · Content 10% — each workstream ends with an
"AWWWards lens" note mapping the work to that rubric.
**Guardrails:** no assumptions (all open decisions were resolved with the owner and are
recorded below), and nothing existing breaks (every change is additive or behind the
existing UI surface it replaces; acceptance criteria include regression checks).

---

## 0. Decision record (resolved with owner, 2026-07-10)

| # | Question | Decision |
|---|----------|----------|
| 1 | Voice engine hosting (OpenVoice is Python/PyTorch and cannot run in this stack) | **Use a hosted TTS API.** Five curated preset voices, selected and characterized in this plan. |
| 2 | Custom / loved-one voice cloning | **Removed from scope.** No cloning, no consent flow needed. OpenVoice is kept as *UX inspiration only* (style control, multi-voice selection). |
| 3 | Organize Kanban card model | **Deep integration** — cards reference existing app content (documents, collections, creations, chats). |
| 4 | Organize calendar scope | **Cards + native events** — month/week/agenda views showing card due dates plus standalone events, drag-to-reschedule. |
| 5 | Google Calendar (added mid-planning) | ~~Connect Google Calendar for Google-auth users~~ **Deferred to the next major update** (owner, 2026-07-10). §4.5 is kept as the design for that release; nothing in this build depends on it. |
| 6 | ElevenLabs API key (added mid-planning) | **Build everything without it.** Scripture Audio ships fully working on the browser speech engine with the five personas expressed through voice-matching + rate/pitch character; the hosted-TTS edge function + storage cache (§2.4) becomes a drop-in upgrade when a key is provisioned later. |

---

## 1. Current-state audit (what the plan builds on)

**Stack:** Vite + React 18 + TypeScript, Tailwind + shadcn/ui, framer-motion,
TanStack Query, react-router 6, Supabase (Postgres + RLS + Deno edge functions),
Lovable Cloud auth (`@lovable.dev/cloud-auth-js`, Google/email sign-in), AI via the
Lovable AI Gateway (`ai.gateway.lovable.dev`, Gemini + OpenAI) from edge functions.
App identity: **Ezra Research — Biblical AI** (`src/config/vertical.ts`), dark-first
theme, Spectral display serif + Hanken Grotesk + JetBrains Mono, brass/gold accent,
`tactile` micro-interaction class, haptics util, branded entry transitions.

**Relevant precedents already in the repo (reuse, don't reinvent):**

- `src/pages/Bible.tsx` — the reader. "Listen to this chapter" is `window.speechSynthesis`
  (lines ~128–155): **this is the robotic voice bug.** No voice choice, no progress UI,
  no verse tracking, stops on chapter change.
- `bible_annotations` table + `src/lib/bible/annotations.ts` + `HighlightsSheet` — the
  exact pattern (schema, RLS, local-fallback) a bookmarks feature should mirror.
- `src/components/creations/MonthlyCalendar.tsx` / `WeeklyCalendar.tsx` — dnd-kit
  drag-to-reschedule calendar already proven in-app (for `generations`).
- `@dnd-kit/core` + `@dnd-kit/sortable` already installed — the Kanban engine.
- `cmdk` installed — command-palette primitive for "add content to board".
- `minisearch` installed — client-side search engine (already indexes the Bible).
- Nav definition points: `workspaceItems` in `src/components/AppSidebar.tsx`,
  `NAV_ITEMS` in `src/components/mobile/MobileNavDrawer.tsx`, `ROUTE_TITLES` +
  routes in `src/App.tsx`, top-bar variant via `useNavPlacement`.
- Content tables for deep integration: `documents` (Write), `collections` +
  `collection_items` (Collections), `generations` (File Cabinet / creations),
  `partner_sessions` (Ezra chats).
- Edge-function conventions: `_shared/auth.ts`, `_shared/guardrails.ts`,
  `_shared/ledger.ts` (usage metering), secrets via `Deno.env`.

---

## 2. Workstream A — Scripture Audio: rebuild "Listen to this chapter"

### 2.1 Problem

The current implementation reads the whole chapter through the browser's built-in
`SpeechSynthesisUtterance`. Voice quality varies by OS and is robotic everywhere;
there is no voice selection, no pause/scrub, no sense of place in the chapter, and
audio dies silently when the tab sleeps.

### 2.2 Approach

**This build (decision #6, no API key):** rebuild the whole listening experience —
five personas, verse-synced highlighting, the Listening Room dock — on the browser
speech engine done *properly*: per-verse utterance queueing (which fixes Chrome's
long-utterance cutoff bug and gives exact verse sync for free), persona-matched
system-voice selection with rate/pitch character, speed control, sleep timer, and
auto-advance. The provider layer is an interface, so the hosted engine below plugs
in later without touching the UI.

**Next upgrade (when a key exists):** replace the local engine with
**studio-grade hosted TTS behind a Supabase edge function**,
cached aggressively (the Bible never changes — every generated chapter is generated
once, ever, per voice/translation), with a designed "Listening Room" player and
**verse-synced highlighting** driven by word timestamps.

- **Provider: ElevenLabs** (`eleven_multilingual_v2` for quality; `eleven_turbo_v2_5`
  acceptable fallback for cost). Rationale: best narrative voice quality currently
  available via simple REST, per-request word/character **timestamps endpoint**
  (`/v1/text-to-speech/{voice_id}/with-timestamps`) which powers verse sync, and a
  deep premade voice library to curate the five presets from. The API key lives as an
  edge-function secret (`ELEVENLABS_API_KEY`) — never in the client.
- **Web Speech stays as the offline/no-key fallback** so the feature degrades
  gracefully instead of breaking (guardrail: nothing existing breaks).
- **OpenVoice's influence** (per decision #2): granular style control and the
  "hear it how you want it" voice-picker UX — not its runtime.

### 2.3 The five preset voices

Curated for distinct listening moods; each is a *persona*, not a settings value.
Default ElevenLabs mappings below are premade-library voices; IDs live in one config
file so swaps require no code changes.

| Persona | Character | Best for | Default mapping |
|---|---|---|---|
| **The Shepherd** | Warm, weathered, unhurried male | Gospels, Psalms at night | George (`JBFqnCBsd6RMkjVDRZzb`) |
| **The Psalmist** | Gentle, clear female, soft cadence | Psalms, Epistles | Sarah (`EXAVITQu4vr4xnSDxMaL`) |
| **The Herald** | Bright, energized male, forward drive | Acts, prophets, narrative | Brian (`nPczCjzI2devNBz1zQrb`) |
| **The Storyteller** | Rich, dramatic narrator | Genesis, Exodus, Revelation | Daniel (`onwK4e9ZLuTAKqWW03F9`) |
| **The Still Small Voice** | Calm, meditative female, close-mic | Devotional / sleep listening | Lily (`pFZP5JQG7iQjIQuC4Bku`) |

New file `src/config/voices.ts`: persona metadata (name, tagline, sample verse,
voice_id, model, `voice_settings` per persona — stability/similarity/style tuned per
character). Audition previews use one cached line (Psalm 23:1) per voice.

### 2.4 Architecture

```
Bible.tsx ── useScriptureAudio() ──► GET storage: bible-audio/{translation}/{voice}/{book}/{chapter}.mp3
                                        │ hit → play instantly
                                        │ miss ↓
                                     supabase.functions.invoke("scripture-tts")
                                        │  auth (_shared/auth) · meter (_shared/ledger)
                                        │  ElevenLabs with-timestamps → mp3 + char timings
                                        │  map char offsets → per-verse [start,end] seconds
                                        ▼
                                     Storage writes: {chapter}.mp3 + {chapter}.timings.json
```

- **New edge function** `supabase/functions/scripture-tts/index.ts`. Input:
  `{ translation, book, chapter, voiceId }`. It re-reads verse text from the vendored
  JSON (shipped into the function or passed with a hash check) so clients can't
  synthesize arbitrary text on our key. Output: signed URLs for audio + timings.
- **New public-read storage bucket** `bible-audio` (write: service role only).
  Cache key = translation/voice/book/chapter, so cost per chapter per voice is paid
  **once globally**, not per user. A chapter is ~3–4k characters; full KJV per voice
  ≈ 4.3M characters — generated lazily, only what people actually play.
- **Verse sync:** the function knows each verse's character span in the submitted
  text; ElevenLabs returns character-level timestamps; it emits
  `[{ verse, start, end }]`. The player highlights the active verse
  (reusing the existing `bible-verse-landed` visual language) and auto-scrolls.
- **Rate limiting / metering** through the existing `_shared/ledger.ts` +
  `usage_logs` pattern (cache misses only — cache hits are free static fetches).

### 2.5 The Listening Room (player UX)

New components under `src/components/bible/audio/`:

- `VoicePickerSheet.tsx` — vaul bottom sheet / popover: five persona cards
  (portrait-less, typographic — Spectral name, mono eyebrow, one-line character),
  tap-to-audition, brass ring on the active persona. Persisted in
  `scripture_preferences` (table already exists) + localStorage mirror.
- `AudioDock.tsx` — a floating dock that replaces the current toggle-button behavior:
  play/pause, ±15s, verse scrubber (chapter timeline ticked by verse, hover shows
  verse number), 0.8×–2× speed, persona chip (opens picker), sleep timer (off / end
  of chapter / 15/30 min), and **auto-advance** into the next chapter (continuous
  listening — the "audio Bible" mode). Collapses to a mini-pill on scroll; sits
  above the verse-action bar z-order; safe-area aware on mobile.
- Ambient touch: a subtle live waveform shimmer in the dock driven by an
  `AnalyserNode` on the playing audio (aesthetic precedent: `LiveMeter`).
  Fully disabled under `prefers-reduced-motion`.
- `MediaSession` API integration: lock-screen artwork/controls, background playback,
  hardware keys — this is where the current feature dies and where "app-quality"
  perception is won.

**Changed files:** `Bible.tsx` (swap `toggleSpeaking` for `useScriptureAudio`,
keep keyboard shortcuts working; `space` toggles play when dock is open),
`src/hooks/useScriptureAudio.ts` (new), config + components above.

### 2.6 Acceptance criteria

- First play of an uncached chapter starts < 4s (streamed as it generates or with a
  designed "preparing this reading…" state); cached chapters start < 300ms.
- Active verse highlights and scrolls in sync; tapping a verse seeks the audio.
- Voice choice persists across sessions and devices (Supabase) and applies instantly.
- Chapter navigation, highlights, notes, parallel mode, search — all unchanged.
- With no `ELEVENLABS_API_KEY` set, the dock falls back to Web Speech with a quiet
  "standard voice" badge; nothing errors.
- Reduced-motion honored; dock fully keyboard-operable; buttons have labels.

**AWWWards lens:** verse-synced karaoke text + persona-driven voice selection is the
"creativity" hook; the dock's motion/haptics/waveform is the "design" evidence;
MediaSession + sleep timer + auto-advance is the "usability" evidence.

---

## 3. Workstream B — Bible page: bookmarking + readest-derived polish

### 3.1 Bookmarking (modeled on Readest's bookmark/annotation system)

Readest treats bookmarks as first-class, instant, synced objects distinct from
highlights. We mirror that, reusing the proven `bible_annotations` architecture:

**New table** `bible_bookmarks` (new migration, same RLS shape as
`bible_annotations`):

```sql
CREATE TABLE public.bible_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  translation text NOT NULL DEFAULT 'KJV',
  book text NOT NULL,
  chapter integer NOT NULL,
  verse integer,              -- NULL ⇒ whole-chapter bookmark
  label text,                 -- optional user caption ("for Sunday's sermon")
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, book, chapter, verse)
);
-- + user-scoped RLS policies and (user_id, created_at DESC) index,
--   exactly as bible_annotations does.
```

`src/lib/bible/bookmarks.ts` mirrors `annotations.ts` including its
**localStorage fallback for signed-out reading** — bookmarks work before auth and
merge after sign-in.

**UX:**

- **Chapter ribbon:** a bookmark ribbon at the top-right corner of the page spread
  (the skeuomorphic ribbon a physical Bible would have). Tap to toggle; it drops in
  with a small framer-motion settle + haptic tap.
- **Verse bookmarks:** "Bookmark" joins the existing verse-action bar
  (`ActionChip` row) when verses are selected.
- **Study Drawer:** evolve `HighlightsSheet` into a tabbed drawer — **Highlights ·
  Notes · Bookmarks** — one entry point in the toolbar (keeps toolbar density flat;
  currently highlights already have a sheet, so this is an extension, not a rebuild).
  Bookmarks list shows reference, verse snippet, label, relative time; tap = jump
  (reuses the existing `go(book, chapter, verse)` landing flash).
- **Continue reading:** a slim card on `/app/ezra`'s greeting area and at the top of
  the Bible page when returning: "Resume John 4 · bookmarked yesterday".

### 3.2 Readest best practices adopted (audited against what already exists)

| Readest practice | Status here | Action |
|---|---|---|
| Bookmarks, highlights, notes | Highlights + notes exist | Add bookmarks (above) |
| Reading-progress sync across devices | localStorage only (`bible.position.v1`) | Persist position to `scripture_preferences`; localStorage stays as fast path |
| Typography settings (font size, layout, theme) | Fixed type ramp | **Reading Comfort popover:** text size (4 steps), line width, serif/sans body toggle, and Paper / Sepia / Night reading themes layered over the app theme. Stored in `scripture_preferences`. |
| TTS with smooth narration | Robotic Web Speech | Workstream A |
| Parallel reading in split view | ✅ already shipped | No action — call out in release notes |
| Full-text search | ✅ minisearch index | No action |
| Dictionary/lookup on selection | "Ask Ezra" on selection | No action — stronger than a dictionary |
| Keyboard navigation & screen readers | Partial (←/→, `/`) | Add `b` = bookmark, `space` = play/pause, visible focus states on verses; audit `role="text"` spread with VoiceOver |
| Scroll vs paged modes | Scroll only | Defer (noted as future; not required for the award) |

### 3.3 Acceptance criteria

- Bookmark toggle < 100ms perceived (optimistic write, like annotations).
- Signed-out bookmarks survive in localStorage and upload on sign-in.
- Position restores across devices when signed in.
- Reading-comfort settings apply live, persist, and never affect non-Bible surfaces.
- All existing Bible interactions regress-tested (`src/lib/bible/data.test.ts`
  extended with bookmarks lib tests).

**AWWWards lens:** the ribbon micro-interaction and Paper/Sepia/Night reading themes
are high-visibility design moments; cross-device resume is the usability story.

---

## 4. Workstream C — Organize (major build): Kanban + Calendar

A new top-level workspace page at **`/app/organize`** that must feel native on day
one: same shell, same entry transition, same `tactile` motion language.

### 4.1 Navigation & routing integration (the "immediately flows" requirement)

- `src/App.tsx`: `ROUTE_TITLES["/app/organize"] = "Organize"`; route
  `<Route path="/app/organize" element={<ProtectedLayout><Organize /></ProtectedLayout>} />`
  (lazy-loaded — see Workstream D, code splitting).
- `AppSidebar.tsx`: add `{ title: "Organize", url: "/app/organize", icon: KanbanSquare }`
  to `workspaceItems` (after Bible, before Write — content flows *into* organization).
- `MobileNavDrawer.tsx`: same item in `NAV_ITEMS`; top-bar (`AppTopBar`) picks it up
  automatically via shared items.
- Deep links: `/app/organize?view=calendar`, `/app/organize/board/:boardId`.

### 4.2 Data model (new migration)

RLS: user-scoped, exactly mirroring `bible_annotations` policy style.

```sql
boards         (id, user_id, title, emoji, background text, position, created_at, updated_at)
board_columns  (id, board_id, user_id, title, color, position, wip_limit int NULL)
cards          (id, board_id, column_id, user_id, title, description text,
                position, due_at timestamptz NULL, all_day bool,
                cover_color text NULL, checklist jsonb DEFAULT '[]',
                completed_at timestamptz NULL, created_at, updated_at)
card_links     (id, card_id, user_id, kind text CHECK (kind IN
                ('document','collection','generation','session')),
                target_id uuid, created_at)      -- deep integration (decision #3)
organize_tags  (id, user_id, name, color, UNIQUE(user_id, name))
card_tags      (card_id, tag_id, user_id, PRIMARY KEY (card_id, tag_id))
events         (id, user_id, title, description, starts_at, ends_at, all_day,
                color, card_id uuid NULL,        -- native events (decision #4)
                created_at, updated_at)
user_integrations (id, user_id, provider text, access_token text, refresh_token text,
                   expires_at timestamptz, scopes text[], created_at, updated_at,
                   UNIQUE(user_id, provider))    -- Google Calendar (decision #5)
```

`position` uses fractional ordering (e.g. 1024-gap floats) so drags are single-row
updates. `updated_at` triggers follow the repo's existing convention.

### 4.3 Kanban board — distilled from WeKan, dressed by us

**From WeKan we take the feature grammar** (boards → lists → cards; labels; due
dates; checklists; filter bar; card colors; WIP limits; drag everywhere; real-time
UI). **We do not take its visual design** — the board is styled with this app's
existing language (dark-first, brass accent, Spectral headings, `tactile` presses),
which is what makes it award-eligible where WeKan is merely functional.

- **Engine:** `@dnd-kit/core` + `@dnd-kit/sortable` (installed; proven in
  `MonthlyCalendar`). Column drag, card drag with `DragOverlay` lift (scale 1.03 +
  shadow + 2° tilt), keyboard-sortable (dnd-kit sensors), optimistic updates via
  TanStack Query mutations, **Supabase Realtime** channel per board so a second tab
  or device reflects moves live (WeKan's "real-time UI", done natively).
- **Card anatomy:** cover color strip, title, tag chips, due-date pill (amber when
  near, rose when overdue), checklist progress ring, and **link badges** — favicon-like
  glyphs showing attached app content (📄 document, 🗂 collection, 🖼 creation,
  💬 Ezra session).
- **Deep integration (decision #3):**
  - `AddContentPopover` powered by `cmdk`: type-to-search across `documents`,
    `collections`, `generations`, `partner_sessions` (title match via Supabase
    `ilike`, ranked client-side with minisearch); attach as `card_links`, or
    "create card from item" straight onto a column.
  - Hovering a link badge shows a preview popover (existing hover-card primitive);
    clicking opens the source surface (`/app/write/:id`, `/app/knowledge/:id`, …).
  - Reverse flow: Write/Collections get an "Add to board" action later (phase 2.5,
    listed as fast-follow so scope stays honest).
- **Put things on the board by tag / search / category (explicit requirement):**
  a persistent **filter rail** above the board — free-text search (minisearch over
  card titles/descriptions/linked titles), tag multi-select, category = content-kind
  facet (documents / creations / collections / chats / plain cards), due-date facet
  (overdue / this week / no date). Filters compose; matching cards stay lit while
  others dim to 35% (filter-in-place, no reflow — calmer than removal). Saved views:
  a named filter set + board scroll position, stored per user.
- **Board management:** multiple boards, emoji + title, template starters
  ("Sermon pipeline", "VBS planning", "Content calendar") pre-seeded on first visit —
  first-run experience is a designed moment, not an empty state.

### 4.4 Calendar — a hybrid of cal.diy / Schedule-X / ilamy, built on our own rails

**Decision: build the calendar as our own component set on `date-fns` + `dnd-kit`,
extending the proven `MonthlyCalendar`/`WeeklyCalendar` patterns — not adopting a
calendar dependency wholesale.** What we take from each reference:

- **Schedule-X:** the view model (Month / Week / Agenda for v1; Day folds into
  Week on mobile), responsive breakpoint behavior, and its restrained
  event-chip aesthetic.
- **ilamy:** dnd-kit-based drag *and edge-resize* of events, shadcn-token theming
  (no foreign CSS — inherits our tokens automatically), and its plugin mindset:
  recurrence is architected as an optional layer (v1 ships without recurrence;
  the `events` schema stays RFC-5545-compatible by keeping `starts_at/ends_at`
  clean and adding `rrule text NULL` when we get there).
- **cal.diy:** the integration architecture pattern (per-user credential rows,
  provider abstraction) that shapes §4.5, and booking-grade polish details:
  timezone correctness (store UTC, render local), "today" affordance, week starts
  per locale.

**Behavior:** one Organize page, two views (Board ⇄ Calendar) with a shared filter
rail and an animated toggle (layout transition, not a route change). The calendar
renders: (a) cards with `due_at` — dragging between days updates `due_at`;
(b) native `events` — click-empty-slot to create (title, time, color, optional link
to a card); drag to move, edge-drag to resize in Week view; (c) Google events
(§4.5) as visually distinct read-only chips. Month cells overflow into a "+3 more"
popover (pattern already in `MonthlyCalendar`).

### 4.5 Google Calendar integration — DEFERRED to next major update (decision #5)

**Not part of this build.** The design below is retained for the next major update.
Signing in with Google (Lovable auth) does **not** grant calendar scopes, so this is
an explicit, incremental connect flow — shown only to users whose session provider
is Google:

- **Connect flow:** "Connect Google Calendar" card in the calendar's right rail
  (and on `/app/integrations`). It opens Google OAuth (offline access,
  `calendar.readonly` + `calendar.events` scopes) against our own Google Cloud
  OAuth client. New edge function `google-oauth-callback` exchanges the code,
  stores tokens in `user_integrations` (service-role write; RLS read own row;
  tokens never reach the client).
- **Event proxy:** edge function `google-calendar` — `list` (primary calendar,
  visible range, cached 60s) and `create` (push a native event / card due date to
  Google, phase-gated). Handles refresh-token rotation and revocation (a 401 from
  Google flips the integration into a "reconnect" state in the UI).
- **UI:** Google events render as quiet outlined chips with a small "G" glyph,
  read-only in v1; a toggle in the rail shows/hides them; disconnect lives in
  Integrations. Non-Google users simply never see the card — no dead ends.
- **Config needed from owner:** a Google Cloud project OAuth client ID/secret
  (added as edge-function secrets `GOOGLE_OAUTH_CLIENT_ID/SECRET`). Listed in §7
  as the only external provisioning besides the ElevenLabs key.

### 4.6 Design & motion (the award case)

- Board background: the workspace vignette + an optional per-board tint; columns are
  glass cards (`bg-card/85 backdrop-blur`) consistent with the Bible toolbar.
- Motion system: drag lift/settle springs shared with the audio dock; column
  add/remove uses layout animations; view toggle is a shared-element morph of the
  filter rail. All gated by `prefers-reduced-motion`.
- Sound + haptics: reuse `ui-sound.ts` ticks on drop, `haptics.tap()` on drag start
  (mobile) — the same sensory signature as the rest of the app.
- Empty states, drag placeholders, and the first-run template chooser are designed
  screens, not fallbacks.

### 4.7 Acceptance criteria

- Organize appears in desktop sidebar, top-bar mode, and mobile drawer; entry
  transition and route title behave like every other workspace page.
- Card/column drag persists and survives reload; two sessions see each other's
  moves within ~1s (Realtime).
- Filter rail: search, tags, category, due facets compose; saved views restore.
- Cards can attach and preview all four content kinds; links open the right surface.
- Calendar: card due-date drag updates the board pill instantly; native events CRUD;
  week resize works with keyboard alternative (event edit dialog).
- Google: connect, list, hide, disconnect, and token-expiry reconnect all work;
  users who didn't sign in with Google never see Google UI.
- No existing route, nav item, or page regresses (`bun run lint`, `bun run test`,
  `bun run functions:check` clean; manual sweep of all nav destinations).

**AWWWards lens:** Board⇄Calendar shared-element morph + filter-dim interaction is
the creativity centerpiece; realtime drag with sound/haptic signature is the design
texture; deep content links make it *content* (10%) rather than a Trello clone.

---

## 5. Workstream D — General improvements: the saasfly-derived audit list

Saasfly's practices were compared against this repo. Items marked **Adopt** are the
requested output list for the next build; **Adapted** means the principle applies but
the saasfly implementation doesn't; **Skip** items are consciously rejected (with
reason), honoring "do not assume / do not break".

| # | Practice (saasfly) | Current state here | Verdict → action | Priority |
|---|---|---|---|---|
| D1 | CI on every push (GitHub Actions) | **No `.github/workflows` at all**; tests exist (`vitest`, `functions:check`) but run only by hand | **Adopt:** workflow running `lint`, `test`, `functions:check`, `build` on PRs | **P0** |
| D2 | End-to-end type-safe data layer (tRPC + Kysely) | Client hits Supabase with `from("…" as any)` casts (see `Bible.tsx` header comment); generated `types.ts` exists but is bypassed | **Adapted:** no tRPC (wrong architecture for Vite+Supabase); instead regenerate typed client and remove `as any` casts module-by-module, starting with every *new* table in this plan (zero new casts) | **P0** |
| D3 | Env validation at boot (typed env) | Env read ad-hoc in functions; silent failures possible | **Adopt:** zod-validated env helper in `_shared/env.ts` + client `import.meta.env` guard | P1 |
| D4 | Route-level code splitting / `next/font`-grade perf | **All ~30 pages statically imported in `App.tsx`** (no `React.lazy` anywhere); fonts double-loaded via both `@fontsource` packages *and* a render-blocking Google Fonts `@import` in `index.css` | **Adopt:** `React.lazy` + Suspense for workspace routes (Organize ships lazy from day one); delete the `@import`, keep self-hosted fontsource. Big LCP win — and AWWWards judges feel load time | **P0** |
| D5 | Error monitoring | None found (no Sentry/equivalent) | **Adopt:** Sentry (or GlitchTip) for client + edge functions, wired to the existing `trackCTA` event bus | P1 |
| D6 | Product analytics (Vercel Analytics) | `src/lib/track.ts` emits CustomEvents with a documented listener seam, but nothing listens | **Adopt:** plug PostHog/Plausible into the existing seam — one file, no per-component changes | P1 |
| D7 | Payments (Stripe) | No payment code; `/pricing` is marketing only | **Adapted:** wire Stripe via edge functions *when plans go live*; schema groundwork (`profiles.plan`) only for now — don't build billing nobody can use | P2 |
| D8 | Transactional email (Resend + react-email) | Auth emails only (Lovable-managed) | **Adopt (small):** Resend for the contact form + weekly "your week in Organize" digest (opt-in) | P2 |
| D9 | i18n scaffolding | English-only; copy centralized in `vertical.ts` (good seam) | **Adapted:** keep copy centralized; defer full i18n until a second locale is real. Bible data model already supports multiple translations | P3 |
| D10 | SEO (metadata API, OG images) | `SEO.tsx` + react-helmet-async + generated sitemap ✅ | **Extend:** per-page OG images for public pages; JSON-LD on blog/use-cases | P2 |
| D11 | Git hooks (Husky) + Prettier | Neither present; ESLint only | **Adopt:** prettier + lint-staged pre-commit (cheap, prevents diff noise) | P1 |
| D12 | Monorepo (Turborepo) | Single Vite app | **Skip:** wrong tool for one app; churn with zero user value | — |
| D13 | Zustand global state | TanStack Query + context, working well | **Skip:** no state problem to solve | — |
| D14 | Clerk auth | Lovable Cloud auth integrated with Supabase RLS | **Skip:** replacing auth risks everything for nothing | — |
| D15 | Admin dashboard | `/app/admin` exists | Keep; add Organize/audio usage tiles once D6 lands | P3 |
| D16 | Accessibility as a feature (readest also models this) | Good instincts (aria labels, keyboard nav on Bible) but unaudited | **Adopt:** axe pass + fixes as part of each workstream's AC; visible focus states everywhere | P1 |

**Suggested "next build" order: D4 → D1 → D2 (blocking-quality items), then D3/D5/D6/D11/D16, then the P2/P3 tail.**

---

## 6. Sequencing & milestones

| Phase | Scope | Exit test |
|---|---|---|
| **1. Foundations** (small) | D4 code-split + font fix, D1 CI, migrations for bookmarks + Organize schema, `voices.ts` config | CI green on PR; Lighthouse perf ≥ 90 on `/` |
| **2. Scripture Audio** | Edge function + storage cache, voice picker, audio dock, verse sync, MediaSession, Web Speech fallback | §2.6 criteria; demo: switch personas mid-chapter |
| **3. Bible bookmarks + comfort** | Bookmarks table/lib/ribbon, Study Drawer tabs, position sync, reading themes | §3.3 criteria |
| **4. Organize: board** | Nav + route, boards/columns/cards CRUD, dnd, realtime, tags, filter rail, deep links via cmdk | §4.7 board-side criteria |
| **5. Organize: calendar** | Month/Week/Agenda, due-date drag, native events (Google deferred to next major update) | §4.7 calendar criteria |
| **6. Polish & audit tail** | D3/D5/D6/D11/D16, motion QA, a11y sweep, copy pass, award submission assets (case-study page, video capture) | Full regression sweep + axe clean |

Each phase is independently shippable; nothing in a later phase blocks reverting an
earlier one.

## 7. Risks, dependencies, non-goals

- **Owner provisioning:** none required for this build. Scripture Audio runs on the
  browser speech engine; when an ELEVENLABS_API_KEY is provisioned later, §2.4's
  edge function + cache slots in without UI changes. Google OAuth credentials are
  only needed when the deferred Google Calendar work (§4.5) is picked up.
- **TTS cost control:** global chapter cache means worst-case full-KJV cost per
  voice is bounded and one-time; metering via `usage_logs` catches abuse; the
  edge function only synthesizes canonical chapter text, never arbitrary input.
- **Realtime scale:** per-board channels with payload-free "refetch" signals keep
  Supabase Realtime usage trivial.
- **Non-goals (explicit):** voice cloning / user-uploaded voices (removed by
  decision #2); hosted TTS in this build (deferred until a key is provisioned,
  decision #6); Google Calendar in this build (deferred to next major update,
  decision #5); external booking pages (cal.diy's core product — not our use case);
  recurrence rules in calendar v1; Kanban team/multiplayer sharing (single-user
  boards v1, schema doesn't preclude sharing later).
- **Do-not-break checklist run at every phase:** Ezra chat, Bible read/highlight/
  note/search/parallel, Write, Collections, File Cabinet, Analytics, Integrations,
  mobile shell nav, entry transition, sign-in/out.
