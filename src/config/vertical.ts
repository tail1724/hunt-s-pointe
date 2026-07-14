/**
 * Vertical Config Layer
 * ---------------------
 * Single source of truth for per-remix branding, taxonomy, and landing copy.
 * This remix retargets the boilerplate as "Ezra Research — Biblical AI", led by the
 * Vacation Bible School use case with sermons, Bible studies, kids' Sunday
 * school, and small-group guides as the next tier.
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
 * Ezra Research — Biblical AI.
 * VBS-led religious prose tool for pastors, ministers, VBS leaders, and
 * independent students. Tradition and translation are selected per project.
 */
export const vertical: VerticalConfig = {
  name: APP_NAME,
  tagline: APP_TAGLINE,
  artifactNoun: "work",
  artifactNounPlural: "works",

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

  seedPlaceholder: "Type a theme, scripture, or VBS day idea…",

  promptDomainBlurb:
    "You are Ezra, a theological research partner. Help the user think through their text — surface relevant passages, cross-references, and historical context. You do not write sermons for the user; you accelerate their study. Cite every Scripture quote as (Book Ch:Vv, KJV) and clearly mark anything that is general background versus a verifiable claim.",

  useCases: [
    {
      key: "church-planters",
      title: "Church Planters",
      blurb:
        "For pastors building a new congregation without the budget for a $3,000 Logos library — get serious theological depth without the learning curve.",
      outcomes: ["Faster sermon prep", "Cited cross-references", "Built on a budget"],
    },
    {
      key: "sermons",
      title: "Sermon Research",
      blurb:
        "Outline your exegesis, gather commentaries, organize cross-references — you still write the sermon. Ezra clears the runway.",
      outcomes: ["Outline in minutes", "Cited every claim", "Your voice, your words"],
    },
    {
      key: "bible-study",
      title: "Bible Study Prep",
      blurb:
        "Develop a small-group study plan grounded in the passage and your tradition, with discussion questions and source citations.",
      outcomes: ["Structured lessons", "Discussion-ready", "Tradition-aware"],
    },
    {
      key: "students",
      title: "Seminary & Self-Study",
      blurb:
        "Ask a hard theological question and get a researched answer with the verses and historical context to back it up.",
      outcomes: ["Cited answers", "Cross-references", "Historical framing"],
    },
  ],

  faqs: [
    {
      q: "Does Ezra write my sermon for me?",
      a: "No. Ezra is a research partner, not a sermon generator. It organizes passages, surfaces commentaries, drafts outlines, and clears the path — but the sermon is yours to preach in your own words. That's the point.",
    },
    {
      q: "How is this different from ChatGPT, Logos, or Blue Letter Bible?",
      a: "Unlike ChatGPT, Ezra is bounded by orthodox theology and cites every Scripture quote. Unlike Blue Letter Bible, Ezra actively synthesizes commentaries instead of just showing them. Unlike Logos, you don't need a Master's degree or a $3,000 library to get useful depth.",
    },
    {
      q: "Which Bible translations are available?",
      a: "Today: public-domain translations — KJV, ASV, WEB, YLT, and BBE. Licensed translations (NIV, ESV, NASB, NLT) are on the roadmap pending formal licensing with Crossway, Biblica, and Lockman.",
    },
    {
      q: "Where does my data go?",
      a: "Your prompts and documents live in our managed Postgres database with row-level security. AI requests are routed through the Lovable AI Gateway to Google Gemini and OpenAI. We do not currently have zero-retention agreements with upstream providers — please do not paste confidential pastoral counseling notes.",
    },
    {
      q: "Is it godly to use AI for theological work?",
      a: "We think so — same Scripture, different tool. Concordances, study Bibles, and Logos started as the same kind of question. The discernment, the prayer, and the preaching are still yours.",
    },
    {
      q: "How much does it cost?",
      a: "There's a free forever tier with no credit card. Pro is $24/month for unlimited Collections and priority support. Church plans for multi-staff teams are custom — reach out and we'll size it to you.",
    },
    {
      q: "Why does AI-assisted study matter right now?",
      a: "Weekly worship attendance has fallen to about 30% of U.S. adults, down from 42% two decades ago (Gallup, 2026), while 90% of pastors report being frequently fatigued or worn out (Pastoral Care, Inc. / Schaeffer Institute survey of 1,050 pastors). Fewer people in the pews and more strain on the person in the pulpit means every hour spent hunting through commentaries is an hour not spent on people. Ezra exists to give that hour back.",
    },
  ],

  testimonials: [
    {
      quote:
        "I still write my own sermons. Ezra gets me to a working outline with cited cross-references in twenty minutes — that's the hours I used to spend hunting through tabs.",
      author: "Pastor David Cho",
      role: "Associate Pastor",
      company: "Hillside Fellowship",
    },
    {
      quote:
        "I planted my church last year and a Logos library wasn't in the budget. Ezra gives me depth I couldn't otherwise afford, without pretending to be smarter than I am.",
      author: "Rachel Bennett",
      role: "Lead Pastor",
      company: "Grace Community Church",
    },
    {
      quote:
        "What I like is that it cites everything. If it can't verify a claim, it tells me so. That's the difference between a research tool and a guess machine.",
      author: "Monica Alvarez",
      role: "Teaching Pastor",
      company: "Riverbend Bible Church",
    },
  ],

  stats: [
    { value: "5", label: "Public-domain translations", suffix: "Available today" },
    { value: "30", label: "Day free trial", suffix: "Two sermon cycles" },
    { value: "100%", label: "Citations on every answer", suffix: "No anonymous claims" },
  ],

  problemStats: [
    { value: "30%", label: "Weekly worship attendance today", suffix: "Down from 42% two decades ago" },
    { value: "90%", label: "Of pastors are frequently fatigued or worn out", suffix: "1,050 pastors surveyed" },
    { value: "1,500+", label: "Pastors leave the ministry every month", suffix: "Schaeffer Institute of Leadership Development" },
  ],
  problemStatsSources: [
    {
      label: "Gallup, \"Church Attendance Has Declined in Most U.S. Religious Groups\" (2026)",
      url: "https://news.gallup.com/poll/642548/church-attendance-declined-religious-groups.aspx",
    },
    {
      label: "Pastoral Care, Inc., Statistics for Pastors — Schaeffer Institute survey of 1,050 pastors",
      url: "https://www.pastoralcareinc.com/statistics/",
    },
  ],

  comparison: {
    altA: "ChatGPT",
    altB: "Logos / Blue Letter Bible",
    rows: [
      { feature: "Bounded by orthodox theology", us: true, altA: false, altB: true },
      { feature: "Cites every Scripture quote", us: true, altA: false, altB: true },
      { feature: "Synthesizes commentaries (not just shows them)", us: true, altA: "Partial", altB: false },
      { feature: "Usable without a Master's degree", us: true, altA: true, altB: false },
      { feature: "Grounds answers in YOUR uploaded library", us: true, altA: false, altB: false },
      { feature: "Word-processor for sermon drafting", us: true, altA: false, altB: false },
      { feature: "Honest about model retention", us: true, altA: false, altB: "N/A" },
      { feature: "Under $50/month", us: true, altA: true, altB: false },
    ],
  },

  // USE_PLACEHOLDER — keep existing placeholder cards until real case studies arrive.
  customers: [
    {
      slug: "grace-community",
      name: "Grace Community Church",
      industry: "Multi-site church",
      summary:
        "Grace Community planned three campuses of VBS from a single shared workspace and handed volunteers ready-to-teach daily kits.",
      metrics: [
        { value: "3", label: "Campuses coordinated" },
        { value: "120h", label: "Volunteer hours saved" },
        { value: "5★", label: "Volunteer feedback" },
      ],
    },
    {
      slug: "hillside-fellowship",
      name: "Hillside Fellowship",
      industry: "Local church",
      summary:
        "Hillside's preaching team uses Ezra Research to move from passage to working outline before Tuesday morning planning.",
      metrics: [
        { value: "60%", label: "Faster sermon drafting" },
        { value: "52", label: "Outlines per year" },
        { value: "0", label: "Missed weeks" },
      ],
    },
    {
      slug: "riverbend-bible",
      name: "Riverbend Bible Church",
      industry: "Small group ministry",
      summary:
        "Riverbend equipped lay leaders with consistent, biblically-grounded discussion guides for 40+ weekly groups.",
      metrics: [
        { value: "40+", label: "Weekly groups supported" },
        { value: "2x", label: "Discussion depth scores" },
        { value: "98%", label: "Leader retention" },
      ],
    },
    {
      slug: "lighthouse-kids",
      name: "Lighthouse Kids",
      industry: "Children's ministry",
      summary:
        "Lighthouse standardized age-graded Sunday school lessons across preschool, elementary, and pre-teen rooms.",
      metrics: [
        { value: "3", label: "Age tracks aligned" },
        { value: "200", label: "Take-home cards / month" },
        { value: "35%", label: "Parent engagement lift" },
      ],
    },
    {
      slug: "campus-collective",
      name: "Campus Collective",
      industry: "Campus ministry",
      summary:
        "A campus ministry network used Ezra Research to ship study guides for fall semester across twelve schools in a single week.",
      metrics: [
        { value: "12", label: "Campuses launched" },
        { value: "1 week", label: "From idea to ship" },
        { value: "4x", label: "Student attendance" },
      ],
    },
    {
      slug: "summer-light-vbs",
      name: "Summer Light VBS Network",
      industry: "Para-church",
      summary:
        "A regional VBS network produced reusable five-day arcs partner churches now remix every summer.",
      metrics: [
        { value: "85", label: "Partner churches" },
        { value: "5-day", label: "Reusable VBS arcs" },
        { value: "2x", label: "Kids reached YoY" },
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
