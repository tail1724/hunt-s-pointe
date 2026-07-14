## Goal

Repurpose the existing SaaS into a domain-agnostic, AI-assisted drafting workspace for a digital publication (Axios-style: short "smart brevity" pieces with dek, bullets, "why it matters", "go deeper"). Keep the Bible intact as an optional reference/inspiration source. The three surfaces that change most are **Write** (drafting), **Collections** (story assignments / editorial packages), and **File Cabinet** (research + drafts + published archive).

## Scope

**In scope**
- Write editor: article metadata (headline, dek, byline(s), section, status, tags, publish date) + structured Axios-style section blocks.
- Collections: retrofit as "Story Packages" / assignments with editorial fields.
- File Cabinet: retrofit into a newsroom archive with status filters (Draft / In Review / Ready / Published), source-type filters, and research assets.
- Landing + nav copy repositioned around "AI-assisted newsroom for digital publications".
- Bible: kept, exposed as an optional "Reference source" that can be pulled into a story package.

**Out of scope (this pass)**
- Real CMS publishing/export integrations (WordPress, Ghost, etc.) — leave a stub export.
- Multi-user editorial review workflows beyond a single `status` field.
- Renaming/removing the Bible feature.

## Concept mapping

```text
today                       →   repurposed as
─────────────────────────────────────────────────────────
Write / documents           →   Article drafts (with byline + metadata)
Collections                 →   Story Packages (assignments)
Collection items/artifacts  →   Research notes, quotes, links, source docs
File Cabinet                →   Newsroom archive (drafts, in review, published)
Ezra assistant              →   AI editor / drafting copilot
Bible                       →   Optional reference source
```

## Changes

### 1. Article data model (Write)
Extend the `documents` table with newsroom fields via a migration. All optional so existing rows keep working.

New columns on `documents`:
- `headline text` (mirrors title for existing rows)
- `dek text` (subhead / one-line summary)
- `byline text[]` (author names; free-text, no auth coupling)
- `section text` (e.g. Politics, Tech, Business — free text, suggestions from a config list)
- `status text` default `'draft'` — one of `draft | in_review | ready | published | archived`
- `publish_at timestamptz null`
- `story_tags text[]`
- `story_package_id uuid null` — FK to `collections.id` (soft link, on delete set null)

RLS: mirror existing `documents` policies. Add `GRANT` block per project rules.

### 2. Write page — article shell
`src/pages/Write.tsx` + `src/components/write/`:
- Add an **ArticleHeader** component above the editor with fields: Headline, Dek, Byline (chips), Section (combobox), Status (segmented), Publish date, Tags.
- Add **Smart Brevity section blocks** in `SlashMenu.tsx` / a new `ArticleBlocks.ts`:
  - "Why it matters"
  - "The big picture"
  - "By the numbers"
  - "What they're saying" (pull-quote)
  - "Go deeper" (links list)
  Each is a styled Tiptap node/callout that renders with a colored left rule and label — Axios-style.
- Extend `EzraAssistBar` presets: "Draft dek", "Suggest headline (3 variants)", "Tighten to smart brevity", "Add 'why it matters'", "Fact-check pass (flag claims)".
- Word count + reading-time already-ish; add a small "target length" chip.

### 3. Collections → Story Packages
`src/pages/Collections.tsx`, `CollectionDetail.tsx`, and `src/components/collections/*`:
- Rename user-facing labels to "Story Packages" (keep table name `collections`).
- Add package-level fields (new columns on `collections`):
  - `angle text` (the pitch / thesis)
  - `deadline date null`
  - `assigned_to text[]` (byline candidates)
  - `status text` default `'open'` (`open | drafting | ready | shipped`)
- `CollectionDetail` gains three tabs:
  1. **Brief** — angle, deadline, assignees, key questions.
  2. **Research** — existing items/artifacts (notes, links, quotes, uploaded docs, Bible passages when relevant).
  3. **Drafts** — documents where `story_package_id = this.id`, with quick "New draft in this package".
- `CollectionPicker` used from Write now writes `documents.story_package_id` in addition to existing tagging.

### 4. File Cabinet → Newsroom archive
`src/pages/FileCabinet.tsx`:
- Replace `SourceFilter` with a **Status filter** (All / Draft / In review / Ready / Published / Archived) driven by new `status` column.
- Add a secondary filter: Section, Byline, Package.
- Columns/rows show: headline, dek preview, byline, section, status pill, updated.
- Keep Images tab; add a **Sources** tab that lists uploaded research assets across packages (reuses `collection_artifacts`).
- "New article" button creates a `documents` row with `status='draft'` and optional package pre-select.

### 5. Ezra assistant tuning
`src/components/ezra/*` (light touch):
- Update system prompt for the drafting context: newsroom copy editor, smart-brevity conventions, neutral tone, cite sources from the active Story Package's research, never fabricate quotes.
- When a Story Package is active, pass its Brief + Research items as context (already partly wired via `useActiveCollection`).
- Keep model default per project rules.

### 6. Bible integration (kept, repurposed as a source)
- No removal. Add a "Add to Story Package → Research" action from `BiblePassagePicker` / `StudyDrawer` so a passage becomes a research artifact (type: `reference`) inside a package. That's the only new wiring; Bible pages otherwise unchanged.

### 7. Landing, nav, copy
- `src/pages/Landing.tsx` + `src/components/public/sections/*`: reposition hero and features around "AI-assisted drafting for digital publications — Axios-style smart brevity, story packages, and a research desk".
- Sidebar labels: **Write** stays, **Collections → Story Packages**, **File Cabinet → Newsroom**. Bible stays.
- Update `<SEO />` title/description in `index.html` and landing.

### 8. Memory / boilerplate rules
Per project memory ("Always use generic placeholders"), keep all new copy generic — refer to "your publication", "your desk", never a specific outlet name.

## Technical details

- Migration adds columns + a `story_package_id` FK; single migration file; includes `GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;` re-affirmation only if grants were missing (verify first, otherwise skip).
- Backfill: `UPDATE documents SET headline = title WHERE headline IS NULL;` and `status='draft'` default handles existing rows.
- Tiptap section blocks implemented as a single `Callout` node with a `variant` attribute (`why_it_matters | big_picture | by_the_numbers | what_theyre_saying | go_deeper`) to avoid five near-duplicate nodes; styled via CSS variables from the existing palette (deep indigo rule + warm gold accent for "by the numbers").
- Status pill colors: reuse the semantic tokens already in `index.css`; no new hex values.
- File Cabinet filter state moves into URL search params (already partially done) so shareable views work.
- All new UI reuses shadcn primitives already in `src/components/ui/`.

## Rollout order

1. Migration + `documents` / `collections` column additions and generated types refresh.
2. Article metadata header + status field in Write; File Cabinet status filter + columns.
3. Axios-style section blocks (Callout node + slash menu entries).
4. Collections → Story Packages tabs (Brief / Research / Drafts) and package linking from Write.
5. Ezra prompt + context wiring for the active package.
6. Bible "Send to Research" action.
7. Landing + nav copy pass and SEO metadata.

## Open questions (safe defaults chosen if unanswered)

- Multiple bylines allowed? Default: **yes** (`text[]`).
- Sections come from a fixed list or free text? Default: **free text with suggestions** from `src/config/`.
- Should "published" articles become read-only? Default: **yes**, with an "Unpublish to edit" affordance.
