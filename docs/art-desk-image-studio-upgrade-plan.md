# The Art Desk — Upgrading Hunt's Pointe's Image Generation Suite

**Scope:** Take the existing image-generation feature — a ministry-flavored "sacred art" tool bolted onto the chat and the Create page — and turn it into **the Art Desk**: a publication-grade visual production suite that produces on-brand article art, section headers, social cards, and illustrations, honestly labeled as AI, wired into the document and cascade pipeline.
**Status:** Plan for review. No implementation until approved.
**Extends:** `docs/hunts-pointe-omnibus-plan.md` and `docs/hunts-pointe-pressroom-addendum.md`. The Art Desk is the visual counterpart to PressRoom's text work, and inherits the same rules: honest provenance, brand consistency, human control.

---

## 0. TL;DR

The image engine already works end to end — Gemini via the Lovable gateway, curated art-direction presets, a genuinely capable client-side photo editor, a carousel builder, per-user storage, and cost bookkeeping. But it is (a) still branded for the old ministry vertical, (b) faking core capabilities (aspect ratios are prompt *text*, not real dimensions; there is no reference-image / img2img path), and (c) disconnected from the newsroom workflow the rest of the pivot built. This plan re-skins it as **the Art Desk**, makes the faked capabilities real, adds the features a working publication actually needs (brand kit, article-hero generation from a draft, variations, alt-text, honest AI labeling), and connects it to the Write editor and the cascade panel.

---

## 1. What exists today (audit)

**Engine — `supabase/functions/generate-image/index.ts` (274 lines):**
- Model: `google/gemini-2.5-flash-image-preview` via the Lovable AI Gateway.
- 8 hardcoded art-direction styles (`STYLES` map), **duplicated** in `src/lib/image-styles.ts` for the client picker — still sacred-art themed ("illuminated manuscript", "stained glass", "uncanny photorealistic Jesus face" in the negative list).
- Aspect presets (`square/wide/story/print`) are injected as **prose composition hints**, not real output dimensions — the model returns whatever size it wants.
- Overlay text is folded into the prompt for typographic styles.
- Uploads a PNG to the public `generated-media` bucket, inserts a `generations` row; the style id rides in the `caption` column as `style:<id>` (a schema hack).
- Records internal provider cost ($0.04) and credits (10) to the ledger.
- **Guardrails already pivoted** in Phase 1: `IMAGE_DOMAIN_GUARDRAILS` now forbids fake news photos, deceptive real-person depiction, forged documents — good, keep building on it.

**Client surfaces:**
- `src/pages/Create.tsx` (`/app/generate`, titled "Generate") — source-prompt selector, single-image generation, featured-text field, plus **dead** Video and Audio placeholder cards.
- `src/components/ezra/EzraImageOffer.tsx` — a per-chat-turn "make an image of this" offer (still says "Verse art, sermon graphics").
- `src/components/editor/PhotoEditor.tsx` + `editor-engine.ts` — a real, non-destructive canvas editor: text layers, crop/aspect, tune presets, frames. WYSIWYG, client-side, capable. **This is an asset — keep and extend it.**
- `src/components/create/CarouselBuilder.tsx` + `supabase/functions/decompose-scenes` — decomposes a brief into 12–20 scenes and renders each.
- `src/components/cabinet/ImageGallery.tsx` — the File Cabinet "Images" tab.

**Data model — `generations` table:** `id, user_id, prompt_history_id, media_type, source_prompt, result_url, status, campaign_id, carousel_group_id, scene_order, caption`. Public bucket with per-user folder RLS.

**The core gaps:**
1. **Identity** — sacred styles and ministry copy across the engine and every surface.
2. **Faked capability** — aspect ratio and true resolution aren't real; no reference image, no img2img, no variations/seed, no upscale.
3. **Disconnection** — the image suite doesn't know about documents, house style, or the cascade; article art is a manual copy-paste round trip.
4. **No brand system** — every render is a one-off; a publication needs a consistent look.
5. **No provenance** — AI images ship unlabeled, which contradicts the platform's whole "provably human / honest about the machine" positioning.
6. **Schema debt** — style-in-caption hack; `media_type`/status underused; no metadata column.

---

## 2. Product definition — the Art Desk

The Art Desk produces **four asset classes**, each a first-class workflow, not a freeform prompt box:

1. **Article art** — a hero image for a specific document, generated from its headline/dek/section, in the publication's house look.
2. **Section & series headers** — reusable banners tied to a section or Project.
3. **Social cards** — the visual half of the cascade (§Phase 4 of the omnibus): per-channel sizes, headline set in real type, brand-locked.
4. **Illustrations & explainer graphics** — freeform, but still brand-aware and honestly labeled.

Cross-cutting principles (inherited from the addendum):
- **Honest provenance.** Every AI image is labeled as AI-generated in its metadata and, where it ships, visibly — the same integrity stance as the provenance ledger for text.
- **Brand consistency by default.** A brand kit (palette, type, logo, standing art direction) is applied unless the user opts out.
- **Human control.** The photo editor stays the finishing surface; nothing auto-publishes.

**Naming:** the AI is **PressRoom**; the visual suite is **the Art Desk** (a real newsroom department). Route `/app/generate` → `/app/studio` (keep `/app/generate` as a redirect, matching the `/app/ezra`→`/app/pressroom` pattern). Nav label "Generate" → "Art Desk."

---

## 3. Decisions to confirm

1. **Model strategy.** Stay on the single Gemini preview model, or introduce a **quality tier** (fast/preview vs. high-fidelity) and possibly a second provider through the gateway? The plan assumes **add a two-tier quality switch on the same gateway**, priced differently, model ids centralized — cheapest path to a real "quality" lever without a provider migration.
2. **True dimensions.** Confirm we want **real output sizing** (generate near the target ratio, then deterministically crop/pad to exact channel dimensions client-side via the existing `coverCrop`/editor-engine) rather than today's prose-hint approach. The plan assumes yes — it's the single biggest correctness fix.
3. **Reference images / img2img.** Confirm we want users to **upload a reference** (a photo to stylize, a brand asset, a rough sketch) as a generation input. The plan assumes yes, gated behind the brand-kit and article-art flows first.
4. **Visible AI labeling.** Confirm the posture: metadata always; **visible** "AI-generated" affordance on export by default, user-removable per asset with a logged acknowledgement. The plan assumes this default.
5. **Retire Video/Audio placeholders?** They're dead cards. The plan assumes **remove them from the Art Desk** and track "motion/audio" as a separate future line, so the surface stops advertising vaporware.

---

## 4. Phased roadmap

### Phase A — Re-skin & de-fake *(foundational; do first)*
The engine becomes editorial, and its faked capabilities become real.

- **Editorial style presets.** Replace the 8 sacred styles with a publication set: **Editorial Photo-Illustration, Documentary Realism, Flat Vector, Data/Explainer, Duotone Brand, Reportage Sketch, Archival/Print, Bold Typographic.** Remove sacred negatives ("Jesus face" etc.); keep the anti-slop global negative.
- **Single source of truth for styles.** Kill the server/client duplication: move presets to a shared JSON the edge function reads (or generate the server map from `src/lib/image-styles.ts` at build, mirroring the help-corpus pattern). Keep ids stable-but-renamed with a migration note.
- **Real dimensions.** Define exact pixel targets per channel (`src/lib/image-formats.ts` already has Instagram sizes — generalize to all channels). Generate at the nearest supported ratio, then deterministically crop/pad to the exact target using `coverCrop` before save. Store real `width`/`height`.
- **Copy sweep.** `EzraImageOffer` ("Verse art, sermon graphics" → "Article art, social cards"), `Create.tsx` title/blurbs, gallery empty states.
- **Schema cleanup** (§6): add a real `style_id`, `metadata jsonb`, `width`, `height`, `provenance` to `generations`; backfill `caption`-encoded styles.
- **Retire dead Video/Audio cards** (per §3.5).

*Exit:* an editorial user generates a correctly-sized social card in an editorial style, with no scripture framing, and the stored row has real dimensions and a real style id.

### Phase B — Brand Kit *(the consistency layer)*
- New **`brand_kits`** table: palette (hex list), type choices, logo asset, standing art-direction notes, default style id, per-section overrides.
- A Brand Kit editor in Settings/Art Desk: pick colors, upload a logo, write the house art-direction sentence ("muted, documentary, no stock-photo gloss").
- The edge function injects the active brand kit into every generation's art direction; the photo editor's default palette (`TEXT_COLORS`) and frames read from it.
- **Templates:** save a generation's full config (style + size + brand + text layout) as a reusable **template** so a section's headers stay identical week to week.

*Exit:* two images generated a week apart from the same template are visibly the same publication.

### Phase C — Article art from the draft *(the workflow connection)*
This is what makes it a *suite* and not a toy.

- **"Generate hero image" in the Write editor.** From a document, the Art Desk seeds the prompt from `headline`/`dek`/`section`/`story_tags` + the active brand kit, proposes 3 variations, and — consistent with the margin architecture (addendum feature 15) — drops the chosen image in as a document asset, never silently into the body.
- **Alt-text generation.** Every article image gets a model-generated alt-text draft (accessibility + SEO), editable, stored on the asset. This is table-stakes for a publication and currently absent.
- **Cascade integration** (omnibus Phase 5, feature 4): the cascade panel's social variants get their **visual** half here — one click renders the per-channel social cards for a finished piece, headline in real type, brand-locked.
- **Variations & seed control.** "More like this" and a locked seed for reproducibility — the single most-requested generation feature, currently missing.

*Exit:* an editor finishes a draft, clicks once, and gets a brand-consistent hero + alt-text + a set of social cards, all attributed to the document.

### Phase D — Editing round-trip & provenance *(finishing & integrity)*
- **Reference-image input** (§3.3): upload a photo/sketch/brand asset as a generation seed (img2img / style reference) through the gateway.
- **Regenerate-a-region** (light inpainting): select a region in the PhotoEditor and re-roll just that area, instead of the whole image. Builds on the existing canvas editor.
- **Upscale / print-res** export tier for the Archival/Print use case.
- **Content credentials.** Write AI-generation provenance into saved images — metadata now (a `provenance` field + embedded marker), C2PA-style content credentials as a fast-follow. Visible "AI-generated" chip on export per §3.4. This closes the loop with the platform's honesty positioning: the *manuscript* is provably human, the *art* is provably machine — both labeled truthfully.

*Exit:* an image can be seeded from a reference, spot-fixed without a full re-roll, exported at print resolution, and carries an honest AI-generation credential.

### Phase E — Batch & orchestration *(scale)*
- Tie the Art Desk into the **pipeline orchestrator** (omnibus feature 9): generate art for a batch of documents (a section's week of stories) from a template, into the review queue — never auto-published.
- The CarouselBuilder folds into this as the "multi-scene" template type rather than a separate surface.

---

## 5. Model & quality tier

Centralize model ids (today the string `google/gemini-2.5-flash-image-preview` is inline). Introduce:
- **Draft** — current fast preview model, low credits, for iteration.
- **Final** — the highest-fidelity image model the gateway offers, more credits, for the asset that actually ships.

One switch in the generate UI; the edge function maps tier → model id and → credit cost. This is the cheapest way to give "quality" meaning without a provider migration, and it makes the credit economics honest (a throwaway draft shouldn't cost the same as a print-res hero).

---

## 6. Data model

Additive; the `generations` table stays but sheds its hacks.

- **`generations`** — add `style_id text`, `width int`, `height int`, `aspect text`, `quality_tier text`, `provenance jsonb` (`{ai: true, model, seed, brand_kit_id, source_document_id}`), `alt_text text`, `metadata jsonb`. Migrate `caption`-encoded `style:<id>` into `style_id`, keep `caption` for user captions.
- **`brand_kits`** (new): `id, user_id, name, palette jsonb, type jsonb, logo_url, art_direction text, default_style_id, is_active bool`. RLS by `user_id`.
- **`art_templates`** (new): `id, user_id, name, config jsonb` (style + size + brand + text layout + tier). RLS by `user_id`.
- **Document link:** either a `source_document_id uuid` on `generations`, or reuse the `document_assets` table from omnibus Phase 5 with an `asset_type: "image:hero" | "image:social:<channel>"`. Prefer the latter so all derived assets — text and visual — live in one place.
- Storage bucket unchanged; keep per-user folder RLS.

All migrations follow the repo's timestamped pattern and RLS-by-`user_id` convention.

---

## 7. Guardrails, provenance & accessibility

- **Guardrails** already forbid deceptive news imagery (Phase 1). Extend the prefilter to catch prompts asking for **fabricated screenshots, forged documents, or photorealistic depictions of named real people** in a news context — the failure modes that actually threaten a publication's credibility.
- **Provenance is non-negotiable for a news product.** AI images must be labeled — metadata always, visible on export by default. This is the visual mirror of the text provenance ledger; shipping unlabeled AI news art would undercut the entire brand.
- **Alt-text** on every article image — accessibility and SEO both. Generated, editable, required before a hero image can be marked ready.

---

## 8. Credits & economics

`src/lib/credit-schedule.ts` already prices `image_generation: 10`. Split it:
- `image_draft` (cheap, high-frequency iteration),
- `image_final` (the print/ship render),
- `image_variation` (a "more like this" re-roll),
- `image_upscale`.

The internal cost ledger already records per-image provider cost; wire the tier's real gateway rate into `recordInternalCost` so the internal margin stays accurate per tier.

---

## 9. Risks & watch-items

- **Provenance vs. friction.** Visible AI labels must be tasteful and per-asset removable-with-acknowledgement, or users route around the tool. Default on, logged when removed.
- **"Real dimensions" ≠ model control.** The model still won't honor exact pixels; the fix is *generate-then-crop*, so composition guidance (keep subject in safe area) still matters. Don't promise pixel-perfect subject placement.
- **Reference-image abuse.** Uploaded references open a deepfake/impersonation vector — run the same person/deception guardrail on the reference-flow, not just text prompts.
- **Style-id migration.** Renaming preset ids breaks the `caption`-encoded history; migrate old ids → new (or keep a legacy alias map) so the File Cabinet doesn't lose badges.
- **Scope creep into video/audio.** Keep those out of this plan; removing the dead cards is the only video/audio work here.
- **Lovable round-trip.** Prefer additive, conventional changes; centralize model ids so a gateway/model swap is a one-line change.

---

## 10. Sequenced summary & first PR

| Phase | Outcome | Effort |
|---|---|---|
| **A. Re-skin & de-fake** | Editorial styles, real dimensions, single source of truth, schema cleanup, dead-card removal | M |
| **B. Brand Kit** | Palette/logo/art-direction applied by default; reusable templates | M |
| **C. Article art from draft** | One-click hero + alt-text + social cards, attributed to the document | M–L |
| **D. Editing & provenance** | Reference input, region re-roll, upscale, honest AI credentials | L |
| **E. Batch** | Art for a batch of stories via the pipeline orchestrator | M |

**Recommended first PR = Phase A**, and within it the two highest-leverage pieces: the **editorial style set** (identity) and **real generate-then-crop dimensions** (correctness). Both are self-contained, independently verifiable, and unblock everything visual downstream.

### Phase A file checklist
- `supabase/functions/generate-image/index.ts` — editorial styles, real crop-to-target, tier plumbing, style-id/width/height/provenance on insert.
- `src/lib/image-styles.ts` — editorial presets; become the single source (server reads a generated mirror).
- `src/lib/image-formats.ts` — generalize channel dimensions beyond Instagram.
- `src/components/ezra/EzraImageOffer.tsx` — editorial copy + labels.
- `src/pages/Create.tsx` — retitle "Art Desk", drop Video/Audio cards, wire tier switch.
- `src/components/cabinet/ImageGallery.tsx` — read `style_id` (not caption hack), show provenance chip.
- New migration — `generations` columns + backfill; `/app/generate`→`/app/studio` redirect in `src/App.tsx`.
- `src/lib/credit-schedule.ts` — split image event types.
- Run `npm run functions:check` + `npm test` before opening the PR.
