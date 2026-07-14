# Hunt's Pointe — Omnibus Plan

**Consolidates:** `docs/ezra-writing-suite-plan.md` (base) + `docs/hunts-pointe-pressroom-addendum.md` (addendum). This is the single authoritative roadmap; the other two documents are its source material and rationale.
**Status:** Plan for review. No implementation until approved.

---

## 1. The product, in one paragraph

**Hunt's Pointe** is the production home of a fast-moving, independent digital publication, and **PressRoom** is its AI editorial co-pilot. The human — the Editor-in-Chief — is the author; PressRoom is the pipeline manager. It verifies facts against the archive, enforces house style, maps drafts into headless-CMS schemas, cascades finished pieces into downstream formats, and batch-processes raw inputs into review queues — while a provenance-and-voice layer guarantees the manuscript itself stays organically human: suggestion-only margins, voice locks, cadence monitoring, AI-tell detection, and a cryptographic proof-of-human-work ledger. The interface is a vibrant light-mode workspace: sky-blue desk, paper-white page, purple machine-suggestions, orange warnings, green success.

**The governing law (from addendum §C.0):** *the manuscript is human territory — PressRoom may only annotate it; derived assets are machine territory — AI-authored by design, stored outside the manuscript, labeled, and human-reviewed.*

## 2. Where the codebase stands

- **~70% of the editor exists:** TipTap manuscript editor with autosave/focus/metadata (`src/pages/Write.tsx`), side assistant (`EzraAssistBar` → `write-assist`), bubble + slash menus (→ `document-ai`), newsroom document schema (`headline, dek, byline, section, status, publish_at, story_tags, story_package_id`), nav already labeled "Newsroom"/"Story Packages."
- **The AI brain is still scripture-scoped:** `_shared/guardrails.ts` refuses non-ministry work by design; `prompt-partner`, starters, and copy across ~80 files assume a pastor. This is the first thing to fix.
- **Strong reusable infra:** RAG + embeddings (`rag-retrieve`, `collection_item_chunks`), ingestion (`collection-ingest`), fan-out (`orchestrate`), summarization (`distill`), citation checking (`verify-citations`), titling (`auto-title`), credits model (`credit-schedule`), `minisearch` client-side.

## 3. Master feature register

| # | Capability | Builds on | Effort | Phase |
|---|---|---|---|---|
| 0a | Rebrand → Hunt's Pointe / PressRoom | strings, routes, personas | S | 1 |
| 0b | Vibrant light-mode theme + semantic AI palette | `index.css`, `tailwind.config.ts` | S | 1 |
| 0c | De-scripture guardrails & core prompts | `guardrails.ts`, `prompt-partner`, `write-assist`, `document-ai` | S | 1 |
| 0d | Editor as home; nav re-ordered; outline rail | `App.tsx`, `AppSidebar` | M | 2 |
| 15 | Margin-only suggestion architecture (governing principle) | side panel, bubble/slash menus | L | 2 |
| 6 | HITL revision tracking (human/AI-attributed versions, rollback) | `document_versions` (new) | M | 2 |
| 2 | Semantic style guide & voice guardrails | `collection-ingest`, TipTap decorations | M | 3 |
| 13 | Voice locks & trait protection | archive embeddings, prompt constraints | M | 3 |
| 12 | Burstiness/perplexity cadence dial | client worker, `EditorChrome` | M | 3 |
| 14 | AI-tell n-gram highlighting | client lexicon + decorations | S | 3 |
| 11 | Cryptographic provenance ledger | features 6+15 event streams | L | 3 |
| 1 | Async multi-agent fact & source verification | `verify-citations`, `rag-retrieve`, `orchestrate` | L | 4 |
| 7 | Archive interlinking & contradiction flags | embeddings, `minisearch` | M | 4 |
| 8 | Structural & narrative flow analysis | `document-ai` read-only action | M | 4 |
| — | Research drawer → insert-with-citation (base plan Phase 4) | PressRoom chat, `distill` | M | 4 |
| 3 | Headless CMS schema mapping & structured export | TipTap JSON, `@tiptap/html` | M | 5 |
| 4 | Content cascades (SEO/newsletter/social/excerpts) | `distill` → `derive-assets` | M | 5 |
| 5 | Headline & hook sandbox (heuristic scores v1) | `auto-title`, Analytics | M | 5 |
| 9 | Bulk processing & pipeline orchestrator | `collection-ingest`, `orchestrate`, `documents.status` | L | 5 |
| 10 | Localization & regionalization toggles | `derive-assets` pattern, voice locks | M | 5 |
| — | Copy/identity sweep + legal + marketing site | ~80 files, public pages | M | parallel |

Retired: base plan §5.4 ghost-text autocomplete (incompatible with human-first authorship; also the biggest cost risk — gone).

## 4. Phased roadmap

### Phase 1 — Identity & Unblock *(first PR series; small, high-leverage)*
The platform becomes Hunt's Pointe, the AI becomes PressRoom, and PressRoom stops refusing editorial work.

1. **Guardrails inversion** (`_shared/guardrails.ts` + `rank.ts`): remove the ministry domain wall; keep/generalize abuse, injection, bulk-spam, academic-dishonesty categories; new charter = independent-publication editorial co-pilot.
2. **Core prompt rewrite:** `prompt-partner` (persona + lite-router intents → research/outline/summarize/fact-check), `write-assist`, `document-ai` (presets → Improve/Expand/Shorten/Tone/Fix grammar/Make vivid), `session-memory`, `collection-enrich`. Update co-located tests (`turn.test.ts`, `plan.test.ts`).
3. **Rebrand pass:** `index.html`, landing/SEO, sidebar, `ROUTE_TITLES`, `/app/ezra` → `/app/pressroom` (+redirect), AI voice strings, empty states.
4. **Theme:** new light-mode token values (sky/lilac/charcoal), semantic AI tokens (`ai`, `ai-wash`, `guardrail`, `verified`), default theme → light, manuscript page stays paper-white, contrast fixes for Dust Bunny Grey.

*Exit criteria:* an EIC prompt ("tighten this lede," "find sources on X," "draft a standfirst") succeeds under the Hunt's Pointe brand in the new theme; `npm run functions:check && npm run functions:test && npm test` green.

### Phase 2 — The Human Manuscript *(the architectural core)*
The editor becomes home, and the margin-only contract is established **before** any new AI capability ships, so every later feature is born into it.

1. **Editor as home:** post-login lands on Newsroom/last document; nav re-ordered (Write first, PressRoom second); outline rail; reading-time stat.
2. **Annotation layer (feature 15):** `document_annotations` table + margin rail; migrate `EzraAssistBar`/`AIBubbleMenu`/`SlashMenu` from insert/replace to propose-in-margin; semantic diff rendering; per-annotation apply (rate-limited, attributed); no bulk accept.
3. **HITL versioning (feature 6):** `document_versions` with `author_kind` + `change_summary`; History drawer; one-click rollback.

*Exit criteria:* no code path lets PressRoom write into the manuscript except an individually-attributed annotation apply; every accepted suggestion appears in the attributed history.

### Phase 3 — The Authentic Voice *(the value proposition)*
1. **Style guide engine (2):** `style_guides` table + House Style collection; deterministic client linter → margin annotations; style charter injected into all PressRoom prompts; pre-staging style-check.
2. **Voice locks (13):** `voice_profiles` from corpus analysis; hard constraints in prompts + deterministic post-pass filter; user-editable lock list.
3. **Cadence dial (12):** client-side burstiness + approximate-perplexity worker; dial in `EditorChrome`; flattening suggestions flagged orange in the margin.
4. **Tell highlighting (14):** versioned lexicon, orange decorations, hover alternatives, tell-density stat; same scan applied server-side to all machine-authored outputs later.
5. **Provenance ledger (11):** aggregate session telemetry (never keystroke content), hash-chained signed digests, proof-of-work certificate; opt-out + Terms language.

*Exit criteria:* a draft composed in Hunt's Pointe carries a provenance certificate; an AI copyedit that would flatten cadence or strip a locked trait is blocked/flagged before the EIC ever sees it as a clean suggestion.

### Phase 4 — Editorial Intelligence
1. **Fact & source verification (1):** claim extraction → per-claim fan-out (archive RAG + external where network policy allows) → `claim_checks` → margin flags with confidence scores; auto-runs on `in_review`.
2. **Interlinking & contradiction (7):** `interlink` function; link suggestions + "this contradicts your earlier piece" flags.
3. **Structure analysis (8):** read-only `structure` action; lede/argument/retention report in the margin panel.
4. **Research → draft:** PressRoom research drawer beside the manuscript; insert-with-citation (as annotation → hand-integrated); distill-a-thread-to-outline into a new document.

### Phase 5 — The Production Pipeline
1. **CMS export (3):** `cms_schemas` + `export-cms` (JSON / MD+front-matter, taxonomy autogen, provenance certificate attached); webhook delivery v1.
2. **Content cascades (4):** `derive-assets` + `document_assets`; Cascade panel; per-asset review; tell-scan on all outputs.
3. **Headline sandbox (5):** formula × channel variants; heuristic scoring v1, labeled; `headline_outcomes` accumulation for a future model.
4. **Bulk orchestrator (9):** `pipeline_templates` + runs tables; batch ingest → standardized drafts flagged `auto_created` in the review queue; Pipelines surface.
5. **Localization (10):** `region_profiles` + `localize`; regional variants as assets; voice locks enforced across regions.

### Parallel track — Copy, legal, marketing
The ~80-file scripture-string sweep, `TermsOfService`/`AISafetyPolicy` re-scope (including provenance-telemetry disclosure), public site re-messaging, Bible/scripture features moved behind a legacy flag (code and tables preserved, not deleted).

## 5. Data model (all new tables RLS-by-`user_id`, timestamped migrations per house pattern)

| Table | Phase | Purpose |
|---|---|---|
| `document_annotations` | 2 | Margin suggestions/flags: span, kind, proposal, status, creator |
| `document_versions` | 2 | Attributed history: `author_kind`, `change_summary`, rollback source |
| `style_guides` | 3 | Structured house-style rules |
| `voice_profiles` | 3 | Locked stylometric traits + exemplars |
| `provenance_ledger` | 3 | Hash-chained signed session digests |
| `claim_checks` | 4 | Per-claim verdicts, confidence, sources |
| `cms_schemas` | 5 | Output schema mappings |
| `document_assets` | 5 | Cascades, localizations, derived variants |
| `headline_outcomes` | 5 | Sandbox picks vs. outcomes |
| `pipeline_templates`, `pipeline_runs`, `pipeline_run_items` | 5 | Bulk orchestration |

Edge functions — extended: `verify-citations`, `distill`→`derive-assets`, `auto-title`, `orchestrate`, `collection-ingest`. New: `fact-check`, `style-check`, `interlink`, `export-cms`, `localize`, plus a `structure` action on `document-ai`.

## 6. Credits & economics
Extend `credit-schedule` (client + `credit_schedule` table): margin suggestions (cheap), style/structure passes (medium), fact-check runs, cascades, localization, and pipeline runs (the heavy hitters — metered per item). Client-side linting, cadence, and tell detection cost **zero tokens** by design — the authenticity layer is nearly free to run, which is exactly right for the always-on core value. Ghost text exits the cost model entirely.

## 7. Risks & watch-items
- **Sequence discipline:** the margin architecture (Phase 2) must land before Phases 3–5 add AI surfaces, or insert/replace habits get rebuilt and re-migrated.
- **Guardrail over-broadening:** only the *domain* wall comes down; abuse/injection/bulk-spam stay.
- **Provenance privacy:** aggregates only, opt-out, disclosed in Terms — a trust feature must not become a surveillance liability.
- **Detection-metric humility:** burstiness/perplexity/tell heuristics are signals, not verdicts; market the certificate as composition attestation, never as a guaranteed detector-pass.
- **Headline "predictions":** heuristic v1 must be labeled as such until `headline_outcomes` can train something real.
- **Contrast:** Dust Bunny Grey fails AA on Sunny Sky Blue; constrain or deepen contextually; keep the manuscript page paper-white.
- **External verification sources (feature 1)** depend on the environment's network policy; archive-only verification is the guaranteed baseline.
- **Lovable round-trip:** prefer additive, conventional React/Tailwind changes; rename internal `Ezra*` identifiers lazily.
- **Don't delete faith features:** flag off, preserve code and tables.

## 8. First PR
Phase 1 items 1–2 (guardrails + prompts + tests) exactly as scoped in the base plan §12, with the persona strings written as **PressRoom** and refusals in the Hunt's Pointe voice — so the unblock and the rebrand's functional half ship together. Items 3–4 (visual rebrand + theme) follow as the second PR to keep both reviewable.
