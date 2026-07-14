# Ezra Investor Upgrades — Execution Plan

_Last updated: July 7, 2026 · Branch: `claude/ezra-investor-upgrades-saf2p3`_

This plan covers the six gaps identified in investor review, the architecture
chosen for each, what has shipped on this branch, and what remains for launch.
Two operating lenses were applied throughout: **pastoral fidelity** (scripture
accuracy, public-domain provenance, reverent aesthetics, ministry-scoped AI)
and **studio craft** (feel, motion, delight, retention loops).

---

## 1. Image generation suite (shipped)

**Goal:** modern-Christian image creation inside Ezra that avoids generic
"AI slop", with strong typography and selectable modern/classic styles.

**Architecture**
- `src/lib/image-styles.ts` — a curated style system, not a free-for-all
  prompt box. Two families, eight presets:
  - *Modern:* Verse Typography, Modern Minimal, Editorial Print, Abstract Light
  - *Classic:* Illuminated Manuscript, Stained Glass, Renaissance Oil, Engraving
  Each preset carries explicit art direction (grid, palette, print texture)
  and a per-style negative list; a **global negative list** suppresses the
  usual slop (plastic skin, warped hands, HDR gloss, garbled glyphs).
- `supabase/functions/generate-image` — enrichment happens **server-side**
  (a tampered client can't strip the craft constraints), guardrail-checked,
  uploaded to the `generated-media` bucket, and recorded in `generations`
  with the style riding in `caption` (`style:<id>`), so no schema change.
- **Per-prompt offer:** after every completed Ezra answer, a slim dismissible
  invitation appears (`EzraImageOffer`); expanding it reveals the family
  toggle, style chips, and a "text on the image" field **prefilled with the
  first scripture reference detected in the answer** — typography styles set
  it letter-perfect as the centerpiece.
- **File Cabinet › Images:** new tab (`?tab=images`) with a gallery —
  lightbox, prompt search, modern/classic filter, style badges, download,
  delete, and "Iterate with Ezra" (hands the prompt back to chat).

**Follow-ups (shipped):** aspect-ratio presets (Square 1:1, Wide 16:9, Story 9:16,
Print 3:4) as composition direction, and batch export of the filtered gallery.

## 2. AI guardrails & abuse prevention (shipped)

**Goal:** the SaaS must refuse non-domain generation (e.g. coding prompts),
plagiarism, and abuse — enforced in product and in the Terms of Service.

**Architecture — two layers, shared module** (`_shared/guardrails.ts`):
1. **Heuristic prefilter** (zero model cost): deterministic rules catch
   unambiguous coding requests, academic-dishonesty asks ("write my seminary
   essay", "beat Turnitin"), bulk/spam generation, and prompt-injection
   ("ignore previous instructions"). Blocked prompts receive a warm,
   in-voice refusal — streamed through the normal SSE path in Ezra so the
   UX never breaks. Deliberately conservative: a false refusal on a real
   ministry question is worse than deferring to layer 2.
2. **Model-level scope block** appended to every system prompt
   (`prompt-partner` chat + research modes, `write-assist`, and phrased for
   generation in `generate-image`): decline off-domain work in one gracious
   sentence and invite a ministry alternative; never produce code; genuine
   tutoring yes, ghostwriting graded work no.

**Terms of Service** gained enforceable sections: *Domain Scope of AI
Features*, *Abuse Prevention*, *Plagiarism and Academic Integrity*, and
*Enforcement* (warnings → restrictions → termination).

**Follow-ups (shipped):**
- **Layer 1.5 classifier:** prompts that carry weak off-domain signals (a code
  fence, "homework", "crypto"…) but pass the strict prefilter get one cheap
  utility-model classification (IN_SCOPE / CODING / ACADEMIC / OFF_DOMAIN,
  biased to IN_SCOPE, 5s budget, fails open) before the main turn runs.
- **Telemetry:** blocked requests are recorded in the new `guardrail_events`
  table (RLS) and surfaced in a **Safety** tab on Analytics, so enforcement is
  transparent to the user and reviewable for abuse patterns.

## 3. Delightful sign-up (shipped)

- Sign-up tab now leads with value: three-line "what you get" card (Ezra,
  the Bible reader, the image studio) above the form.
- Success state greets the user by first name, and the confirmation email
  lands them directly in Ezra (`emailRedirectTo → /app/ezra`), where the
  existing branded ink entry transition plays.
- A "while you wait" nudge seeds their first prompt — the fastest path to
  the aha moment.
- Social proof rewritten for the audience: pastors, teachers, Bible students.
- Google OAuth one-click remains the primary path.

**Follow-up (shipped):** a first-run **Getting Started checklist** on Ezra's
empty state (ask Ezra · highlight a verse · create an image) with a progress
bar; completion is detected from real data, so it retires itself and is
dismissible.

## 4. Unified branding, outside → in (shipped)

The public site's paper/ink/brass identity (`#E8E5D8` paper, `#16222D` ink,
`#A8823A` brass, Spectral display serif + Hanken Grotesk body) is now the
single design system for the authenticated app:

- `:root` and `.dark` token palettes remapped (paper/ink/brass light mode;
  the marketing site's slate panels anchor dark mode).
- The Ezra chat surface (`.mary-surface`), sidebar, "reverent" color theme,
  card shadows, and gradients all re-derived from the same values.
- Typography unified: `font-display` → Spectral, body → Hanken Grotesk
  (Tailwind config + base layer), matching the landing page exactly.

## 5. Public nav while authenticated (shipped)

The lonely "Ezra" button in the marketing nav is now **"Go to Ezra →"**
(ink CTA with the site's arrow-slide hover) plus a **"Sign out"** ghost
button beside it — in `PublicNav` (the live agape-public nav) and the legacy
`landing/Navbar` (desktop + mobile).

## 6. The Bible tab (shipped)

**Goal:** a fully searchable Bible as a two-page reader for annotating,
highlighting, and passing passages to Ezra/Write — award-level craft in the
landing page's aesthetic, anchoring the research-tool story.

**Data (provenance-clean):**
- Completed the repo's existing pipeline by writing the missing
  `scripts/bible/transform.ts`; vendored **KJV** (classic) and **NHEB**
  (New Heart English Bible — modern, public domain) from the scrollmapper
  corpus: 66 books each under `src/data/bibles/`, plus sharded MiniSearch
  full-text indices (8 canonical shards per language, lazy-loaded).
- Integrity tests (`src/lib/bible/data.test.ts`) pin manifest shape, verse
  lookup, chapter reads, and search behavior.

**Reader (`/app/bible`):**
- A paper **book spread**: single flowing chapter across two facing columns
  with a center-gutter fold, Spectral serif at reading measure, drop cap,
  chapter ornament, and the marketing site's noise grain — one aesthetic
  from landing page to reader.
- **Navigation:** book/chapter picker (OT/NT split, type-to-filter, chapter
  grid), translation switcher, prev/next across book boundaries, ←/→
  keyboard paging, `/` opens search, per-user reading position persisted.
- **Search:** full-corpus MiniSearch with scope chips (Whole Bible / OT /
  NT / Gospels), term-highlighted results; selecting a hit jumps to the
  chapter and the verse glows once.
- **Annotation:** click verses to select; a floating action bar offers four
  highlight colors, notes (tooltip-surfaced in the text), copy-with-
  reference, **Ask Ezra** (prefills a study prompt with the passage), and
  **To Write** (creates a document quoting the passage and opens it).
- **Persistence:** new `bible_annotations` table (RLS, unique per user +
  verse, translation-agnostic so highlights follow the verse across
  translations) with a localStorage fallback so a highlight is never lost
  offline or pre-migration.

**Follow-ups (shipped):**
- **Parallel view:** a toolbar toggle turns the spread into KJV ‖ NHEB facing
  pages, verse-aligned row by row; highlighting still works on the primary page.
- **My highlights:** a side sheet indexing every highlight and note across the
  whole Bible, grouped by book, jump-on-click.
- **Audio reading:** listen to any chapter via the built-in speech synthesizer
  (no network, no cost), with stop-on-navigation.

---

## Deployment checklist

1. Merge branch; CI runs typecheck, vite build, vitest (all green locally).
2. Apply migrations `20260707100000_bible_annotations.sql` and
   `20260707110000_guardrail_events.sql`.
3. Deploy edge functions: `prompt-partner`, `write-assist`, `generate-image`
   (all now import `_shared/guardrails.ts`).
4. No new secrets or env vars required.

## Risks & mitigations

- **Bundle weight:** bible data ships as lazy chunks (per-book JSON, per-
  shard indices) — the base bundle is unaffected; the largest shard loads
  only when its scope is searched.
- **Guardrail false positives:** prefilter is intentionally narrow; the
  model layer handles nuance, and refusal copy always offers the in-domain
  path. Guardrail events are logged for tuning.
- **Migration lag:** annotations degrade to localStorage automatically.
- **Rebrand regressions:** all colors flow through the existing token
  system; component code was not forked. Spot-check chart/analytics
  surfaces after deploy.
