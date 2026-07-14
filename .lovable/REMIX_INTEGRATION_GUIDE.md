# Remix Integration Guide

> **Purpose:** This document is the single source of truth for converting this template into a production-ready, vertical-specific SaaS. It has two parts:
>
> 1. **PART 1 — Founder Questionnaire** — *you* (the founder) fill this in before remixing.
> 2. **PART 2 — Agent Instructions** — the remix-agent reads this after you paste, and executes the steps referencing your answers by question ID (e.g. `{Q5}`).
>
> ### How to use
>
> 1. Copy this entire file.
> 2. Fill in every `> Answer:` block in PART 1. Leave `[OPTIONAL — skip]` lines blank if you want to defer.
> 3. Remix the template, then paste the entire filled file as your first message. The agent will execute PART 2 step-by-step.
>
> **Rules for the agent:** Never assume an answer. If a required answer (any non-`[OPTIONAL]` field) is blank, **STOP** and ask the founder before proceeding. Never invent marketing claims, ratings, customer names, or testimonials.

---

# PART 1 — FOUNDER QUESTIONNAIRE

## A. Product Identity

**Q1.** Product name (the brand consumers see). Example: `Resumely`.
> Answer:

**Q2.** One-line tagline (≤ 60 chars). Example: `Land interviews twice as fast.`
> Answer:

**Q3.** 150-char meta description (used in `<meta name="description">` and OG). Plain prose, no emojis.
> Answer:

**Q4.** Author / company legal name (used in `<meta name="author">` and JSON-LD Organization). Example: `Resumely, Inc.`
> Answer:

**Q5.** Primary `<html lang>` BCP-47 code. Example: `en`, `en-US`, `de`, `es-MX`.
> Answer:

**Q6.** Short product category (used in JSON-LD `applicationCategory`). Pick one: `BusinessApplication`, `DesignApplication`, `EducationalApplication`, `LifestyleApplication`, `ProductivityApplication`, `UtilitiesApplication`.
> Answer:

---

## B. Vertical & Artifact

**Q7.** What does the product help users *create*? One sentence. Example: `polished, ATS-optimized resumes tailored to a specific job description.`
> Answer:

**Q8.** Singular artifact noun (used throughout UI). Example: `resume`. (Used in `vertical.artifactNoun`.)
> Answer:

**Q9.** Plural artifact noun. Example: `resumes`.
> Answer:

**Q10.** Seed/idea input placeholder (shown on the Build workspace). Example: `Paste a job description or describe the role you're targeting…`
> Answer:

**Q11.** Domain blurb injected into AI system prompts (1 sentence). Example: `You help users craft clear, ATS-friendly resumes tailored to a specific role.`
> Answer:

**Q12.** Sidebar "Content" group labels. Provide 3 labels for the create / drafts / collections concepts in your vertical, or write `KEEP DEFAULT` to use `Create / Drafts / Collections`, or `HIDE` to remove the group.
> Answer (Create label):
> Answer (Drafts label):
> Answer (Collections label):

---

## C. Contact & Legal Entities

**Q13.** Contact email (general inbox).
> Answer:

**Q14.** Legal email.
> Answer:

**Q15.** Privacy email.
> Answer:

**Q16.** Careers email. `[OPTIONAL — defaults to Q13]`
> Answer:

**Q17.** Safety / abuse email. `[OPTIONAL — defaults to Q13]`
> Answer:

**Q18.** Company legal address (used in privacy policy + cookie banner). Full street address.
> Answer:

---

## D. Domain & URLs

**Q19.** Production URL (no trailing slash). Example: `https://resumely.com`. If none yet, write `NONE` — guide will keep relative URLs and skip sitemap base.
> Answer:

**Q20.** Lovable preview-only mode? Write `YES` if shipping only on `*.lovable.app` for now, `NO` if a custom domain is live.
> Answer:

**Q21.** Should the agent set `noindex` sitewide until launch? `YES` / `NO`.
> Answer:

**Q22.** Public-facing routes you want in the sitemap. Write `KEEP DEFAULT` for the existing list (/, /pricing, /use-cases, /customers, /integrations, /security, /changelog, /blog, /about, /contact, /help, /ai-safety, /privacy, /terms), or paste an explicit comma-separated list to override.
> Answer:

---

## E. Branding Visual System

**Q23.** Primary brand color (HSL, three numbers). Example: `24 95% 53%`.
> Answer:

**Q24.** Primary "glow" / accent variant (HSL). Example: `24 100% 65%`.
> Answer:

**Q25.** Anchor background color for dark mode (HSL). Example: `210 92% 15%`.
> Answer:

**Q26.** Foreground / body text color on dark background (HSL). Example: `0 0% 98%`.
> Answer:

**Q27.** Border radius preference. One of: `sharp` (2px), `default` (8px), `soft` (12px), `pill` (16px).
> Answer:

**Q28.** Internal name for this color theme preset (replaces "Kinetic Tangerine" in the theme system). Example: `Resumely Coral`.
> Answer:

---

## F. Marketing Copy — Hero & Trust

**Q29.** Hero H1 (≤ 70 chars). The single most important sentence on the site. Example: `Build a resume that gets you hired.`
> Answer:

**Q30.** Hero sub-headline (≤ 140 chars).
> Answer:

**Q31.** Trust-row stats shown above the chat in `LiteHero.tsx`. **MUST be true and defensible.** Use `NONE` per field to omit.
> Answer (Star rating + source, e.g. `4.9 on G2`):
> Answer (User count, e.g. `12,000+ creators` — only if real):
> Answer (Compliance/security badge, e.g. `SOC 2 ready` or `GDPR compliant` — only if real):

**Q32.** Auth dialog social-proof line (e.g. `Join 12,000+ creators`). Use `NONE` if no defensible number.
> Answer:

**Q33.** Final CTA band — primary headline. Example: `Ready to land your next interview?`
> Answer:

**Q34.** Final CTA band — sub-headline / button label.
> Answer (sub-headline):
> Answer (button label, e.g. `Start free`):

---

## G. Use Cases (G35)

**Q35.** Provide **5** use cases. Each is `{ title, blurb, 3 outcomes }`. Blurb ≤ 140 chars, outcomes are short bullet phrases.

```yaml
use_cases:
  - title: 
    blurb: 
    outcomes: [ , ,  ]
  - title: 
    blurb: 
    outcomes: [ , ,  ]
  - title: 
    blurb: 
    outcomes: [ , ,  ]
  - title: 
    blurb: 
    outcomes: [ , ,  ]
  - title: 
    blurb: 
    outcomes: [ , ,  ]
```

---

## H. FAQs (Q36)

**Q36.** Provide **10** FAQ pairs. Answers ≤ 300 chars each. The first should answer "What is {Q1}?".

```yaml
faqs:
  - q: What is {Q1}?
    a: 
  - q: 
    a: 
  - q: 
    a: 
  - q: 
    a: 
  - q: 
    a: 
  - q: 
    a: 
  - q: 
    a: 
  - q: 
    a: 
  - q: 
    a: 
  - q: 
    a: 
```

---

## I. Testimonials (Q37)

**Q37.** Provide **3** testimonials. **Must be real with consent**, or write `USE_PLACEHOLDER` to mark the section as a coming-soon placeholder (agent will hide the section instead of inventing quotes).

```yaml
testimonials:
  - quote: 
    author: 
    role: 
    company: 
  - quote: 
    author: 
    role: 
    company: 
  - quote: 
    author: 
    role: 
    company: 
```

---

## J. Stats Strip (Q38)

**Q38.** Provide **4** stats. **Must be true** — these appear in StatsStrip and are legally sensitive. Use `OMIT` per row to drop it.

```yaml
stats:
  - value: 
    label: 
    suffix: 
  - value: 
    label: 
    suffix: 
  - value: 
    label: 
    suffix: 
  - value: 
    label: 
    suffix: 
```

---

## K. Comparison Table (Q39)

**Q39.** Provide alternative competitor names + 8 feature rows. Each cell is `true`, `false`, or a short string like `"30 days"`.

```yaml
comparison:
  altA_name: 
  altB_name: 
  rows:
    - feature: 
      us: 
      altA: 
      altB: 
    - feature: 
      us: 
      altA: 
      altB: 
    - feature: 
      us: 
      altA: 
      altB: 
    - feature: 
      us: 
      altA: 
      altB: 
    - feature: 
      us: 
      altA: 
      altB: 
    - feature: 
      us: 
      altA: 
      altB: 
    - feature: 
      us: 
      altA: 
      altB: 
    - feature: 
      us: 
      altA: 
      altB: 
```

---

## L. Integrations (Q40)

**Q40.** Provide **12** integrations (real partner names you actually integrate with, or plan to within 90 days). Category one of: `Productivity`, `Storage`, `AI`, `Analytics`, `Comms`, `Custom`.

```yaml
integrations:
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
  - { name: , category: }
```

---

## M. Customer Case Studies (Q41)

**Q41.** Provide **6** customer case studies. **Must be real with consent**, or write `USE_PLACEHOLDER` at the top to hide the page until you have real ones.

```yaml
customers_mode:   # USE_PLACEHOLDER | REAL
customers:
  - slug: 
    name: 
    industry: 
    summary: 
    metrics: [ {value: , label: }, {value: , label: }, {value: , label: } ]
  - slug: 
    name: 
    industry: 
    summary: 
    metrics: [ {value: , label: }, {value: , label: }, {value: , label: } ]
  - slug: 
    name: 
    industry: 
    summary: 
    metrics: [ {value: , label: }, {value: , label: }, {value: , label: } ]
  - slug: 
    name: 
    industry: 
    summary: 
    metrics: [ {value: , label: }, {value: , label: }, {value: , label: } ]
  - slug: 
    name: 
    industry: 
    summary: 
    metrics: [ {value: , label: }, {value: , label: }, {value: , label: } ]
  - slug: 
    name: 
    industry: 
    summary: 
    metrics: [ {value: , label: }, {value: , label: }, {value: , label: } ]
```

---

## N. Changelog Seeds (Q42)

**Q42.** Provide **5** changelog entries (most recent first). Date in `Month D, YYYY` format. Item type: `Feature` | `Improvement` | `Fix`.

```yaml
changelog:
  - version: 
    date: 
    items:
      - { type: , text: }
      - { type: , text: }
  - version: 
    date: 
    items:
      - { type: , text: }
  - version: 
    date: 
    items:
      - { type: , text: }
  - version: 
    date: 
    items:
      - { type: , text: }
  - version: 
    date: 
    items:
      - { type: , text: }
```

---

## O. Blog Post Seeds (Q43)

**Q43.** Provide **3** seed blog posts. Body is markdown, ~3–4 short paragraphs.

```yaml
blog_posts:
  - slug: 
    title: 
    excerpt: 
    tag: 
    date: 
    body: |
      
  - slug: 
    title: 
    excerpt: 
    tag: 
    date: 
    body: |
      
  - slug: 
    title: 
    excerpt: 
    tag: 
    date: 
    body: |
      
```

---

## P. Lite Demo — Chips & Buckets

**Q44.** Six one-tap "starter prompt" chips for the unauth landing demo. Each is `{ label, bucket, prompt }`. `bucket` is the routing key matching Q47's 10 buckets.

```yaml
chips:
  - { label: , bucket: , prompt: }
  - { label: , bucket: , prompt: }
  - { label: , bucket: , prompt: }
  - { label: , bucket: , prompt: }
  - { label: , bucket: , prompt: }
  - { label: , bucket: , prompt: }
```

**Q45.** Should the unauth demo show a real model call or stay fully canned? Pick one:
- `CANNED_ONLY` (current default; safer, zero LLM cost)
- `REAL_MODEL` (founder accepts cost + abuse risk)
> Answer:

**Q46.** Lite badge label shown next to the demo. Default: `Sentient Lite`. Provide your own (or `Demo`).
> Answer:

---

## Q. Lite Demo — 30 Canned Responses (Q47)

**Q47.** Provide **10 buckets × 3 variants** = 30 short, high-quality canned responses for the unauth demo. Each response should be 80–200 words, demonstrate the product's value, and end with a soft hook toward signup. Bucket keys must match Q44's chip buckets + 4 more.

```yaml
buckets:
  - key: 
    keywords: [ , , ,  ]      # keyword triggers for the router
    variants:
      - |
        
      - |
        
      - |
        
  - key: 
    keywords: [ , , ,  ]
    variants:
      - |
        
      - |
        
      - |
        
  - key: 
    keywords: [ , , ,  ]
    variants:
      - |
        
      - |
        
      - |
        
  - key: 
    keywords: [ , , ,  ]
    variants:
      - |
        
      - |
        
      - |
        
  - key: 
    keywords: [ , , ,  ]
    variants:
      - |
        
      - |
        
      - |
        
  - key: 
    keywords: [ , , ,  ]
    variants:
      - |
        
      - |
        
      - |
        
  - key: 
    keywords: [ , , ,  ]
    variants:
      - |
        
      - |
        
      - |
        
  - key: 
    keywords: [ , , ,  ]
    variants:
      - |
        
      - |
        
      - |
        
  - key: 
    keywords: [ , , ,  ]
    variants:
      - |
        
      - |
        
      - |
        
  - key: fallback                       # required: catch-all bucket
    keywords: []
    variants:
      - |
        
      - |
        
      - |
        
```

---

## R. Auth & Access

**Q48.** Auth providers to enable. Pick all that apply: `email`, `google`, `apple`.
> Answer:

**Q49.** Auto-confirm signups (skip email verification)? `YES` / `NO`. **Default NO** for security.
> Answer:

**Q50.** Enable HIBP (leaked-password check)? `YES` / `NO`. **Default YES.**
> Answer:

**Q51.** Disable new signups (invite-only launch)? `YES` / `NO`. **Default NO.**
> Answer:

---

## S. Optional Phase B Toggles

All default to `SKIP`. Write `ENABLE` to turn on.

**Q52.** Stripe / Paddle payments? `SKIP` / `STRIPE` / `PADDLE`.
> Answer:

**Q53.** Custom email domain for transactional + auth emails? `SKIP` / `ENABLE`. If ENABLE, also fill Q53b.
> Answer:
> Answer (Q53b — sending domain, e.g. `mail.resumely.com`):

**Q54.** Analytics sink for `track.ts`? `SKIP` / `POSTHOG` / `MIXPANEL` / `PLAUSIBLE` / `UMAMI`.
> Answer:

**Q55.** Error monitoring? `SKIP` / `SENTRY`.
> Answer:

**Q56.** Newsletter capture? `SKIP` / `RESEND` / `MAILCHIMP` / `CONVERTKIT` / `BEEHIIV`.
> Answer:

**Q57.** Cookie banner jurisdiction copy. `NONE` / `GDPR` / `CCPA` / `BOTH`.
> Answer:

---

## T. Memory & Nomenclature Rename

**Q58.** Replace the codename `Sentient` (the AI persona) with what? Example: `Coach`, `Pilot`, `Mentor`. Use `KEEP` to leave as-is.
> Answer:

**Q59.** Replace the codename `Nexus` (the animated AI interface) with what? Example: `Pulse`, `Orb`, `Core`. Use `KEEP`.
> Answer:

**Q60.** Replace the unified mode name `Symbiote` with what? Example: `Flow`, `Sync`, `Live`. Use `KEEP`.
> Answer:

---

## U. Assets Checklist

**Q61.** Favicon. `WILL_UPLOAD` (you'll drop `public/favicon.ico` after remix) / `GENERATE` (agent uses imagegen) / `KEEP_DEFAULT`.
> Answer:

**Q62.** OG share image (1200×630). `WILL_UPLOAD` / `GENERATE` / `OMIT`.
> Answer:

**Q63.** Wordmark / logo (transparent PNG). `WILL_UPLOAD` / `GENERATE` / `OMIT`.
> Answer:

---

---

# PART 2 — AGENT INSTRUCTIONS

> **Read this only after the founder has pasted the filled questionnaire above.** Execute each step in order. Before starting any step, verify required inputs are non-blank; if blank and not marked `[OPTIONAL — skip]`, STOP and ask the founder. Batch independent file edits in parallel. After every destructive operation, run the verification block in Step 17.

## Conventions

- `{Q5}` = look up answer to question 5 in PART 1.
- Forbidden tokens (must return zero `rg` matches at end): `AppName`, `example.com`, `Lorem`, `lorem ipsum`, `REPLACE_WITH`, `Sentient` (unless Q58=KEEP), `Nexus` (unless Q59=KEEP), `Symbiote` (unless Q60=KEEP), `Kinetic Tangerine`, `Acme Corp`, `Nova Labs`, `Stellar Inc`, `Orbit Studios`, `Peak Digital`, `Horizon Co`.
- Never invent claims. If a stat/testimonial/customer field is blank or marked `USE_PLACEHOLDER`, **hide that section** rather than fabricate.

---

### Step 1 — Branding constants

**Inputs:** Q1, Q2, Q13, Q14, Q15, Q16, Q17.
**Outputs:** `src/lib/constants.ts`.

Replace the file end-to-end:

```ts
export const APP_NAME = "{Q1}";
export const APP_TAGLINE = "{Q2}";
export const CONTACT_EMAIL = "{Q13}";
export const LEGAL_EMAIL = "{Q14}";
export const PRIVACY_EMAIL = "{Q15}";
export const CAREERS_EMAIL = "{Q16 || Q13}";
export const SAFETY_EMAIL = "{Q17 || Q13}";
```

---

### Step 2 — Static head

**Inputs:** Q1, Q3, Q4, Q5, Q6, Q19, Q21.
**Outputs:** `index.html`.

- Set `<html lang="{Q5}">`.
- `<title>{Q1} — {Q2}</title>`.
- `<meta name="description" content="{Q3}">`.
- `<meta name="author" content="{Q4}">`.
- If `{Q19} != NONE`: set `<link rel="canonical" href="{Q19}/">` and `<meta property="og:url" content="{Q19}/">`. Else use `/`.
- If `{Q21} == YES`: add `<meta name="robots" content="noindex,nofollow">`.
- JSON-LD: update `name`, `description`, `applicationCategory` to `{Q6}`, add `"url": "{Q19}"` if not NONE.
- Add `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` (asset added in Step 11).

---

### Step 3 — Site URL plumbing

**Inputs:** Q19.
**Outputs:** `scripts/generate-sitemap.ts`, optionally `.env` reference (the agent cannot edit `.env` — instruct the founder if a build secret is required).

If `{Q19} != NONE`:
- Set `const BASE_URL = "{Q19}";` and remove the TODO.
- In `src/components/SEO.tsx`, prepend `{Q19}` to the canonical when `path` doesn't start with `http`.

Else leave both alone (relative URLs remain valid).

---

### Step 4 — robots.txt

**Inputs:** Q19, Q21.
**Outputs:** `public/robots.txt`.

- If `{Q21} == YES`: replace contents with `User-agent: *\nDisallow: /`.
- Else: keep existing allow rules. If `{Q19} != NONE`: append `Sitemap: {Q19}/sitemap.xml`.

---

### Step 5 — Vertical config

**Inputs:** Q7–Q12, Q35–Q43.
**Outputs:** `src/config/vertical.ts`.

Rewrite the exported `vertical` object using the YAML the founder provided. For each section:

- If founder wrote `USE_PLACEHOLDER` or omitted required rows, set the corresponding array to `[]` AND emit a console comment so PART 2 Step 8 hides the section.
- `artifactNoun`, `artifactNounPlural`, `seedPlaceholder`, `promptDomainBlurb` from Q8–Q11.
- `contentSidebar`: if `{Q12} == HIDE` → `[]`; if `KEEP DEFAULT` → keep existing; else override labels.

---

### Step 6 — Lite chips

**Inputs:** Q44, Q46.
**Outputs:** `src/components/lite/LitePromptChips.tsx`.

Replace the chip array with the 6 chips from Q44. Update the `lite_chip_tapped` analytics payload to use the new bucket keys.

---

### Step 7 — Lite canned library + badge

**Inputs:** Q45, Q46, Q47.
**Outputs:** `supabase/functions/prompt-partner/lite-library.ts`, `supabase/functions/prompt-partner/lite-router.ts`, `src/components/lite/LiteHero.tsx` (badge), `supabase/functions/prompt-partner/lite-stream.ts` (only if Q45=REAL_MODEL).

- Replace the 10 bucket × 3 variant array with Q47.
- Update router keyword tables from each bucket's `keywords:` list. Ensure `fallback` bucket exists.
- If `{Q45} == REAL_MODEL`: enable the model-fallback branch; else hard-gate to canned only.
- Replace the badge text "Sentient Lite" everywhere with `{Q46}`.

Deploy: call `supabase--deploy_edge_functions` with `["prompt-partner"]`.

---

### Step 8 — Marketing claims & hidden sections

**Inputs:** Q29–Q34, Q37 (if USE_PLACEHOLDER), Q38 (if OMIT), Q41 (if USE_PLACEHOLDER).
**Outputs:** `src/components/lite/LiteHero.tsx`, `src/components/landing/AuthDialog.tsx`, `src/pages/PromptCentralLite.tsx`, `src/components/landing/FinalCTABand.tsx`, `src/components/landing/Testimonials*.tsx`, `src/pages/Customers.tsx`, `src/components/landing/StatsStrip.tsx`.

- LiteHero trust row: render each item conditionally — omit if Q31 row = `NONE`.
- AuthDialog footer: render `{Q32}` or omit if `NONE`.
- FinalCTABand defaults: `{Q33}` headline + `{Q34}` sub & button.
- Hero copy: H1 = `{Q29}`, sub = `{Q30}`.
- If Q37 = USE_PLACEHOLDER: remove `<Testimonials/>` import + render from PromptCentralLite.tsx and Landing.tsx.
- If any Q38 row = OMIT: drop from StatsStrip; if all 4 omitted, hide the entire strip.
- If Q41.customers_mode = USE_PLACEHOLDER: replace `/customers` route component body with a "Case studies coming soon" placeholder.

---

### Step 9 — Auth configuration

**Inputs:** Q48–Q51.
**Outputs:** Supabase auth config (tool calls).

1. Call `supabase--configure_auth` with:
   - `disable_signup: {Q51 == YES}`
   - `external_anonymous_users_enabled: false`
   - `auto_confirm_email: {Q49 == YES}`
   - `password_hibp_enabled: {Q50 != NO}`
2. Call `supabase--configure_social_auth` with `providers: [<enabled from Q48 minus 'email'>]` and `disable_providers: [...]` for any not in Q48.
3. If `email` not in Q48: notify founder it must be manually disabled in the Cloud dashboard (tool can't disable email).

---

### Step 10 — Theme tokens

**Inputs:** Q23–Q28, Q60.
**Outputs:** `src/index.css`, `tailwind.config.ts`, `src/hooks/useColorTheme.ts`, `src/pages/Admin.tsx` (theme picker labels).

- In `:root` and `.dark` blocks of `index.css`: replace `--primary`, `--primary-glow`, `--background` (dark), `--foreground` (dark) with Q23–Q26 HSL values.
- Replace `--radius` per Q27 mapping (sharp=0.125rem, default=0.5rem, soft=0.75rem, pill=1rem).
- Rename theme preset `"Kinetic Tangerine"` → `{Q28}` everywhere in `useColorTheme.ts`, Admin picker, and any seed migration if present.

---

### Step 11 — Assets

**Inputs:** Q61, Q62, Q63.
**Outputs:** `public/favicon.ico`, `public/apple-touch-icon.png`, `public/og-default.jpg`, `public/logo.png`, `public/manifest.json`, `index.html` (link tags).

For each Qxx:
- `WILL_UPLOAD`: pause and prompt founder: "Please drop `<filename>` into `public/` and reply 'done'." Wait for confirmation before continuing.
- `GENERATE`: use `imagegen--generate_image` with brand colors (Q23) + product name (Q1).
- `OMIT` / `KEEP_DEFAULT`: skip.

After assets exist, create `public/manifest.json` with name=Q1, theme_color from Q23, icon refs; add `<link rel="manifest" href="/manifest.json">` to `index.html`.

If Q62 produced an og image, add `<meta property="og:image" content="{Q19}/og-default.jpg">` (absolute URL required by social crawlers).

---

### Step 12 — Nomenclature rename

**Inputs:** Q58, Q59, Q60.
**Outputs:** project-wide.

For each rename where the value != `KEEP`:
1. `rg -l "Sentient"` (or Nexus/Symbiote), enumerate files.
2. Replace token preserving casing (`Sentient`→`{Q58}`, `sentient`→lowercased, `SENTIENT`→uppercased). Apply to: component names, file names, route paths, comments, edge function paths, CSS class names, analytics event names.
3. For file/directory renames (e.g. `src/components/sentient/` → `src/components/{q58-lower}/`), update all imports.
4. Re-run `rg` to confirm zero matches outside intentional historical changelog entries.

**Caution:** Do NOT rename inside `supabase/migrations/` (history is immutable) — leave migration filenames alone but update any seed data via a new migration if user-visible.

---

### Step 13 — Memory file overrides

**Inputs:** Q1, Q7, Q8, Q23, Q28, Q58, Q59, Q60.
**Outputs:** all `mem://` files.

Rewrite each memory file replacing Sentient/Nexus/Symbiote/Kinetic Tangerine per the renames. Update `mem://index.md` Core block to reflect:
- New product name
- New artifact noun
- New brand palette name
- Vertical blurb (Q7)

Specifically rewrite the bodies of:
- `mem://project/boilerplate-intent` — change "boilerplate" framing to "{Q1} for {Q7-vertical}".
- `mem://style/theme-and-color-system` — new palette name + Q23–Q26 tokens.
- `mem://features/sentient-*` and `mem://features/voice-to-text-sentient` — rename and update.
- `mem://features/sentient-lite-canned` — update bucket count + Q46 badge.

---

### Step 14 — README

**Inputs:** Q1, Q3, Q19.
**Outputs:** `README.md`.

Replace `REPLACE_WITH_PROJECT_ID` and all template-isms. Title = `{Q1}`, description = `{Q3}`, links use `{Q19}` if available.

---

### Step 15 — Phase B (conditional)

Execute only branches where the corresponding Q != SKIP.

**Q52 — Payments:**
- Call `payments--recommend_payment_provider`. Then `payments--enable_stripe_payments` or `enable_paddle_payments` per Q52.
- After enable: instruct founder to create products/prices in the provider dashboard, paste IDs back, then wire `/pricing` page.

**Q53 — Email domain:**
- Show `<presentation-open-email-setup>` action and wait for completion.
- Call `email_domain--setup_email_infra`, then `email_domain--scaffold_auth_email_templates` (and `scaffold_transactional_email` if newsletter or transactional emails needed).
- Deploy `auth-email-hook` edge function.
- Brand templates with Q23 primary color and Q1 name.

**Q54 — Analytics sink:**
- Request secret via `secrets--add_secret` for the provider's project token.
- Update `src/lib/track.ts` to POST events to the provider's HTTP API (or load their snippet from `index.html`).

**Q55 — Sentry:**
- `bun add @sentry/react`.
- Request `SENTRY_DSN` secret. Init in `src/main.tsx`.

**Q56 — Newsletter:**
- Request ESP API key via `secrets--add_secret`.
- Create edge function `newsletter-subscribe` POSTing to ESP.
- Wire `src/components/landing/NewsletterSignup.tsx` to invoke the function.

**Q57 — Cookie banner:**
- Update `src/components/landing/CookieConsentBanner.tsx` copy + linked rights per jurisdiction; reference `{Q18}` legal address and `{Q15}` privacy email.

---

### Step 16 — SEO finalization

**Inputs:** Q5, Q19, Q22.
**Outputs:** `scripts/generate-sitemap.ts`, per-route `SEO` components, `src/main.tsx`.

- If Q22 != KEEP DEFAULT: replace entries list with founder's routes.
- Ensure `<HelmetProvider>` wraps `<App/>` in `main.tsx` (it should already; verify).
- Verify each public page (`Pricing`, `UseCases`, `Customers`, `Integrations`, `Security`, `Changelog`, `Blog`, `About`, `Contact`, `Help`, `Privacy`, `Terms`) passes a unique `title` + `description` to `<SEO>`.
- Add `<html lang>` updates per-route via Helmet if `{Q5}` includes region variants.
- Trigger sitemap regen by running `bun run predev` (or just rely on next `vite dev`).

---

### Step 17 — Verification

Run these `rg` checks and ensure zero matches (excluding `supabase/migrations/` history, `node_modules`, and `.lovable/REMIX_INTEGRATION_GUIDE.md` itself):

```bash
rg -n "AppName|REPLACE_WITH|lorem ipsum|Lorem ipsum|example\.com" --glob '!supabase/migrations/**' --glob '!.lovable/**' --glob '!node_modules/**'
rg -n "Acme Corp|Nova Labs|Stellar Inc|Orbit Studios|Peak Digital|Horizon Co" --glob '!supabase/migrations/**' --glob '!.lovable/**'
rg -n "Kinetic Tangerine" --glob '!supabase/migrations/**' --glob '!.lovable/**'
# rename checks (only if Q58/Q59/Q60 != KEEP)
rg -ni "sentient|nexus|symbiote" --glob '!supabase/migrations/**' --glob '!.lovable/**' --glob '!CHANGELOG.md'
```

Also verify:
- Build passes (harness runs automatically).
- `/` renders without console errors.
- `/prompt-central-lite` chat sends → canned response returns → 2-turn gate → AuthDialog opens.
- `<title>` on `/`, `/pricing`, `/about` is unique.
- View-source on `/` shows correct `<meta>` tags (not Helmet-only).

---

### Step 18 — Final notes to founder

After Step 17 passes, send the founder a summary that includes:

1. **What was shipped:** branding, vertical content, lite demo, auth, theme, assets, renames.
2. **What was deferred** (any Q5x = SKIP): list with one-line "to enable later, ask: 'enable Stripe / email domain / analytics / sentry / newsletter'".
3. **Secrets still pending:** list any `secrets--add_secret` calls that the founder hasn't completed.
4. **Manual follow-ups:**
   - DNS verification for custom email domain (if Q53).
   - Stripe product creation (if Q52).
   - Real testimonials/customers (if Q37/Q41 = USE_PLACEHOLDER).
   - `og-default.jpg` upload (if Q62 = WILL_UPLOAD and skipped).
5. **Publish:** show `<presentation-open-publish>Publish your app</presentation-open-publish>`.

---

## End of guide

If you (the agent) hit any contradiction, missing answer, or an instruction that conflicts with the current codebase reality, STOP and ask the founder. Never invent.
