# Feature Batch 2 — Credits, Power Levels, Photo Editor, and Polish

**Scope:** Six items across the authenticated experience. Every design decision below is held to one bar: an AWWWards-caliber experience — calm, crafted, trustworthy — for the faith-based community this product serves.
**Status:** Plan for review. No implementation until approved.

Decisions already confirmed: tunable credit economics · custom branded photo editor · credits-only cost tab (zero USD client-side) · power levels ship in Ezra chat first.

---

## 1. Credits, not dollars — and an internal cost ledger

### The problem
`src/components/analytics/CostTab.tsx` shows users estimated **USD** figures ("This month $0.124") computed client-side from `src/lib/cost-estimates.ts` per-event rates. That exposes your unit economics to every subscriber and frames the product as a metered bill instead of a membership.

### User-facing: the Credits tab
- Rename the Analytics "Cost" tab → **"Credits"** (`VALID_TABS` in `Analytics.tsx`; keep `?tab=cost` redirecting to `?tab=credits` so old links don't break).
- Rebuild `CostTab.tsx` → `CreditsTab.tsx`:
  - **Hero: a credits ring** — a circular gauge in the brand brass showing credits used / monthly allowance, with the renewal date beneath ("Renews Aug 1"). This is the single number a subscriber actually needs.
  - **Stat tiles**: Used this month · Remaining · Avg credits/study · Top activity — all in credits, tabular numerals, same `StatTile` component.
  - **Charts** (reuse `ChartKit` + `chart-theme`): daily credits burn (stacked by activity) and credits by feature — same visual system as today, unit swapped.
  - **Pace line**: "At this pace you'll use ~62% of your credits this month" — turns anxiety into reassurance. Tips reframed from "spend" to "getting the most from your credits."
- **Delete every USD trace from the client**: `formatUSD`, `COST_PER_EVENT` (USD values), and the "$" tiles are removed. `cost-estimates.ts` becomes `credit-schedule.ts` (below).

### Credit economics (tunable defaults)
New `src/lib/credit-schedule.ts` — one file you retune without touching components:

```ts
// Baseline action costs, in credits (tunable)
chat_message: 1        // × power multiplier (see §4)
study_orchestration: 4
refinement: 1
image_generation: 10
write_assist: 2
// Power multipliers: depth 1–8 → ×0.5…×2.5; turbo → ×1.5 extra
// Plan allowances (tunable): free: 300/mo · pro: 3,000/mo
```

Mirrored in a `credit_schedule` DB table (single source of truth for the server; the client file holds fallback defaults) so you can retune live.

### Internal-only raw cost table
New migration:

```sql
CREATE TABLE public.internal_cost_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,          -- chat_message | image_generation | …
  model text,                        -- actual model used
  input_tokens int, output_tokens int,
  raw_cost_usd numeric(10,6) NOT NULL, -- what it actually cost YOU
  credits_charged numeric(8,2) NOT NULL,
  power_level int, turbo boolean,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.internal_cost_ledger ENABLE ROW LEVEL SECURITY;
-- NO user-facing policies. RLS on + zero policies = only the service role
-- can read/write. Your future internal tooling app connects with the
-- service key (or a dedicated `internal_admin` role) and sees everything;
-- authenticated users get nothing, even with a tampered client.
```

Edge functions (`prompt-partner`, `generate-image`, `orchestrate`, `refine`, `write-assist`) write one row per billable call via their existing service-role clients — real token counts and real USD, alongside the credits charged. The user-visible ledger stays `usage_logs` (already RLS'd per-user), now with `credits` in its metadata.

**Verification:** as an authenticated user, `select * from internal_cost_ledger` must return zero rows / permission denied; Credits tab renders in credits only; grep proves no `$`-formatting remains in authenticated components.

---

## 2. Retire the Larry June easter egg → "Ezra Research" masthead

### Removal (complete, not disabled)
- Delete `src/components/ezra/OrgoEgg.tsx`, `src/lib/orgo-theme.ts`, `src/styles/orgo-theme.css`.
- Remove the import from `src/main.tsx`, the `<OrgoEgg>` render + `useOrgoTheme`/`data-theme="orgo"` from `src/pages/Ezra.tsx`, and the `<OrgoEgg>` slot in `src/components/mobile/MobileHeader.tsx`.
- Sweep `grep -ri orgo src/ --include='*.{ts,tsx,css}'` to zero (Bible JSON data files contain incidental word matches — untouched).

### The masthead
The mobile header currently shows the page title next to the hamburger. It becomes a **brand masthead**:

- **"Ezra Research"** set in Spectral (the display serif), centered and spanning the top bar — the same quiet-authority move as Claude.ai's wordmark. Letterspaced small caps, ink on paper, weight 600.
- The hamburger keeps the top-left corner; the right slot keeps page telemetry (Ezra's RAG status) at whisper size.
- The **page context** moves to a small label under the masthead on non-Ezra pages (or the drawer's active row carries it — the drawer already highlights the current page), keeping the bar uncluttered.
- Files: `MobileHeader.tsx` + `mobile-nav.css` only. Desktop untouched.

---

## 3. Image generation — text on images + the Ezra photo editor

### The problem
`generate-image` has `typographic` style presets, but diffusion models garble text — and the user has no way to add or fix text after generation. The fix is not "prompt harder"; it's **real typography composited client-side**.

### 3a. Verse text overlay at generation time
- In `Create.tsx`, add an optional **"Featured text"** field (verse + reference) with a toggle: *"Render text as crisp typography over the image"* (default ON for typographic styles).
- When ON, the server prompt asks for a composition with clear negative space (no model-drawn text — extend `GLOBAL_NEGATIVE`), and the client composites the text as a **live SVG/canvas overlay** using brand typography — Spectral for the verse, letterspaced caps for the reference — with smart placement (rule-of-thirds anchor points) and an automatic legibility scrim.
- The overlay is editable: it opens straight into the editor (below) with the text layer selected.

### 3b. The Ezra photo editor — custom, branded, hyper-friendly
A hybrid taking the best pattern from each reference repo, none of their weight:

| From | We take |
|---|---|
| filerobot-image-editor | The **tab-rail UX**: one tool visible at a time, giant touch targets, never a cluttered toolbar |
| tui.image-editor | The **non-destructive layer model**: base image + text/adjustment layers, undo/redo stack |
| react-image-editor (mukeshsoni) | The **radical simplicity**: minimal state, plain canvas compositing, no framework baggage |

**Architecture** — `src/components/editor/`:
- `PhotoEditor.tsx` — full-screen sheet (desktop: centered dialog; mobile: full-bleed), opened from any generated image (Create page result, history grid, and the existing `ImageLightbox` gets an "Edit" action).
- `editor-engine.ts` — pure-TS canvas compositor: base bitmap + ordered layer list, renders to `<canvas>`, exports PNG/JPEG at original resolution. Undo/redo = immutable snapshots of the layer list (cheap — layers are data, not pixels).
- Four tools, one visible at a time, on a bottom tab rail (mobile) / left rail (desktop):
  1. **Text** — the hero tool. Add verse text: drag to place, pinch/handles to size, brand font presets (Spectral serif · caps label · handwritten-feel italic), ink/paper/brass color chips, optional legibility scrim toggle. Live preview, always crisp (vector until export).
  2. **Crop** — aspect presets (Square · Story 9:16 · Wide 16:9 · Free), rule-of-thirds grid, rotate 90° / flip.
  3. **Tune** — three sliders only: Light, Warmth, Fade (CSS-filter-composited). Opinionated presets ("Vesper", "Manuscript", "Morning") instead of 15 raw sliders.
  4. **Frame** — optional border in paper/ink + a subtle "Ezra Research" corner mark toggle (off by default).
- **Save**: exports the flattened image back to Supabase storage as a new `generations` row (`edited_from` column referencing the original — original never destroyed), plus Download.
- Zero new heavy dependencies: canvas API + existing framer-motion for tool transitions. Reduced-motion honored; every control keyboard-reachable; 44px minimum targets.

**Verification:** generate → add verse text → crop to Story → tune → save; re-open saved copy; text renders pixel-crisp at export resolution; original untouched.

---

## 4. Power Levels — Speed↔Depth + Power/Turbo (usage economics)

### The problem
`ModelPicker` exposes raw model names ("Flash-Lite", "GPT-5 mini") — implementation detail as UI. Users shouldn't pick vendors; they should pick *how hard Ezra thinks*, and see what it costs in credits.

### The control — one dropdown, two axes
Replaces `ModelPicker` in `EzraComposer` (same slot). A popover styled like a fine instrument panel:

1. **Speed ↔ Depth slider — 8 stops.** A horizontal brass-detented slider. Left = "Speed" (instant answers for simple questions), right = "Depth" (deep biblical exegesis across multiple books). Each stop maps internally to a model + retrieval budget:

   | Stops | Model | RAG top_k | Context |
   |---|---|---|---|
   | 1–2 | gemini-2.5-flash-lite | 3 | lean |
   | 3–4 | gemini-2.5-flash | 5 | standard |
   | 5–6 | gemini-2.5-pro | 7 | wide |
   | 7–8 | gemini-2.5-pro | 10 (max) | full collection sweep |

2. **Power — 5 levels + Turbo.** Five segmented notches (1–5) controlling reasoning effort/output budget, plus a **Turbo** toggle — a distinct brass switch with a subtle glow when armed — that unlocks maximum reasoning + full multi-book cross-referencing. Level 1 + Speed ≈ "what does this verse say"; Level 5 + Turbo + Depth ≈ "trace covenant theology across the Pentateuch with my 40-source collection."

3. **Live credits estimate** — the panel's footer shows "≈ 3 credits per message" updating as the user moves either control, and the collapsed trigger shows a compact glyph + current setting (e.g. "◆ Depth 6 · P3"). This is the economics loop: the user *feels* the cost dial.

### Plumbing
- New `src/hooks/usePowerLevel.ts` (localStorage, like `useModelPreference` — which it replaces). Exports `{ depth: 1-8, power: 1-5, turbo: boolean }` + derived `{ model, topK, reasoningBudget, creditMultiplier }` from a single `POWER_MATRIX` in `credit-schedule.ts`.
- `useEzraChat` sends `power: { depth, power, turbo }` alongside the existing `model` field (kept for compatibility). `prompt-partner` validates it (zod), derives the model server-side from the same matrix (client can't spoof a cheap-credit/expensive-model combo), passes `topK` through to `rag-retrieve` (already supports 1–10), and records `power_level`/`turbo`/`credits_charged` to both ledgers (§1).
- New component `src/components/ezra/PowerDial.tsx`; `ModelPicker.tsx` and `useModelPreference.ts` are deleted after migration.

**Verification:** each of the 8 stops sends the right model + top_k (assert in `prompt-partner` unit tests — `turn.test.ts` pattern exists); credits estimate matches the ledger row written; existing sessions unaffected.

---

## 5. Scripture search landing — flag the verse (bug fix)

### Root cause (found)
`Bible.tsx:171-183` already tries to flash the landed verse, but the effect races: when the search result targets a **different chapter**, the effect runs against the *old* chapter's DOM before `loading` flips true — it either flashes the wrong verse element (same verse number, old chapter) or hits the `el == null` path and **clears `flashVerse` permanently**, so the real chapter arrives with no highlight. Same-chapter jumps mostly work, which is why it feels intermittent.

### Fix + upgrade
- **Correctness:** gate the effect on the loaded chapter matching the target — store `flashTarget = { book, chapter, verse }` instead of a bare number; only fire when `!loading && pos.book === target.book && pos.chapter === target.chapter && verses.length > 0`; never clear the target on a miss, only on success or navigation elsewhere.
- **Design (the "flag"):** replace the 2.4s flash-only with a **persistent landing marker** the user can't miss:
  - A brass **flag bar** on the verse's left edge (mirroring the drawer's active-item language) + a soft parchment-glow background.
  - It **stays** until the reader taps anywhere else in the chapter or navigates — no more "look away and it's gone."
  - Entry: the smooth scroll-to-center stays, plus a one-time gentle emphasis pulse (skipped under reduced motion).
- Files: `Bible.tsx` (state + effect), `index.css` (`.bible-verse-flash` → `.bible-verse-landed` styles, both themes).

**Verification:** search → tap a result in another book/chapter → page opens with the verse centered and flagged; flag persists through scroll; tap elsewhere dismisses; same-chapter result also flags; reduced-motion shows the flag without the pulse.

---

## 6. Save button in the Write bar

### Placement
In `EditorChrome.tsx`'s top-bar action cluster, ordered left→right: **Save · Focus · Copy · Export**. Save takes the left edge of the cluster — first position for the highest-intent action, matching the muscle memory of every serious editor, with `⌘S`/`Ctrl+S` bound (currently the browser eats it).

### Behavior — trust made visible
The app already autosaves (`useAutosave` with a status ribbon), so this button's job is **assurance**, not necessity:
- Click (or ⌘S) → forces an immediate flush of pending changes (`useAutosave` gains an exposed `saveNow()`; today's debounce timer path is refactored so both routes share one write).
- The button itself narrates state: `Save` → spinner → a brief brass **✓ Saved** morph before settling back — the same state machine as the ribbon, so they never disagree.
- When nothing is dirty, it sits quietly at muted opacity (never disabled-gray — tapping it still confirms "✓ Saved just now"). Mobile: icon-only like its neighbors, 44px target.
- Files: `EditorChrome.tsx` (button + shortcut), `useAutosave.ts` (expose `saveNow`), `Write.tsx` (wire-through).

**Verification:** type → ⌘S → ribbon and button agree "Saved"; kill network → Save shows the existing retry-error state; focus mode unaffected.

---

## Delivery order & safety

| Phase | Items | Risk notes |
|---|---|---|
| 1 | §5 scripture fix + §6 save button | Small, isolated, immediate wins |
| 2 | §2 Orgo removal + masthead | Pure removal + mobile-only CSS; sweep for dangling imports |
| 3 | §1 credits tab + internal ledger (migration first, UI second) | RLS verified before UI ships; old Cost tab kept behind the redirect until CreditsTab is proven |
| 4 | §4 power levels | Server validates matrix; `model` field kept for rollback |
| 5 | §3 text overlay + photo editor | Largest net-new surface; ships behind the Create page only, then lightbox |

Every phase: `tsc --noEmit`, eslint, vitest, and a real-browser walkthrough (390×844 + desktop, light + dark) before commit — same discipline as the nav redesign. Nothing existing is removed until its replacement is verified in-browser.
