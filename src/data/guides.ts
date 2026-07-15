/**
 * Learning guides — the content behind /learning and /learning/:slug, and the
 * source corpus for the PressRoom Guide assistant (see supabase/functions/help-assist).
 *
 * Guides are plain data so they render as premium doc pages, feed the on-page
 * search, and can be chunked into the assistant's retrieval corpus without a
 * second source of truth. Bodies are light Markdown (rendered with the app's
 * react-markdown + typography styles).
 */

export interface GuideAction {
  /** Button label, e.g. "Open Write". */
  label: string;
  /** In-app route to deep-link into, e.g. "/app/write". */
  to: string;
}

export interface GuideStep {
  heading: string;
  /** Markdown body. */
  body: string;
  action?: GuideAction;
}

export interface Guide {
  slug: string;
  title: string;
  /** One-line summary for cards and search. */
  summary: string;
  category: GuideCategory;
  /** lucide-react icon name resolved in the UI. */
  icon: string;
  readingMinutes: number;
  /** Lead paragraph shown under the title. */
  intro: string;
  steps: GuideStep[];
}

export type GuideCategory =
  | "Getting started"
  | "Research with PressRoom"
  | "Write & publish"
  | "Organize";

export const GUIDE_CATEGORY_ORDER: GuideCategory[] = [
  "Getting started",
  "Research with PressRoom",
  "Write & publish",
  "Organize",
];

export const GUIDES: Guide[] = [
  {
    slug: "your-first-story-outline",
    title: "Your first story outline in 10 minutes",
    summary: "Go from a pitch to a structured, sourced outline you can draft from.",
    category: "Getting started",
    icon: "Sparkles",
    readingMinutes: 4,
    intro:
      "The fastest way to feel what PressRoom does is to build one outline end to end. You bring the story and the angle; PressRoom maps the background, gathers the sources, and drafts a structure — every claim traced to a source you can open.",
    steps: [
      {
        heading: "Open PressRoom and name your story",
        body: "From the sidebar, open **PressRoom**. In the message box, type the story and what you're producing — for example: *\"Outline an explainer on the new transit plan for our newsletter audience, about 1,200 words.\"* You don't need special syntax; plain English is the interface.",
        action: { label: "Open PressRoom", to: "/app/pressroom" },
      },
      {
        heading: "Set the depth with the power dial",
        body: "Next to the composer is a power control. Lower settings answer fast and cheap; higher settings pull more sources and reason more deeply. For a first outline, the middle is plenty — you can always ask PressRoom to \"go deeper on the funding section\" afterward.",
      },
      {
        heading: "Read the outline — and check the citations",
        body: "PressRoom returns a structured outline: the lede candidate, the sections, and the open questions, with citations attached. Click any citation to see the source it rests on. If something looks thin, ask a follow-up in the same chat: *\"Find two more sources on the budget figure.\"* The chat keeps its memory of the story.",
      },
      {
        heading: "Send it to Write when you're ready to draft",
        body: "When the shape is right, use the outline's **To Write** action (or ask PressRoom to \"open this in Write\"). It becomes an editable document you can expand into a full manuscript — no copy-paste. From there, the writing is yours: PressRoom only ever suggests in the margins.",
        action: { label: "Open Write", to: "/app/write" },
      },
    ],
  },
  {
    slug: "grounding-pressroom-in-your-archive",
    title: "Grounding PressRoom in your own archive",
    summary: "Upload past coverage, style guides, and documents so answers cite your material.",
    category: "Getting started",
    icon: "Library",
    readingMinutes: 5,
    intro:
      "PressRoom is strongest when it answers from the sources you trust. Projects let you upload your own material — past coverage, your house style guide, source documents — so PressRoom grounds its answers in your archive, not just its general knowledge.",
    steps: [
      {
        heading: "Create a project",
        body: "Open **Projects** and create one for a story or series — for example *\"Transit overhaul\"* or *\"Housing investigation.\"* Think of a project as a labeled shelf PressRoom can read from on demand.",
        action: { label: "Open Projects", to: "/app/knowledge" },
      },
      {
        heading: "Add your material",
        body: "Upload documents or paste text into the project. PressRoom indexes it so it can retrieve the relevant passages later. Your uploads are private to your account.",
      },
      {
        heading: "Point PressRoom at it while you work",
        body: "In the PressRoom composer, use the **Use a project** button to attach a project to your question. Now when you ask about the story, PressRoom draws on your documents first and cites them alongside its answer — and the Write editor's assistant reads from the same shelf.",
        action: { label: "Try it in PressRoom", to: "/app/pressroom" },
      },
    ],
  },
  {
    slug: "researching-a-story-in-depth",
    title: "Researching a story in depth",
    summary: "Use follow-ups, grounded sources, and the power dial to work a story thoroughly.",
    category: "Research with PressRoom",
    icon: "MessagesSquare",
    readingMinutes: 5,
    intro:
      "A single question rarely exhausts a story. PressRoom is built for the back-and-forth of real reporting: each chat remembers the story you're working, so you can layer questions from background to specifics to verification.",
    steps: [
      {
        heading: "Start broad, then narrow",
        body: "Open the story with a wide question — *\"Give me the background on the district's bus contract.\"* Then narrow: *\"What changed after the 2023 audit?\"* PressRoom keeps the story in view, so follow-ups don't need to repeat it.",
        action: { label: "Open PressRoom", to: "/app/pressroom" },
      },
      {
        heading: "Ask for the sourcing behind any claim",
        body: "Every factual claim should trace to a source. Ask *\"where does that number come from?\"* and PressRoom will show its grounding — or tell you plainly that it can't verify, which is its own answer.",
      },
      {
        heading: "Turn the dial up for the hard parts",
        body: "For contested or complex questions, raise the power level so PressRoom gathers more sources and weighs them more carefully. It will show you the range of readings rather than flattening them into one.",
      },
      {
        heading: "Keep the thread — pin it for later",
        body: "A rich research chat is worth returning to. In the chats panel, pin it to the top or file it under a category like *\"Transit series\"* so it's easy to find next week.",
      },
    ],
  },
  {
    slug: "margin-suggestions-and-your-voice",
    title: "Margin suggestions & protecting your voice",
    summary: "How PressRoom edits without ever overwriting a word you wrote.",
    category: "Write & publish",
    icon: "PenLine",
    readingMinutes: 4,
    intro:
      "In the Write editor, PressRoom never touches your manuscript. Every suggestion — a rewrite, a continuation, a flag — lands in the margin as a proposal with a diff. You read it, and if you want it, you integrate it by hand. That friction is the feature: the prose stays yours.",
    steps: [
      {
        heading: "Ask from a selection or the side panel",
        body: "Select a passage and pick a preset (Improve, Shorten, Change tone…) or ask in your own words. The proposal appears in the margin rail beside the page, anchored to the passage, with the changes marked — never applied.",
        action: { label: "Open Write", to: "/app/write" },
      },
      {
        heading: "Read the diff, then decide",
        body: "Each margin card shows what would change and why. Dismiss it, or use it as reference while you retype the line your way. For small mechanical fixes there's a per-suggestion apply, and every applied suggestion is recorded in the document's history as an AI-attributed change.",
      },
      {
        heading: "Watch the cadence dial",
        body: "The editor tracks the rhythm of your prose — sentence-length variety and vocabulary predictability. If an edit would flatten your natural cadence into machine-smooth text, the suggestion itself gets flagged before you ever accept it.",
      },
      {
        heading: "Check the history",
        body: "The History drawer shows every version with its author — you or PressRoom — and a one-line summary of what changed. Roll back to any point with one click.",
      },
    ],
  },
  {
    slug: "drafting-and-exporting",
    title: "Drafting and exporting your work",
    summary: "Write in the editor and export structured content to your CMS, Word, or PDF.",
    category: "Write & publish",
    icon: "BookOpen",
    readingMinutes: 4,
    intro:
      "Write is where an outline becomes a manuscript. It's a focused editor with PressRoom in the margins, and everything you write can leave in the format your production pipeline needs — including structured output mapped to a headless CMS.",
    steps: [
      {
        heading: "Open a document",
        body: "Open **Write** to start a new document, or send an outline over from PressRoom. The editor supports headings, lists, quotes, and the newsroom fields a story needs — headline, dek, byline, section, status.",
        action: { label: "Open Write", to: "/app/write" },
      },
      {
        heading: "Ask for help inline",
        body: "Select text and use the margin assistant to tighten a paragraph, propose a transition, or draft a continuation. Suggestions arrive beside the page — you keep the pen.",
      },
      {
        heading: "Export when you're done",
        body: "From the document, export to your CMS schema (JSON or Markdown with front-matter), Word (DOCX), PDF, or copy it out. The export carries the document's metadata and its provenance certificate.",
        action: { label: "Open the Newsroom", to: "/app/file-cabinet" },
      },
    ],
  },
  {
    slug: "verifying-and-cascading-a-story",
    title: "Verifying a draft & cascading it everywhere",
    summary: "Run the fact pass, then turn one story into its newsletter, social, and SEO variants.",
    category: "Write & publish",
    icon: "Volume2",
    readingMinutes: 5,
    intro:
      "Before a story ships, PressRoom checks it; after it ships, PressRoom multiplies it. The verification pass reads your draft for factual claims and checks them against your sources and archive. The cascade turns the finished piece into every downstream format — clearly labeled as machine-drafted, always behind your review.",
    steps: [
      {
        heading: "Move the draft to review",
        body: "Set the document's status to **In review** (or run **Verify draft** by hand). PressRoom extracts the empirical claims — numbers, quotes, dates — and checks each against your project sources and past coverage, flagging contradictions with earlier pieces.",
      },
      {
        heading: "Work the flags in the margin",
        body: "Each claim gets a verdict and a confidence score in the margin: supported, contradicted, or unverifiable, with the sources it checked. Resolve the orange flags before staging; that's the whole workflow.",
      },
      {
        heading: "Cascade the finished piece",
        body: "From a ready document, open the **Cascade** panel to generate the SEO title and meta description, the newsletter edition, the social thread, and excerpt hooks — each editable, each reviewed by you before it goes anywhere.",
        action: { label: "Open Write", to: "/app/write" },
      },
    ],
  },
  {
    slug: "organizing-the-newsroom",
    title: "Organizing the newsroom on the board",
    summary: "Track stories, series, and production on a Kanban board with a calendar.",
    category: "Organize",
    icon: "KanbanSquare",
    readingMinutes: 5,
    intro:
      "Organize is a board and calendar for the work around your stories — pieces in progress, a series being planned, production that can't slip. Cards can link straight to the documents, projects, and chats they belong to.",
    steps: [
      {
        heading: "Make a board",
        body: "Open **Organize**. Your first board comes with starter columns (Ideas, In progress, Ready, Done). Rename columns by double-clicking, and add cards with the **Add card** button under any column.",
        action: { label: "Open Organize", to: "/app/organize" },
      },
      {
        heading: "Link cards to your work",
        body: "Open a card and use **Attach from your library** to link a document, project, creation, or PressRoom chat. The card shows a badge for each link, and clicking it opens the source — so the board stays connected to the actual work.",
      },
      {
        heading: "Filter by tag, search, or category",
        body: "The filter rail above the board searches card text and links, filters by tag, by content type, and by due date. Matching cards stay lit while the rest dim, so you can focus without losing your place.",
      },
      {
        heading: "Switch to the calendar",
        body: "Toggle to **Calendar** to see card due dates and events across month, week, or agenda views. Drag a card to a new day to reschedule it, or click an empty day to add an event.",
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guidesByCategory(): { category: GuideCategory; guides: Guide[] }[] {
  return GUIDE_CATEGORY_ORDER.map((category) => ({
    category,
    guides: GUIDES.filter((g) => g.category === category),
  })).filter((group) => group.guides.length > 0);
}
