# Repurposing Ezra into a Dedicated AI-Aided Writing Suite

**Scope:** Turn the Ezra Research remix into a product whose center of gravity is *writing* — drafting, rewriting, and researching long-form and short-form prose — with the research chat demoted from "the product" to "a source that feeds the draft."
**Status:** Plan for review. No implementation until approved.
**Bar:** Every surface is held to the same craft standard the codebase already meets — calm, fast, trustworthy — now aimed at writers instead of pastors.

---

## 0. TL;DR — this is an inversion, not a rebuild

The writing product is already ~70% built and genuinely good:

- `/app/write` — a polished TipTap manuscript editor (`src/pages/Write.tsx`, `DocumentEditor.tsx`) with autosave, focus mode, drop caps, article metadata, and print styles.
- A Google-Docs-style side assistant (`EzraAssistBar` → `write-assist` edge function) that answers with the manuscript in view and offers Insert / Replace.
- A selection **bubble menu** (`AIBubbleMenu` → `document-ai`) with rewrite presets, and a **slash menu** (`SlashMenu`) with block inserts + "Continue writing with AI."
- A `documents` table already carrying newsroom fields (`headline`, `dek`, `byline`, `section`, `status`, `publish_at`, `story_tags`, `story_package_id`).
- Navigation already renaming *File Cabinet → "Newsroom"* and *Collections → "Story Packages."*

What is **not** done is the brain and the identity. The AI is still a scripture-restricted research chaplain:

- `supabase/functions/_shared/guardrails.ts` **actively refuses** anything outside "biblical study, sermon preparation, pastoral care." A general writing suite is *blocked by design* today.
- `prompt-partner` (the 500-line chat engine), the Ezra starter prompts, scripture mode, and the empty-state copy ("what are we studying?", "check Scripture references before you preach them") all assume a ministry user.
- Identity terms (`scripture`, `sermon`, `preach`, `pastor`, `verse`, `Bible`) appear across ~80+ `src` files and every AI-facing edge function.

**So the job is a domain inversion:** promote writing to the primary surface, re-scope the AI from scripture-only to general writing + research, retire or generalize the ministry-specific features, and wire research so it flows *into* drafts. The plan below sequences that.

---

## 1. Product definition — what "writing suite" means here

Three pillars, in priority order:

1. **The Editor** — a distraction-free, block-based manuscript editor that is the app's home screen. Everything else orbits it.
2. **The Writing AI** — inline, context-aware assistance: rewrite, expand, condense, change tone, continue, outline, critique. Available from selection, from a slash command, and from a persistent side panel. Never a separate destination you "go to."
3. **Research that feeds writing** — the old Ezra chat becomes a *research drawer*: ask a question, get a sourced answer, and drop findings (with citations) straight into the draft. This is the "remix": research and writing share one canvas.

Supporting: **Documents library** (Newsroom), **Projects** (Story Packages → generic "Projects/Workspaces"), **Knowledge/Collections** as retrieval context, **Analytics/Credits**, **Settings**.

**Explicit non-goals for v1:** real-time multiplayer, a public CMS/publishing pipeline, image generation as a headline feature (keep it, de-emphasize it).

---

## 2. Decisions to confirm before building

These change the shape of the work; flagging for a call rather than assuming.

1. **Brand name.** Keep "Ezra" as the assistant's name (it's clean and non-denominational once de-scriptured), rename the *product* to a writing brand, or rename both? The plan assumes **keep "Ezra" as the AI writing partner's name, drop "Ezra Research" as the product identity.** ~82 `Ezra` references make a full rename expensive; retaining it as the assistant persona is cheapest and still coherent.
2. **Audience breadth.** Fully general writing (any prose, any user) vs. a focused vertical (e.g. journalism/newsroom, which the schema already leans toward). The plan assumes **general-purpose with a newsroom-friendly default**, since the data model is already there and it costs little to keep.
3. **Faith features.** Retire the Bible reader + scripture mode entirely, or keep them behind an optional "modes" toggle? The plan assumes **retire from the primary IA, preserve the code behind a feature flag** so existing users aren't stranded and nothing is deleted irreversibly.
4. **Guardrail posture.** Confirm we're broadening from "ministry-only" to "general writing, with safety guardrails" (abuse/spam/illegal still blocked; domain restriction removed).

---

## 3. Phase 1 — Unblock: re-scope the AI from "scripture-only" to "writing"

Nothing else matters until the AI stops refusing writing tasks. This phase is small, backend-only, and high-leverage.

### 3.1 Rewrite the domain guardrails
`supabase/functions/_shared/guardrails.ts` is the single chokepoint (imported by `write-assist`, `document-ai`, `prompt-partner`, `refine`, `distill`, etc.).

- **Remove** the `off_domain` category and the scripture-scoping refusals. Keep and generalize `bulk_abuse`, `prompt_injection`, and genuinely-illegal categories.
- **Replace** `DOMAIN_GUARDRAILS` (the system-prompt block) with a *writing-assistant* charter: help with drafting, editing, research, and structure; decline abuse, targeted harassment, disinfo campaigns, and academic-dishonesty-for-hire; otherwise be broadly helpful.
- **Rewrite** `prefilterPrompt` so it no longer treats "coding," "homework," or general questions as off-domain. A writing suite must happily help draft a cover letter, a grant, a short story, or ad copy.
- Update `_shared/rank.ts` if it applies scripture-weighted ranking.

### 3.2 Generalize the chat engine (`prompt-partner`)
The 500-line `index.ts` + `turn.ts` + `lite-router.ts` + `lite-library.ts` encode a scripture research persona.

- Swap the system persona from "Scripture research companion" to "**Ezra, a research and writing partner.**" Keep the RAG/citation machinery — it's exactly what a writer wants for sourced research.
- Retire scripture-specific routing/library entries in `lite-router.ts` / `lite-library.ts`; replace with writing intents (research a topic, find sources, outline, summarize a document, fact-check a claim).
- `session-memory` and `collection-enrich`: strip scripture assumptions from their prompts.

### 3.3 Generalize the editor AI (`document-ai`, `write-assist`)
- `document-ai` rewrite presets are currently `comforting / deepen-theology / add-scripture / simplify / shorten`. Replace with writer presets: **Improve · Expand · Shorten · Change tone… · Fix grammar · Make vivid · Simplify.** (UI list lives in `AIBubbleMenu.tsx`, §5.2.)
- `write-assist` system prompt (`"You are Ezra, a writing assistant for pastors and researchers…"`) → drop "pastors," drop the "scripture reference in parentheses" instruction, keep voice-matching and the RAG context injection.

### 3.4 Acceptance for Phase 1
"Rewrite this paragraph to sound more confident," "Draft an intro for a product launch email," and "Find me sources on X" all succeed with no scripture framing and no refusal. Existing ministry prompts still work (nothing scripture-specific is *blocked*, just no longer *required*).

---

## 4. Phase 2 — Make the editor the home

### 4.1 Routing & landing
`src/App.tsx` currently funnels every authenticated entry to `/app/ezra` (see `EntryTransitionRouter` → `navigate("/app/ezra")` and the `/app` redirect).

- Change the post-login default to a **document surface**. Recommended: land on the **Newsroom** (documents list) with a prominent "New document" affordance, or resume the last-edited doc. Rationale: writers want their work, not a blank chat.
- Keep `/app/ezra` reachable as the **Research** destination (renamed in nav, §4.3), not the front door.
- Update `ROUTE_TITLES` accordingly.

### 4.2 Elevate the editor's own workspace
The editor already earns the screen (focus mode, side assistant). Additions:

- **Document outline / structure rail** (left of the manuscript, collapsible) generated from headings — navigation for long pieces. Cheap to build from the TipTap doc.
- **Persistent word/char/reading-time count** (word count already computed in `Write.tsx`; surface reading time).
- **Version snapshots** — lightweight, manual "Save version" + autosnapshot on large deltas, listed in a drawer. New `document_versions` table (§7). This is table-stakes trust for serious writing.

### 4.3 Navigation & IA (`src/components/AppSidebar.tsx`)
Re-order and relabel around writing:

| Now | Becomes | Notes |
|---|---|---|
| Ezra (chat, first item) | **Research** (Ezra assistant) | Demoted below writing; still the chat surface |
| Write | **Write / Documents** (first item) | Primary destination |
| Newsroom (File Cabinet) | **Library** or keep **Newsroom** | Depends on §2.2 audience call |
| Story Packages (Collections) | **Projects** | Generic; keep newsroom fields as optional |
| Bible | *(removed from primary nav)* | Behind flag per §2.3 |
| Organize | **Organize** (boards) | Keep; useful for planning pieces |
| Analytics / Integrations / Help | unchanged | Credits copy updated |

### 4.4 Public site & metadata
`index.html`, `PublicLayout`, `Landing`, `scripts/generate-sitemap.ts`, and SEO copy still sell "Ezra Research." Re-message to the writing suite. This is marketing-surface work — scope it as its own sub-task; it does not block the app.

---

## 5. Phase 3 — Deepen the writing AI

The inline AI is the product's soul. Current pieces work but are shallow; make them a system.

### 5.1 The side assistant → a real writing partner (`EzraAssistBar.tsx`)
Today it's one-shot: prompt in, result out, Insert/Replace. Upgrade to:

- **Conversational thread scoped to the document** — follow-ups that remember the last suggestion ("shorter," "now make the second one punchier"). Reuse `useEzraChat` patterns from the Ezra thread rather than reinventing.
- **Diff-style application** — show the proposed change as an inline diff against the selection with Accept/Reject, not just "Replace." Higher trust, less blind clobbering.
- **Context selector** — let the user scope the assist to *selection*, *section*, or *whole doc*; today it hard-codes 3000 chars of surrounding text.
- Swap the ghost-suggestion list (`SUGGESTIONS`) from scripture-flavored to writing-flavored.

### 5.2 Selection actions (`AIBubbleMenu.tsx`)
- Replace ministry presets with the writer set (§3.3), plus a **tone submenu** (Professional / Casual / Confident / Warm / Punchy).
- Add **"Explain this / critique this"** — read-only feedback that appears in the side panel, not an edit.
- Keep the "Ask Ezra…" freeform input.

### 5.3 Slash menu (`SlashMenu.tsx`)
- Keep block inserts. Retire the "Add reference (scripture)" item; generalize the Smart-Brevity callouts (they're already newsroom-generic — keep).
- Add AI blocks: **Outline this topic**, **Draft from a prompt**, **Summarize selection**, alongside the existing "Continue writing."

### 5.4 Autocomplete / ghost text (stretch)
Inline gray-text continuation (Copilot-style) as the highest-signal writing feature. New `document-ai` action `complete` returning a short continuation on a debounced pause; render as a TipTap decoration accepted with Tab. Flag-gated; it's the most token-hungry surface, so tie it to credits (§8).

---

## 6. Phase 4 — Research that flows into the draft (the "remix")

This is what makes it a *suite* and not just an editor. The Ezra research chat already produces sourced, RAG-grounded answers (`rag-retrieve`, `verify-citations`, `distill`). Wire it to the manuscript:

- **Research drawer inside the editor** — open Ezra beside the draft (the side panel already docks here). Ask a research question; answers cite Collections/Story-Package sources.
- **"Insert with citation"** — drop a finding into the draft as a blockquote + source note, or as a footnote. `verify-citations` already exists to check them.
- **Collections as writing context** — a document tied to a Project/Collection automatically feeds those sources into `write-assist` and the research chat (the `collection_id` plumbing is already in `write-assist`). Make the binding visible and one-click.
- **Distill → draft** — `distill` can turn a research thread into an outline or a first draft dropped into a new document. This closes the loop: research a topic, generate scaffolding, write.

---

## 7. Data model

Mostly additive; the newsroom columns already fit.

- **`document_versions`** (new): `id, document_id, user_id, content jsonb, content_text, label text, created_at`. Powers §4.2 snapshots. RLS by `user_id`.
- **`documents`**: reuse as-is. Consider softening the `status` enum from newsroom-specific (`draft/in_review/ready/published/archived`) — it's fine generically, keep it. `section`/`byline`/`dek` become optional metadata, not required chrome.
- **`collections` → "Projects":** the `angle/deadline/assigned_to/status` fields already generalize to any writing project. No migration needed; just relabel in UI.
- **Guardrail/credit tables:** unchanged, but the `credit_schedule` costs (§8) get writing-oriented event types.
- **Retire nothing at the DB level in v1** — scripture tables (bible annotations/bookmarks) stay for flagged users.

All migrations follow the existing timestamped pattern in `supabase/migrations/` and keep RLS-by-`user_id`.

---

## 8. Credits & economics

`docs/credits-power-editor-plan.md` already defines a credits model. Extend, don't replace:

- Add event types to `src/lib/credit-schedule.ts` / the `credit_schedule` table: `write_assist`, `document_rewrite`, `continue_writing`, `ghost_complete` (cheap, high-frequency — price low), `research_query`.
- Ghost-text autocomplete (§5.4) is the cost risk; meter it per accepted completion or per N keystrokes and make it a Pro/flagged feature.

---

## 9. Identity & copy cleanup (cross-cutting)

Runs alongside every phase; tracked as a checklist, not a phase.

- **~80+ `src` files** carry scripture/sermon/pastor/verse strings — starters, empty states, tooltips, onboarding (`GettingStartedCard`, `Learning`, `Help/help-assist/corpus.json`), legal pages (`AISafetyPolicy`, `TermsOfService` scope language).
- **Edge functions:** `prompt-partner`, `write-assist`, `document-ai`, `session-memory`, `collection-enrich`, `guardrails`, `rank` all contain scriptural framing in prompts/tests.
- Approach: (1) Phase 1 handles the *functional* blockers (guardrails, core prompts); (2) a follow-up sweep handles *cosmetic* copy. Grep anchors: `scripture|sermon|preach|pastor|\bverse\b|Bible`. Update the co-located tests (`turn.test.ts`, `plan.test.ts`) as prompts change.
- Legal: `TermsOfService` currently scopes usage to ministry; broaden to general writing with the same abuse prohibitions.

---

## 10. Sequenced roadmap

| Phase | Outcome | Rough effort | Blocks |
|---|---|---|---|
| **1. Unblock the AI** | Writing prompts stop being refused; core prompts de-scriptured | S | Everything |
| **2. Editor as home** | Login lands in documents; outline rail; version snapshots; nav re-ordered | M | — |
| **3. Deepen writing AI** | Conversational side-assist w/ diffs; writer presets; tone menu; AI slash blocks | M–L | Phase 1 |
| **4. Research→draft** | Research drawer, insert-with-citation, Collections-as-context, distill-to-draft | M | Phases 1,3 |
| **5. Ghost autocomplete** | Copilot-style inline completion (flagged, metered) | M | Phases 1,8 |
| **Copy/identity sweep** | Cosmetic de-scripturing across ~80 files + public site | M | runs parallel |

Recommended first PR = **Phase 1 only** (guardrails + the three AI prompt files + their tests). It's small, backend-isolated, independently verifiable, and unblocks all product work. Ship it, confirm writing tasks succeed end-to-end, then proceed.

---

## 11. Risks & watch-items

- **Guardrail over-broadening.** Removing the domain wall must not remove abuse/safety filters. Keep spam/injection/illegal categories; only the *domain* restriction goes.
- **Silent scripture assumptions in tests.** `turn.test.ts` / `plan.test.ts` assert scriptural behavior; they'll fail (correctly) when prompts change — update them as part of Phase 1, don't skip.
- **Cost blowout from ghost text.** Gate behind a flag + credits from day one; never ship it unmetered.
- **Identity half-pivot confusing users.** Today's half-and-half state (writing schema, scripture brain) is the worst of both. The value is in *finishing* the pivot, so avoid stalling between phases 1 and 2.
- **Lovable sync.** This repo mirrors a Lovable project (`.lovable/`, `lovable-tagger`). Large structural edits should stay compatible with Lovable's round-trip; prefer additive, conventional React/Tailwind changes.
- **Don't delete the faith features.** Flag them off, keep the code and tables — cheaper than a migration-out and reversible if the audience call in §2.3 changes.

---

## 12. First-PR file checklist (Phase 1)

- `supabase/functions/_shared/guardrails.ts` — remove domain wall; rewrite charter + prefilter + refusals.
- `supabase/functions/_shared/rank.ts` — drop scripture weighting if present.
- `supabase/functions/write-assist/index.ts` — de-scripture the system prompt.
- `supabase/functions/document-ai/index.ts` — replace rewrite presets with writer presets.
- `supabase/functions/prompt-partner/{index,turn,lite-router,lite-library}.ts` — writing persona + intents.
- `supabase/functions/{session-memory,collection-enrich}/index.ts` — strip scripture assumptions.
- Co-located tests: `prompt-partner/turn.test.ts`, `help-assist/plan.test.ts` — update expectations.
- Client mirror of preset labels: `src/components/write/AIBubbleMenu.tsx`, `EzraAssistBar.tsx` (`SUGGESTIONS`), `SlashMenu.tsx`.
- Run `npm run functions:check` + `npm run functions:test` + `npm test` before opening the PR.
