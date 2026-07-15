# Addendum — Hunt's Pointe & PressRoom

**Extends:** `docs/ezra-writing-suite-plan.md` (the base plan). Where this addendum conflicts with the base plan, **this addendum wins** — conflicts are called out explicitly in §D.
**Status:** Plan for review. No implementation until approved.

---

## A. Rebrand: the platform is Hunt's Pointe, the AI is PressRoom

- **Hunt's Pointe** is the platform — the independent digital publication's production home. (The repo is already named `hunt-s-pointe`; the brand catches up to the repo.)
- **PressRoom** is the AI editorial co-pilot — the single name for everything the base plan called "Ezra": the research chat, the margin assistant, the pipeline agents. This **supersedes** the base plan's §2.1 assumption of keeping the "Ezra" name.

### Rebrand mechanics
| Surface | Change |
|---|---|
| `index.html`, `scripts/generate-sitemap.ts`, `PublicLayout`, `Landing`, SEO/meta | "Ezra Research" → **Hunt's Pointe** |
| `AppSidebar.tsx` nav item "Ezra", `ROUTE_TITLES` in `App.tsx` | → **PressRoom** |
| Route `/app/ezra` | → `/app/pressroom`, keep `/app/ezra` as a redirect (pattern already exists for `/app/sentient`, `/app/mary`) |
| AI voice: guardrail refusals, `prompt-partner` persona, `write-assist` system prompt, empty states ("what are we studying?") | "I'm Ezra…" → PressRoom voice ("PressRoom here — …") |
| Component/file names (`Ezra*.tsx`, `useEzraChat`, CSS vars `--ezra-*`) | **Rename lazily.** User-facing strings change now; internal identifiers migrate opportunistically as files are touched, to keep diffs reviewable and Lovable round-trips safe |
| Legal pages (`TermsOfService`, `AISafetyPolicy`) | Rebrand + re-scope alongside the base plan §9 |

---

## B. The fifteen PressRoom capabilities

Who this is for: an **Editor-in-Chief of a fast-moving, independent digital publication**. PressRoom is not a grammar checker — it's an enterprise-grade editorial co-pilot that respects production pipelines, brand integrity, and scale.

Each feature below is mapped to what already exists in the codebase and what must be built. Effort: S/M/L.

### Group I — Editorial intelligence (features 1–2, 7–8)

#### 1. Asynchronous Multi-Agent Fact & Source Verification — **L**
A background pipeline that parses drafts, flags empirical claims/statistics/quotes, cross-references them against trusted external sources and the publication's own archive, surfaces inline citations, and assigns a confidence score — before an article reaches staging.

- **Builds on:** `verify-citations` (exists, 38 lines — currently minimal), `rag-retrieve` (466 lines, solid), `orchestrate`, the `collection_item_chunks` embedding store.
- **New:** a `fact-check` edge function that (a) extracts claims from `content_text` via the utility model, (b) fans out per-claim verification jobs (archive RAG + external search where the network policy allows), (c) writes results to a new `claim_checks` table (`document_id, claim_text, span, verdict, confidence, sources jsonb, checked_at`).
- **Trigger:** on `documents.status` transition to `in_review` (DB trigger → queued job), plus a manual "Verify draft" action. Results render as margin annotations (§ feature 15) with Tiger Lily Orange severity markers.
- **Multi-agent:** claim extraction, archive checking, and external checking run as separate function invocations coordinated by `orchestrate` — retries and partial results per claim, not per draft.

#### 2. Semantic Style Guide & Brand Voice Guardrails — **M**
Not "make it professional" — ingest the publication's actual house style guide, past articles, and formatting rules, and enforce them in real time: passive voice, banned phrases, departures from the house narrative stance.

- **Builds on:** `collection-ingest` + embeddings (ingestion is a solved problem here); the Collections→context plumbing already in `write-assist`.
- **New:** a `style_guides` table (rules as structured JSON: banned phrases, casing, formatting, stance notes) + a designated "House Style" collection for exemplar prose. Two enforcement layers:
  1. **Deterministic linter (client)** — banned phrases, passive-voice heuristics, formatting rules run as TipTap decorations while typing. Zero tokens, instant.
  2. **Semantic pass (server)** — every PressRoom editing prompt gets the style charter injected; a pre-staging `style-check` pass scores voice conformance against house exemplars.
- Freelance vs. staff drafts get identical enforcement — that's the point.

#### 7. Internal Asset Ingestion & Contextual Interlinking — **M**
Reads the publication archive to suggest hyper-relevant internal links, surface callouts to previous coverage, and flag topical redundancy or contradiction with earlier pieces.

- **Builds on:** the archive is already embedded (`collection_item_chunks`); `minisearch` is already a client dependency for instant lexical matching.
- **New:** an `interlink` edge function: given the current draft, return top-k archive matches with anchor-text suggestions; a contradiction sub-check comparing the draft's claims (from feature 1's extraction) against matched archive passages. Renders as margin suggestions — "You covered this in *[headline]*, link it?" / "This contradicts your March piece."

#### 8. Structural & Narrative Flow Analysis — **M**
Evaluates the macro-architecture: logical progression, buried ledes, missing context, paragraph reordering, subheading placement — for reader retention, not surface copyediting.

- **Builds on:** `document-ai` (add a read-only `structure` action); the outline rail from base plan §4.2 gives the UI skeleton.
- **New:** a structure report rendered in the margin panel: lede assessment, argument map, retention risks, reorder suggestions. **Read-only** — it never touches the manuscript (§ feature 15).

### Group II — Production pipeline (features 3–5, 9–10)

#### 3. Headless CMS Schema Mapping & Structured Data Output — **M**
PressRoom outputs structured content, not raw text: custom JSON, Markdown, or front-matter mapped to a headless CMS schema, with taxonomy tags, nested hierarchies, and predefined component blocks.

- **Builds on:** documents are already structured (TipTap JSON) with newsroom fields (`headline, dek, byline, section, status, publish_at, story_tags`); `@tiptap/html` and `marked` are already dependencies for serialization.
- **New:** a `cms_schemas` table (user-defined output schemas: field mappings, taxonomy rules, component-block mappings) + an `export-cms` edge function that renders a document through a schema → JSON / MD+front-matter. Taxonomy tags auto-generated by the utility model, editable before export. Delivery v1 = download/copy + webhook POST; native CMS connectors (Sanity/Contentful/Strapi) are fast-follows behind the existing Integrations surface.

#### 4. Automated Content Cascades & Format Adaptation — **M**
One click turns a finished piece into its downstream assets: SEO title/meta, newsletter summary, social thread, excerpt hooks — all context-faithful to the primary piece.

- **Builds on:** `distill` (exists — thread→summary) generalizes into a `derive-assets` function with per-format templates.
- **New:** `document_assets` table (`document_id, asset_type, content, status`); a "Cascade" panel in the editor listing generated variants with per-asset regenerate/edit/approve. **These are AI-authored by design** and clearly labeled as such — see the human-authorship boundary in §C.0.

#### 5. Multi-Variant Headline & Hook Sandbox — **M**
Generates diverse headline formulas per distribution channel — curiosity gap, data-driven, direct journalistic — with predictive engagement scoring. Optimizes CTR without clickbait.

- **Builds on:** `auto-title` (exists, single-shot) becomes the sandbox's engine; the `Analytics` surface holds historical data.
- **New:** a headline sandbox panel: N variants × formula × channel, side-by-side with the current headline. **Predictive analytics honesty:** real predictions need engagement data Hunt's Pointe doesn't ingest yet. v1 ships heuristic scores (formula match, length/clarity bands, house-style fit) clearly labeled as heuristics; a `headline_outcomes` table starts accumulating picked-vs-generated data so a real model can follow.

#### 9. Intention-Driven Bulk Processing & Pipeline Orchestrator — **L**
Run structured templates across batches — syndication feeds, press releases, raw interview transcripts — and emit standardized briefs or rough drafts into a production queue for human review.

- **Builds on:** `collection-ingest` (batch file ingestion exists), `orchestrate` (fan-out pattern exists), `documents.status` (the production queue already has states: `draft → in_review → ready → published`).
- **New:** `pipeline_templates` (instruction template + target schema + output status) and `pipeline_runs`/`pipeline_run_items` tables; a Pipelines surface (fits the existing Organize/board patterns) showing per-item progress; every output lands as a `draft` document flagged `auto_created` (column already exists) — **nothing skips human review**.

#### 10. Intelligent Localization & Regionalization Toggles — **M**
Beyond translation: contextual shifts of idiom, spelling, units, and cultural touchstones per regional sub-edition, so prose feels native everywhere without manual rewrite loops.

- **New:** `region_profiles` (locale, spelling system, unit system, idiom notes, cultural guidance) + a `localize` edge function producing per-region variants stored as `document_assets` (`asset_type: "regional:en-GB"` etc.). A region toggle in the editor previews variants side-by-side with the master. Voice Locks (feature 13) apply across localizations — the EIC's fingerprint survives regionalization.

### Group III — Human authenticity & provenance (features 6, 11–15)

> **The core value proposition.** For independent web publishers, the raw, human authenticity of the EIC's voice is the product. The human is the primary author; PressRoom is the pipeline manager. The failure mode to engineer against is over-sanitized prose — text flattened into algorithmic corporate-speak that reads as machine-made (and trips false-positive AI detection on *genuinely human* work).

#### 6. Granular Human-in-the-Loop (HITL) Revision Tracking — **M**
Versioning that distinguishes human edits from AI suggestions: inline diffs, semantic change summaries (*why* a rephrase was proposed), one-click rollbacks. The editor is the final authority, provably.

- **Builds on:** `document_versions` from base plan §7 — extended with `author_kind` (`human | ai_suggestion | ai_pipeline`) and `change_summary`.
- **New:** every accepted margin suggestion (feature 15) records a version entry attributing the change; a History drawer shows the human/AI-attributed timeline with per-entry rollback. Semantic summaries are generated at suggestion time (the model explains its own proposal), not reconstructed later.
- This table is also the data source for the provenance ledger (11) and voice-lock training (13).

#### 11. Cryptographic Provenance Ledger (Proof of Human Work) — **L**
Invisible background attestation during drafting: session duration, keystroke dynamics, backspaces, natural pauses — rolled into a verified "Proof of Work" certificate attached to the CMS export, demonstrating the manuscript was organically composed over time rather than generated in a single batch.

- **Design:** the editor accumulates **aggregate** session telemetry client-side (event counts, typing-cadence histograms, edit-burst timings — *never raw keystroke content*), periodically sealing signed session digests into a hash-chained `provenance_ledger` table (`document_id, session_digest, prev_hash, signed_at`). The chain plus the human/AI attribution stream from feature 6 yields a certificate: % human-typed, composition timespan, session count, AI-assist events.
- **Export:** the certificate rides along in `export-cms` output as metadata the CMS can publish or verify.
- **Privacy stance (non-negotiable):** aggregates only, per-user opt-out, documented plainly in the Terms. This attests *how the work was made*; it is not surveillance of *what was typed*.

#### 12. Stylometric "Burstiness" & Perplexity Monitoring — **M**
LLMs trend toward uniform sentence lengths and predictable word choices; human prose is erratic — punchy fragments beside long compound sentences. A real-time dial tracks both metrics; if an AI copyedit smooths the text below the "reads as machine-made" threshold, the system flags the edit and suggests restoring the original cadence.

- **Design:** burstiness (sentence-length variance, punctuation rhythm) is computed client-side in a debounced worker — cheap and instant. Perplexity is approximated v1 with a lightweight local n-gram/frequency model (a true LM-scored perplexity endpoint can follow). Rendered as a small **cadence dial** in `EditorChrome` using the guardrail palette.
- **The guardrail moment:** when a PressRoom suggestion would drop the score across the threshold, the *suggestion itself* gets flagged in the margin — "this edit flattens your cadence" — before the EIC accepts it, wired into the same accept/reject flow as feature 15.

#### 13. Idiosyncratic Voice Locking & Trait Protection — **M**
Map the EIC's stylometric fingerprint from their historical corpus — em-dash habits, signature colloquialisms, conjunction-led paragraphs — and establish **Voice Locks** that every grammar/flow pass is prohibited from sanitizing.

- **Design:** a `voice_profiles` table built by a corpus-analysis job over the user's archive (feature 7's embeddings + a stylometric pass): locked traits stored as structured rules + exemplars. Enforcement is dual: (1) locks are injected as hard constraints into every PressRoom editing prompt; (2) a deterministic post-pass rejects suggestions that strip locked traits (e.g., replaces an em dash with a semicolon) before they ever render in the margin.
- Users can view and hand-edit their locks — the profile is theirs.

#### 14. Algorithmic Tell & N-Gram Highlighting — **S**
An anti-homogenization filter that scans for statistically over-indexed LLM vocabulary (*delve, tapestry, crucial, multifaceted, overarching, …*) before staging, highlighting hits in the editor so the EIC swaps them for natural alternatives by hand.

- **Design:** a curated, versioned tell-lexicon (`src/lib/tells.ts`, shipped client-side — zero tokens, zero latency) rendered as Tiger Lily Orange TipTap decorations with hover cards suggesting the writer *consider* alternatives — never auto-replacing (that would just re-homogenize). A document-level "tell density" stat joins the cadence dial. Same lexicon runs server-side over pipeline outputs (features 4, 9, 10) since those are AI-authored and need it most.

#### 15. Non-Destructive, Suggestion-Only Margin Architecture — **L** · **the governing interaction principle**
No "rewrite this paragraph" button may overwrite the manuscript. PressRoom's editing assistance is confined to **marginalia**: semantic diffs, inline annotations, structural notes, alternative phrasings — proposed in the margin, integrated by the EIC's own hands.

- **Design:** a unified annotation layer — `document_annotations` (`document_id, span_from, span_to, kind, body, proposed_text, status, created_by`) — rendered as a margin rail beside the manuscript (the geometry of the current side panel, rebuilt as anchored annotations). Every PressRoom capability that touches prose emits annotations into this one system: style lints (2), fact-check flags (1), interlink suggestions (7), structure notes (8), cadence warnings (12), tell highlights (14).
- **Integration is manual by design:** an annotation shows a semantic diff of the proposal; the EIC types the change into the manuscript themselves (or dismisses it). For mechanical fixes (typos, banned phrases) a per-annotation "apply" exists but is rate-limited, individually attributed in the HITL ledger (6), and counted against the provenance certificate (11) — the human-typed path is always the frictionless default; bulk "accept all" does not exist.
- **What this supersedes in the current code and the base plan — explicit breaking changes:**
  - `AIBubbleMenu.tsx` in-place `insertContentAt` rewrites → presets now emit margin annotations.
  - `EzraAssistBar` "Insert below / Replace selection" → "Propose in margin."
  - `SlashMenu` "Continue writing with AI" → "Draft a continuation (to margin)."
  - **Base plan §5.4 ghost-text autocomplete is retired entirely.** Inline machine-generated prose is the antithesis of this architecture. (This also deletes the base plan's biggest cost risk.)

---

## C. Boundaries and the color system

### C.0 The human-authorship boundary (resolves the apparent contradiction)
Group II has PressRoom *generating* content (cascades, briefs, localizations); Group III forbids PressRoom from writing into the draft. The line:

> **The manuscript is human territory** — PressRoom may only annotate it (feature 15).
> **Derived assets are machine territory** — cascades, bulk briefs, localizations, headline variants are AI-authored by design, stored *outside* the manuscript (`document_assets`, pipeline outputs), always labeled, always behind human review, and excluded from the manuscript's provenance certificate.

Every feature in this addendum sits cleanly on one side of that line.

### C.1 The new color scheme — vibrant light mode
The interface is reimagined as a **vibrant, light-mode environment** — playful, energetic, built to keep creative energy high during editing. (The hex values map exactly onto Tailwind's stock palette — noted per color — which keeps the theme maintainable.)

| Name | Hex | Tailwind | Role | Vibe |
|---|---|---|---|---|
| **Sunny Sky Blue** | `#93C5FD` | `blue-300` | Primary viewport background | Light, airy, optimistic |
| **Matte Lilac-Slate** | `#C4B5FD` | `violet-300` | Panels, margins, sidebars | Cozy cool lavender; separation without sterility |
| **Charcoal Pencil** | `#171717` | `neutral-900` | Primary human-authored draft text | Deep, legible, organic |
| **Dust Bunny Grey** | `#737373` | `neutral-500` | Metadata, nav, inactive text | Recessive and gentle |
| **Magic Marker Purple** | `#A855F7` | `purple-500` | AI suggestions, diffs, margin notes | Confident, creative, immediate |
| **Ghost Lilac Overlay** | `#D8B4FE` @ 20% | `purple-300/20` | Inline wash on text under AI discussion | Gentle, non-disruptive |
| **Tiger Lily Orange** | `#F97316` | `orange-500` | Homogenization alerts, AI tells, provenance interruptions | Energetic, impossible to miss |
| **Lucky Charm Green** | `#22C55E` | `green-500` | CMS publish success, ledger verification | Bright, encouraging, satisfying |

**Semantic rule the palette encodes:** purple = *the machine is suggesting*, orange = *the machine is warning*, green = *the pipeline succeeded*, charcoal-on-blue = *the human is writing*. Users learn the color language once and it holds everywhere — margin rail, cadence dial, pipeline queue, export flow.

**Implementation** (`src/index.css` + `tailwind.config.ts`):
- Retitle the `:root` light theme: `--background: 213 97% 78%` (sky), panel/sidebar tokens → lilac-slate, `--foreground: 0 0% 9%`, `--muted-foreground: 0 0% 45%`.
- New semantic tokens consumed by every feature above: `--ai-accent` (purple), `--ai-wash` (ghost lilac @ 20%), `--guardrail` (orange), `--verified` (green) — exposed in `tailwind.config.ts` as `ai`, `ai-wash`, `guardrail`, `verified`.
- Flip the default theme in `App.tsx`: `defaultTheme="dark"` → `"light"`. Keep the existing dark slate/brass theme available as the toggle alternative (the theme infra is already `next-themes`).
- **The manuscript page itself stays paper-white/near-white** — sky blue is the *desk*, not the *page*. Charcoal on white preserves maximum reading contrast; the sky/lilac frame supplies the energy.
- **Accessibility watch-item:** Dust Bunny Grey on Sunny Sky Blue is ~2.5:1 — fails WCAG AA for body text. Constrain it to large/decorative/inactive elements on the sky background, or deepen it contextually (e.g. `neutral-600`) where it must carry legible metadata. Validate the full palette with the dataviz/contrast checklist before shipping.
- The public marketing surface (`public-theme.css`) rebrands on its own schedule; this scheme governs the app.

---

## D. Explicit supersessions of the base plan

| Base plan item | Status after this addendum |
|---|---|
| §2.1 keep "Ezra" as assistant name | **Superseded** — assistant is **PressRoom**, platform is **Hunt's Pointe** |
| §2.2 general-purpose audience | **Superseded** — audience is the independent-publication EIC; newsroom is the identity, not a flavor |
| §5.1 side-assist "diff-style application", Insert/Replace | **Superseded** by feature 15's margin-only architecture |
| §5.2/§5.3 bubble-menu in-place rewrites, AI slash inserts | **Superseded** — same |
| §5.4 ghost-text autocomplete | **Retired** — incompatible with human-first authorship |
| §7 `document_versions` | **Extended** — author attribution + semantic summaries (feature 6) |
| §8 credit event types | **Extended** — pipeline runs, cascades, fact-check, localization become the metered heavy hitters; the retired ghost text exits the cost model |
| Everything else (Phase 1 guardrails, editor-as-home, research→draft, copy sweep) | **Stands**, re-skinned under the new brand |
