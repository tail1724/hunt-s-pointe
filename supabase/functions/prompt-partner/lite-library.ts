// Canned PressRoom Lite responses. Independent-publication editorial vertical.
// Each variant is markdown, suitable for streaming. Ends with a CTA to sign up.

export type Bucket =
  | "headline"
  | "seo_meta"
  | "newsletter"
  | "social_thread"
  | "news_brief"
  | "article_outline"
  | "interview"
  | "style_edit"
  | "fact_check"
  | "fallback";

export const BUCKETS: Bucket[] = [
  "headline", "seo_meta", "newsletter", "social_thread", "news_brief",
  "article_outline", "interview", "style_edit", "fact_check", "fallback",
];

export function nexusClosingPayload(bucket: Bucket) {
  return { type: "lite_closing", bucket };
}


export const LIBRARY: Record<Bucket, string[]> = {
  headline: [
`Here are five headline directions for your piece, each built on a different formula:

- **Direct journalistic:** City Council Approves Transit Overhaul After Six-Hour Session
- **Curiosity gap:** The Vote Nobody Expected Went Through at 2 A.M.
- **Data-driven:** A $340M Transit Plan, Explained in Four Numbers
- **Stakes-forward:** What the Transit Vote Means for Your Morning Commute
- **Quote-led:** "We Ran Out of Reasons to Say No": Inside the Transit Vote

Each formula pulls a different reader. Direct earns trust, curiosity earns clicks, data earns shares from the wonks.

> The full PressRoom headline sandbox generates channel-specific variants against your actual draft and scores them against your publication's own history. Sign up for a free account to open it.`,

`Five ways into the same story, five different front doors:

- **The workhorse:** New Report Finds Local Rents Rose 12% in One Year
- **The zoom-out:** The Rent Crisis Finally Has a Number Attached
- **The reader-first:** Your Rent Went Up. Here's Exactly Why.
- **The tension:** Landlords and Tenants Agree on One Thing: The Data Is Bad News
- **The series-starter:** Rent, Part One: How We Got to 12%

A strong hed does one job. Pick the job first — inform, intrigue, or arm the reader — then pick the line.

> Inside Hunt's Pointe, the headline sandbox tests formulas per distribution channel with your draft in view. Create a free account to try it on a real story.`,

`Here's a working set for your piece:

- **News hed:** School Board Ends Contract With Bus Operator After Safety Audit
- **Feature hed:** The 40-Page Audit That Ended a 20-Year Contract
- **Newsletter hed:** The bus contract is dead — here's the audit that killed it
- **Social hed:** A safety audit just ended a two-decade contract. The details are worse than the headline.
- **SEO hed:** Why [City] Schools Cancelled Their Bus Contract: Safety Audit Findings

Notice the register shifts by channel — same facts, different promise to the reader.

> PressRoom drafts these against your actual manuscript and keeps your house style locked. Sign up free to run it on your next story.`,
  ],

  seo_meta: [
`Here's a search-ready package for your article:

- **Title tag** (58 chars): Transit Overhaul Approved: What Changes and When
- **Meta description** (152 chars): The city council approved a $340M transit overhaul after a six-hour session. Here's what changes for riders, what it costs, and when it starts.
- **Slug:** /transit-overhaul-approved-changes
- **Primary keyphrase:** transit overhaul approved · **Secondary:** city council transit vote, transit plan changes

The title leads with the noun readers search; the description answers the three questions a searcher actually has.

> PressRoom generates the full cascade — SEO package, newsletter blurb, social thread — from your finished draft in one click. Sign up for a free account to run it.`,

`Your search package, ready to paste:

- **Title tag** (55 chars): Local Rents Up 12%: The Full Report, Explained
- **Meta description** (149 chars): A new housing report shows rents rose 12% in a year. We break down where increases hit hardest, what's driving them, and what renters can do.
- **Slug:** /rent-report-12-percent-explained
- **Keyphrases:** rent increase report · why is rent going up · [city] rent prices

Search copy is a promise: say exactly what the piece delivers and nothing it doesn't.

> Inside Hunt's Pointe every published piece can emit its own SEO, newsletter, and social variants — context-faithful to the reporting. Create a free account to see the cascade.`,
  ],

  newsletter: [
`Here's a newsletter treatment of your story:

**Subject line:** The 2 a.m. vote that changes your commute

**Body:**
Good morning. While you were asleep on Tuesday, the city council did something it has debated for eleven years: it passed the transit overhaul, 6–3, at 1:58 a.m.

The short version — three new rapid lines, a fare cap, and a construction schedule that starts sooner than anyone expected. The catch: the money assumes a federal grant that isn't signed yet.

We read all 212 pages of the plan so you don't have to. The full breakdown, including the map, is on the site.

**CTA:** Read the full story →

> PressRoom turns a finished article into its newsletter edition — subject line, summary, and hook — in one click, in your publication's voice. Sign up free to try it.`,

`A newsletter cut of your piece:

**Subject line:** We found the audit they didn't want published

**Body:**
Hi — quick one today, because the document speaks for itself.

Three months ago the school board quietly commissioned a safety audit of its bus operator. We obtained all 40 pages. The findings: missed inspections, falsified logs, and a driver-screening process one auditor called "ornamental."

The contract is now cancelled. The questions about who knew what — and when — are just starting.

**CTA:** Read the investigation →

> Inside Hunt's Pointe, the cascade panel drafts newsletter, social, and SEO variants from the primary piece while keeping every fact anchored to the original. Create a free account to run yours.`,
  ],

  social_thread: [
`Here's a condensed thread for social syndication:

**1/** The city just approved a $340M transit overhaul. It took eleven years, six hours of debate, and a vote at 2 a.m. Here's what actually changes. 🧵

**2/** Three new rapid lines. A $65 monthly fare cap. Construction starting in 18 months — not the 4 years in the original draft.

**3/** The catch: the budget assumes a federal grant that hasn't been signed. If it falls through, the fare cap is the first thing on the chopping block.

**4/** We read all 212 pages and mapped every route change. Full story, with the map: [link]

Each post carries one fact and one reason to keep reading. The thread ends where your site begins.

> PressRoom generates platform-specific threads from your finished reporting — context-faithful, house-voiced. Sign up for a free account to cascade your next piece.`,

`Your story as a thread:

**1/** A safety audit just ended a 20-year school bus contract. We obtained the full document. It's worse than the board let on. 🧵

**2/** Missed inspections: 47 in two years. The contract requires zero.

**3/** Driver screening described by the auditor as "ornamental." Two drivers flagged, both still on routes the following month.

**4/** The board cancelled the contract Tuesday — but the audit is dated in March. What happened in between is the story. Full investigation: [link]

> Inside Hunt's Pointe, one click turns the primary piece into its social, newsletter, and SEO variants. Create a free account to try the cascade.`,
  ],

  news_brief: [
`Here's your raw input as a standardized news brief:

**HED:** County Approves Emergency Road Repair Fund

**What happened:** The county commission voted 4–1 Tuesday to create a $12M emergency repair fund for storm-damaged roads, drawing from reserves rather than new bonds.

**Why it matters:** Crews can begin work within 30 days instead of waiting for the spring budget cycle — the difference between patching and rebuilding for at least three arterial roads.

**What's next:** A contractor list goes to the commission on the 14th. The dissenting vote wants an independent cost review first.

**Source:** County commission meeting, Tuesday; fund resolution 24-118.

Clean, standardized, ready for the queue.

> PressRoom's pipeline runs this template across entire batches — press releases, wire feeds, transcripts — and files every brief into your review queue. Sign up free to build your first pipeline.`,

`Your material, cut to brief:

**HED:** Regional Hospital System Reports First Surplus in Five Years

**What happened:** Meridian Health posted a $4.2M operating surplus for fiscal 2025, its first positive result since 2020, per financials released Monday.

**Why it matters:** The system had signaled possible closure of two rural clinics; the surplus takes that off the table for at least a year, per the CFO.

**What's next:** The board votes next month on whether to restore the night shift staffing cut in 2023.

**Source:** Meridian Health FY25 financial release; CFO remarks, Monday briefing.

> Batch a folder of releases through this exact template with PressRoom's pipeline orchestrator — every output lands in human review, nothing auto-publishes. Create a free account to run one.`,
  ],

  article_outline: [
`Here's a working structure for your piece:

## Suggested outline — investigation format

1. **Cold open (2–3 grafs):** The single most concrete scene or document detail. No throat-clearing.
2. **The nut graf:** What happened, why it matters, what this story adds that wasn't known.
3. **The evidence:** Walk the documents/data chronologically. One claim per section, one source per claim.
4. **The response:** Every named party gets their say. Note who declined.
5. **The stakes:** What changes if this is true; who is affected and how many.
6. **The open question:** What you couldn't confirm — named honestly. It's your follow-up story anyway.

**Structural note:** if your best material is in section 3, your lede is buried — promote the strongest document detail into the cold open.

> PressRoom's structure analysis reads your actual draft and flags buried ledes, missing context, and reorder opportunities — in the margin, never touching your prose. Sign up free to run it.`,

`A structure to build on:

## Suggested outline — explainer format

1. **The question the reader arrived with** — state it in their words, first sentence.
2. **The short answer** — three sentences max. Respect the skimmers; the divers keep reading.
3. **How we got here** — the minimum history that makes the present legible. Dates, not vibes.
4. **The mechanics** — how the thing actually works. This is where your reporting earns the piece.
5. **Who wins, who loses** — concrete, named, quantified where possible.
6. **What to watch** — the two or three events that will change the answer, with rough dates.

**Length guidance:** 1,200–1,600 words. Explainer readers churn past 1,800 unless the mechanics section is exceptional.

> Inside Hunt's Pointe, PressRoom proposes structure in the margins of your real manuscript — you keep the pen. Create a free account to try it.`,
  ],

  interview: [
`Here's an interview prep sheet for your subject:

## Prep sheet format

**Goal of the interview:** One sentence. Everything below serves it.

**The three must-get questions:**
1. The question only this person can answer.
2. The question their previous statements contradict — with the quote and date in front of you.
3. The question about what happens next.

**Background to verify on tape:** titles, dates, figures they've cited publicly.

**The pocket question:** The one you ask when they relax. Usually produces the best quote of the piece.

**Logistics block:** recording consent language, time budget, follow-up window.

> PressRoom can also batch-process finished interview transcripts into structured rough drafts through the pipeline — speaker-attributed, pull-quotes flagged. Sign up free to run a transcript.`,

`Your transcript, structured:

## Transcript → story skeleton

**Strongest quote (candidate pull-quote):** flag the sentence where the subject says something they've never said publicly — that's your lede candidate or your hed.

**Fact claims to verify:** every number, date, and name the subject asserted, listed with timestamps, ready for the fact-check pass.

**Narrative beats:** the 3–5 moments where the conversation turned — these become your section breaks.

**What they didn't answer:** questions asked twice and deflected twice. Note them; the deflection is often the story.

**Color:** setting, gesture, interruptions — the texture that makes it a story instead of a Q&A.

> PressRoom's pipeline ingests raw transcripts in batches and emits this skeleton for every one, straight into your review queue. Create a free account to try it.`,
  ],

  style_edit: [
`Here's how PressRoom approaches a line edit — in the margin, never in your text:

**What gets flagged:**
- **Passive constructions** hiding the actor: "mistakes were made" → who made them?
- **Banned-list hits** from your house style guide (every publication's list is different — yours gets ingested, not guessed).
- **Cadence flattening:** if an edit would make your sentence lengths suspiciously uniform, the *edit* gets flagged, not your prose.
- **AI-tell vocabulary** — the over-indexed words that make human prose read machine-made.

**What never happens:** no rewrite buttons, no wholesale replacement. Suggestions appear as margin notes with diffs; you type the change yourself. Your fingerprint stays on every sentence.

> Voice locks, cadence monitoring, and your actual house style guide live inside Hunt's Pointe. Sign up for a free account to protect your voice while you edit.`,

`A sample of PressRoom's margin-note style on a draft paragraph:

> *Original:* "The meeting, which was held on Tuesday, was attended by numerous stakeholders who expressed a variety of concerns."

**Margin notes it would leave:**
1. **Passive + vague:** who held it, who attended, what concerns? Three facts are hiding in this sentence.
2. **"Numerous stakeholders"** — house style lists this as a banned phrase; name them or count them.
3. **Cadence:** your surrounding grafs average 11 words a sentence; this one is 19 with two subordinate clauses. Flagged, not fixed — it may be deliberate.

The notes point; you rewrite. The prose stays yours.

> This is how the full editor works — suggestion-only margins, voice locks, and your style guide enforced in real time. Create a free account to edit a real draft.`,
  ],

  fact_check: [
`Here's how PressRoom's verification pass reads a draft:

**Claims extracted from your sample:**
1. *"Rents rose 12% in one year"* — flagged **verify**: needs the report name, date, and geography. A number without a denominator is a liability.
2. *"The largest increase in a decade"* — flagged **check archive**: your own publication reported 14% in 2019. Potential contradiction with earlier coverage.
3. *"Officials declined to comment"* — flagged **confirm**: which officials, contacted when, by what channel?

**Each claim gets:** a verdict (supported / contradicted / unverifiable), a confidence score, and the sources checked — inline, in the margin, before the piece hits your staging queue.

> The full verification pipeline runs asynchronously against your archive and grounded sources every time a draft moves to review. Sign up for a free account to protect your corrections column.`,

`A verification sample:

**Claim:** "The district has the highest per-student spending in the state."
- **Archive check:** your March piece reported it ranked third. ⚠ Contradiction — one of the two needs a correction or a date qualifier.

**Claim:** "$4.2M operating surplus."
- **Source check:** matches the FY25 release, page 3. ✓ Supported — citation attached.

**Claim:** "Experts say the trend will continue."
- **Flag:** which experts? Unattributed plural is a credibility leak. Needs a name or a cut.

Every draft that enters review gets this pass automatically; nothing publishes with an unresolved ⚠.

> PressRoom's fact pipeline cross-references your entire archive plus grounded sources, with confidence scores per claim. Create a free account to run it on a real draft.`,
  ],

  fallback: [
`It looks like you've ventured past the demo's edges. This preview environment routes prompts through a curated set of canned editorial examples — headline work, briefs, outlines, verification samples — to show the platform's speed and format without live API calls. Your request needs the real engine: full PressRoom handles original research, structural analysis of your actual drafts, house-style enforcement, and pipeline runs across whole batches of source material, all with the manuscript protected by suggestion-only margins.

> To put a real draft through live inference, sign up for your free Hunt's Pointe account today.`,

`I'm sorry, but that specific request isn't recognized by the demo's preset library. To keep this preview fast and unauthenticated, inputs route through cached editorial examples rather than live generation. Your prompt is exactly the kind of thing the full platform is built for — deep research with citations, margin-note editing that preserves your voice, fact verification against your own archive, and one-click cascades from a finished piece to every downstream format.

> Don't let the demo box you in. Create a free account to unlock live editorial inference.`,

`We don't have a pre-written response for that input in this sandbox. This lightweight preview simulates the interface with a library of cached responses; unique queries like yours need the live models. The full newsroom suite adapts to your publication's style guide, your archive, and your production pipeline — and it never overwrites a word you wrote.

> To get a real answer from the real engine, sign up for your free account today.`,
  ],
};
