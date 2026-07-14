/**
 * Vertical Config Layer
 * ---------------------
 * Single source of truth for per-remix branding, taxonomy, and landing copy.
 * This remix is "Hunt's Pointe" — a production home for independent digital
 * publications, led by PressRoom, its AI editorial co-pilot, with fact
 * verification, house-style enforcement, and CMS-ready output as the core
 * capabilities, and a suggestion-only margin architecture protecting the
 * editor's own voice as the non-negotiable design constraint.
 *
 * Rules:
 * - Never hardcode domain-specific copy in components — read from here.
 * - Keep this file dependency-free (no React, no DB) so it can be imported
 *   from edge functions, scripts, and the client alike.
 */

import {
  APP_NAME,
  APP_TAGLINE,
  CONTACT_EMAIL,
  LEGAL_EMAIL,
  PRIVACY_EMAIL,
  CAREERS_EMAIL,
  SAFETY_EMAIL,
} from "@/lib/constants";

export type ContentItemKey = "create";

export interface VerticalSidebarItem {
  key: ContentItemKey;
  title: string;
  url: string;
  /** lucide-react icon name */
  icon: string;
}

export interface UseCaseEntry {
  key: string;
  title: string;
  blurb: string;
  outcomes: string[];
}

export interface FAQEntry {
  q: string;
  a: string;
}

export interface TestimonialEntry {
  quote: string;
  author: string;
  role: string;
  company: string;
}

export interface StatEntry {
  value: string;
  label: string;
  suffix?: string;
}

export interface CitedSource {
  label: string;
  url: string;
}

export interface ComparisonRow {
  feature: string;
  us: boolean | string;
  altA: boolean | string;
  altB: boolean | string;
}

export interface CustomerEntry {
  slug: string;
  name: string;
  industry: string;
  summary: string;
  metrics: { value: string; label: string }[];
}

export interface ChangelogEntry {
  version: string;
  date: string;
  items: { type: "Feature" | "Improvement" | "Fix"; text: string }[];
}

export interface BlogPostEntry {
  slug: string;
  title: string;
  excerpt: string;
  tag: string;
  date: string;
  body: string;
}

export interface VerticalConfig {
  /** Branding */
  name: string;
  tagline: string;
  /** Short noun for a single generated artifact ("resume", "sermon", "post"). */
  artifactNoun: string;
  /** Plural form of artifactNoun. */
  artifactNounPlural: string;

  /** Contact channels */
  emails: {
    contact: string;
    legal: string;
    privacy: string;
    careers: string;
    safety: string;
  };

  /**
   * Sidebar "Content" section.
   * One use case per remix — relabel/rewire per vertical.
   * Set to [] to hide the Content group entirely.
   */
  contentSidebar: VerticalSidebarItem[];

  /** Seed/idea input placeholder shown on the Build Prompts workspace. */
  seedPlaceholder: string;

  /**
   * Domain summary injected into edge-function system prompts.
   * Keep concise — one sentence describing what the user is writing.
   */
  promptDomainBlurb: string;

  /** Landing copy — all swappable per remix */
  useCases: UseCaseEntry[];
  faqs: FAQEntry[];
  testimonials: TestimonialEntry[];
  stats: StatEntry[];
  /** Sourced, external stats framing why the problem matters — not product specs. */
  problemStats: StatEntry[];
  problemStatsSources: CitedSource[];
  comparison: {
    altA: string;
    altB: string;
    rows: ComparisonRow[];
  };
  customers: CustomerEntry[];
  changelog: ChangelogEntry[];
  blogPosts: BlogPostEntry[];
}

/**
 * Hunt's Pointe — the AI editorial co-pilot for independent publishers.
 * PressRoom-led editorial tool for Editors-in-Chief, freelance journalists,
 * newsletter writers, and independent newsrooms. The manuscript stays
 * suggestion-only; the pipeline (verification, style, CMS export, cascades)
 * is where the AI does its heaviest lifting.
 */
export const vertical: VerticalConfig = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  artifactNoun: "story",
  artifactNounPlural: "stories",

  emails: {
    contact: CONTACT_EMAIL,
    legal: LEGAL_EMAIL,
    privacy: PRIVACY_EMAIL,
    careers: CAREERS_EMAIL,
    safety: SAFETY_EMAIL,
  },

  contentSidebar: [
    { key: "create", title: "Write", url: "/app/create", icon: "PenTool" },
  ],

  seedPlaceholder: "Type a headline, a beat, or a story idea…",

  promptDomainBlurb:
    "You are PressRoom, an editorial research partner for an independent publication. Help the editor think through their story — surface relevant sources, background, and archive context. You do not write the piece for the user; you accelerate their reporting. Cite every factual claim inline as [#N] against a supplied source, and clearly mark anything that is general background versus a verifiable claim.",

  useCases: [
    {
      key: "editors-in-chief",
      title: "Editors-in-Chief",
      blurb:
        "Run a fast-moving newsroom without an enterprise CMS budget — fact verification, house-style enforcement, and a production pipeline that respects your review queue.",
      outcomes: ["Verified before staging", "House style enforced", "CMS-ready output"],
    },
    {
      key: "freelance-journalists",
      title: "Freelance Journalists",
      blurb:
        "Research a story, structure the reporting, and cascade one finished piece into every pitch-ready format — without a newsroom's tooling behind you.",
      outcomes: ["Sourced research", "Structure feedback", "One piece, every format"],
    },
    {
      key: "newsletter-writers",
      title: "Newsletter Writers",
      blurb:
        "Keep the raw, personal voice your subscribers pay for while PressRoom manages the pipeline — drafts, fact-checks, and formats the edition around it.",
      outcomes: ["Your voice, protected", "Faster editions", "Provenance you can show"],
    },
    {
      key: "niche-publications",
      title: "Niche & Trade Publications",
      blurb:
        "Enforce a house style across staff and freelance contributors, interlink years of archive coverage, and localize for every regional sub-edition.",
      outcomes: ["Consistent voice at scale", "Archive-aware editing", "Regional variants"],
    },
  ],

  faqs: [
    {
      q: "Does PressRoom write my story for me?",
      a: "No. PressRoom is a research and pipeline partner, not a ghostwriter. In the editor, it can only propose changes in the margin — never overwrite your manuscript. It organizes sourcing, verifies claims, drafts scaffolding, and manages the production pipeline, but the piece is yours to write in your own words. That's the point.",
    },
    {
      q: "How is this different from ChatGPT or a generic CMS?",
      a: "Unlike ChatGPT, PressRoom never edits your draft in place — every suggestion is a margin annotation you integrate by hand, and it tracks a provenance certificate proving the manuscript was organically composed. Unlike a generic CMS, it verifies facts against your own archive before staging, enforces your house style automatically, and cascades one piece into every downstream format in one click.",
    },
    {
      q: "Will this make my writing sound like AI wrote it?",
      a: "That's the risk we designed against. A cadence dial flags edits that would flatten your natural sentence rhythm, an AI-tell filter highlights over-indexed machine vocabulary before it ships, and Voice Locks protect your idiosyncratic style markers — em dashes, fragments, the quirks that are unmistakably yours — from ever being \"corrected\" away.",
    },
    {
      q: "Where does my data go?",
      a: "Your drafts and documents live in our managed Postgres database with row-level security. AI requests are routed through the Lovable AI Gateway to Google Gemini and OpenAI. We do not currently have zero-retention agreements with upstream providers — please do not paste embargoed material or unpublished source-protection details you can't afford to expose.",
    },
    {
      q: "What exactly does the provenance ledger track?",
      a: "Aggregate session telemetry only — session duration, typing-cadence histograms, and edit-burst timing — never keystroke content. It's sealed into a hash-chained certificate you can attach to a CMS export as proof the manuscript was composed over time by a human, not generated in a single batch. You can opt out entirely; it's documented in our Terms.",
    },
    {
      q: "How much does it cost?",
      a: "There's a free forever tier with no credit card. Pro is $24/month for unlimited Projects and priority support. Newsroom plans for multi-contributor teams are custom — reach out and we'll size it to your masthead.",
    },
    {
      q: "Why does this matter right now for independent publishers?",
      a: "The U.S. has lost roughly a third of its newspapers since 2005, and public trust in mass media sits near historic lows — leaving independent digital outlets to do more reporting with fewer resources and less institutional trust to draw on. Every hour spent on manual fact-checking, style enforcement, or reformatting one story for five channels is an hour not spent reporting. PressRoom exists to give that hour back, without asking you to trade away the credibility or the voice that earned your readers in the first place.",
    },
  ],

  testimonials: [
    {
      quote:
        "I still write every word of my own copy. PressRoom gets me a verified, sourced draft in the margin in twenty minutes — that's the hours I used to spend chasing citations by hand.",
      author: "Dana Whitfield",
      role: "Editor-in-Chief",
      company: "The Ledgerline",
    },
    {
      quote:
        "I run a two-person newsroom. A CMS with real fact-checking and house-style enforcement wasn't in the budget until this — and it never once rewrote a sentence for me.",
      author: "Marcus Idowu",
      role: "Founder & Editor",
      company: "Meridian Dispatch",
    },
    {
      quote:
        "What I like is that it cites everything and tells me plainly when it can't verify a claim. That's the difference between a research tool and a liability.",
      author: "Priya Nagarajan",
      role: "Managing Editor",
      company: "Fieldnotes Quarterly",
    },
  ],

  stats: [
    { value: "0", label: "Words PressRoom writes into your manuscript", suffix: "Margin-only, by design" },
    { value: "30", label: "Day free trial", suffix: "Two full production cycles" },
    { value: "100%", label: "Claims cited before staging", suffix: "No anonymous facts" },
  ],

  problemStats: [
    { value: "~33%", label: "Of U.S. newspapers have closed since 2005", suffix: "Northwestern Medill, State of Local News" },
    { value: "200+", label: "U.S. counties with no local news source", suffix: "\"News deserts,\" Medill" },
    { value: "~32%", label: "Of Americans trust mass media a great deal / fair amount", suffix: "Gallup, near a historic low" },
  ],
  problemStatsSources: [
    {
      label: "Northwestern Medill, State of Local News Project",
      url: "https://localnewsinitiative.northwestern.edu/",
    },
    {
      label: "Gallup, Media Trust Poll",
      url: "https://news.gallup.com/",
    },
  ],

  comparison: {
    altA: "ChatGPT",
    altB: "Generic CMS + Google Docs",
    rows: [
      { feature: "Manuscript stays human-only (margin suggestions, never overwrites)", us: true, altA: false, altB: "N/A" },
      { feature: "Verifies claims against your own archive before staging", us: true, altA: false, altB: false },
      { feature: "Enforces your house style automatically", us: true, altA: "Partial", altB: false },
      { feature: "Cascades one piece into every downstream format", us: true, altA: "Partial", altB: false },
      { feature: "Cadence + AI-tell monitoring to protect your voice", us: true, altA: false, altB: "N/A" },
      { feature: "Structured, CMS-mapped output (JSON / front-matter)", us: true, altA: false, altB: "Partial" },
      { feature: "Honest about model retention", us: true, altA: false, altB: "N/A" },
      { feature: "Under $50/month", us: true, altA: true, altB: false },
    ],
  },

  // USE_PLACEHOLDER — keep existing placeholder cards until real case studies arrive.
  customers: [
    {
      slug: "the-ledgerline",
      name: "The Ledgerline",
      industry: "Independent local news",
      summary:
        "The Ledgerline runs city-hall coverage across two counties with a three-person editorial staff, using PressRoom's verification pass to hold itself to a wire-service correction rate.",
      metrics: [
        { value: "3", label: "Editorial staff" },
        { value: "0.4%", label: "Correction rate" },
        { value: "2x", label: "Stories filed / week" },
      ],
    },
    {
      slug: "meridian-dispatch",
      name: "Meridian Dispatch",
      industry: "Regional digital outlet",
      summary:
        "Meridian Dispatch moved its entire production pipeline — press releases, wire feeds, and reader tips — through PressRoom's bulk orchestrator into a single review queue.",
      metrics: [
        { value: "60%", label: "Faster brief production" },
        { value: "140+", label: "Briefs filed / month" },
        { value: "0", label: "Auto-published items" },
      ],
    },
    {
      slug: "fieldnotes-quarterly",
      name: "Fieldnotes Quarterly",
      industry: "Trade & niche publication",
      summary:
        "Fieldnotes Quarterly enforces one consistent house voice across a roster of 20+ freelance contributors using PressRoom's style guardrails.",
      metrics: [
        { value: "20+", label: "Freelance contributors" },
        { value: "1", label: "Consistent house voice" },
        { value: "98%", label: "First-pass style compliance" },
      ],
    },
    {
      slug: "harborlight-newsletter",
      name: "Harborlight",
      industry: "Independent newsletter",
      summary:
        "A solo newsletter writer kept full authorship of every edition while PressRoom handled fact-checking and the newsletter cascade from each feature story.",
      metrics: [
        { value: "1", label: "Author, every word" },
        { value: "4x", label: "Faster edition turnaround" },
        { value: "0", label: "AI-detector false flags" },
      ],
    },
    {
      slug: "campus-wire-collective",
      name: "Campus Wire Collective",
      industry: "Student journalism network",
      summary:
        "A student journalism network used PressRoom to ship a shared style guide and verification pipeline across twelve campus papers in a single semester.",
      metrics: [
        { value: "12", label: "Campus papers onboarded" },
        { value: "1 semester", label: "From pilot to network-wide" },
        { value: "3x", label: "Corrections avoided" },
      ],
    },
    {
      slug: "summerline-syndicate",
      name: "Summerline Syndicate",
      industry: "Regional wire syndicate",
      summary:
        "A regional syndicate standardized incoming stringer copy into publication-ready briefs partner outlets now run every week.",
      metrics: [
        { value: "85", label: "Partner outlets" },
        { value: "Weekly", label: "Standardized brief cadence" },
        { value: "2x", label: "Stringer output YoY" },
      ],
    },
  ],

  changelog: [
    {
      version: "1.0",
      date: "June 1, 2026",
      items: [{ type: "Feature", text: "Mobile implementation." }],
    },
    {
      version: "0.1.2",
      date: "May 2, 2026",
      items: [{ type: "Feature", text: "Significant improvements, AI capabilities." }],
    },
    {
      version: "0.1.1",
      date: "April 1, 2026",
      items: [{ type: "Feature", text: "Enhanced features and general improvements." }],
    },
    {
      version: "0.1",
      date: "March 1, 2026",
      items: [{ type: "Feature", text: "Initial MVP." }],
    },
  ],

  // Hidden until seed posts are written.
  blogPosts: [],
};
