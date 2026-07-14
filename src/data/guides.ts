/**
 * Learning guides — the content behind /learning and /learning/:slug, and the
 * source corpus for the Ezra Guide assistant (see supabase/functions/help-assist).
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
  | "Study with Ezra"
  | "Write & export"
  | "Organize"
  | "Bible reader";

export const GUIDE_CATEGORY_ORDER: GuideCategory[] = [
  "Getting started",
  "Study with Ezra",
  "Bible reader",
  "Write & export",
  "Organize",
];

export const GUIDES: Guide[] = [
  {
    slug: "your-first-sermon-outline",
    title: "Your first sermon outline in 10 minutes",
    summary: "Go from a passage to a structured, cited outline you can preach from.",
    category: "Getting started",
    icon: "Sparkles",
    readingMinutes: 4,
    intro:
      "The fastest way to feel what Ezra does is to build one outline end to end. You bring the passage and the occasion; Ezra maps the context, gathers the cross-references, and drafts a structure — every claim traced to a source you can open.",
    steps: [
      {
        heading: "Open Ezra and name your passage",
        body: "From the sidebar, open **Ezra**. In the message box, type the passage and what you're preparing — for example: *\"Build me a sermon outline on Philippians 2:1–11 for a Sunday morning service on humility.\"* You don't need special syntax; plain English is the interface.",
        action: { label: "Open Ezra", to: "/app/ezra" },
      },
      {
        heading: "Set the depth with the power dial",
        body: "Next to the composer is a power control. Lower settings answer fast and cheap; higher settings pull more cross-references and reason more deeply. For a first outline, the middle is plenty — you can always ask Ezra to \"go deeper on the Greek in verse 6\" afterward.",
      },
      {
        heading: "Read the outline — and check the citations",
        body: "Ezra returns a structured outline: context, movements, and application, with citations attached. Click any citation to see the verse or source it rests on. If something looks thin, ask a follow-up in the same chat: *\"Give me two more illustrations for the second point.\"* The chat keeps its memory of the passage.",
      },
      {
        heading: "Send it to Write when you're ready to draft",
        body: "When the shape is right, use the outline's **To Write** action (or ask Ezra to \"open this in Write\"). It becomes an editable document you can expand into a full manuscript — no copy-paste.",
        action: { label: "Open Write", to: "/app/write" },
      },
    ],
  },
  {
    slug: "grounding-ezra-in-your-library",
    title: "Grounding Ezra in your own library",
    summary: "Upload commentaries, style guides, and past sermons so answers cite your context.",
    category: "Getting started",
    icon: "Library",
    readingMinutes: 5,
    intro:
      "Ezra is strongest when it answers from the sources you trust. Collections let you upload your own material — commentaries, denominational style guides, past sermons — so Ezra grounds its answers in your library, not just its general knowledge.",
    steps: [
      {
        heading: "Create a collection",
        body: "Open **Collections** and create one for a theme or series — for example *\"Advent 2026\"* or *\"Reformed commentaries.\"* Think of a collection as a labeled shelf Ezra can read from on demand.",
        action: { label: "Open Collections", to: "/app/knowledge" },
      },
      {
        heading: "Add your material",
        body: "Upload documents or paste text into the collection. Ezra indexes it so it can retrieve the relevant passages later. Your uploads are private to your account.",
      },
      {
        heading: "Point Ezra at it while you study",
        body: "In the Ezra composer, use the **Use a collection** button to attach a collection to your question. Now when you ask about a passage, Ezra draws on your commentaries first and cites them alongside Scripture.",
        action: { label: "Try it in Ezra", to: "/app/ezra" },
      },
    ],
  },
  {
    slug: "studying-a-passage-in-depth",
    title: "Studying a passage in depth",
    summary: "Use follow-ups, translations, and the power dial to work a text thoroughly.",
    category: "Study with Ezra",
    icon: "MessagesSquare",
    readingMinutes: 5,
    intro:
      "A single question rarely exhausts a passage. Ezra is built for the back-and-forth of real study: each chat remembers the text you're working, so you can layer questions from context to language to application.",
    steps: [
      {
        heading: "Start broad, then narrow",
        body: "Open the passage with a wide question — *\"Walk me through the context and structure of Romans 8.\"* Then narrow: *\"What does 'groaning' mean in verses 22–23?\"* Ezra keeps the passage in view, so follow-ups don't need to repeat it.",
        action: { label: "Open Ezra", to: "/app/ezra" },
      },
      {
        heading: "Pull the original language when it matters",
        body: "Ask for the Greek or Hebrew behind a specific word and Ezra will surface it with a gloss and how translations render it — without pretending to a certainty the text doesn't support.",
      },
      {
        heading: "Turn the dial up for the hard parts",
        body: "For contested passages, raise the power level so Ezra gathers more cross-references and weighs interpretive options. It will show you the range of orthodox readings rather than flattening them into one.",
      },
      {
        heading: "Keep the thread — pin it for later",
        body: "A rich study chat is worth returning to. In the chats panel, pin it to the top or file it under a category like *\"Romans series\"* so it's easy to find next week.",
      },
    ],
  },
  {
    slug: "reading-highlighting-bookmarking",
    title: "Reading, highlighting & bookmarking Scripture",
    summary: "Make the Bible reader your own with highlights, notes, and bookmarks.",
    category: "Bible reader",
    icon: "BookOpen",
    readingMinutes: 4,
    intro:
      "The Bible reader is built for study, not just reading. Highlights, notes, and bookmarks are saved to your account and follow the verse across translations.",
    steps: [
      {
        heading: "Select verses to act on them",
        body: "Open the **Bible** and tap a verse (or several) to select. A toolbar appears with highlight colors, notes, and more. Highlights are translation-agnostic — a highlight made in KJV shows when you read the same verse elsewhere.",
        action: { label: "Open the Bible", to: "/app/bible" },
      },
      {
        heading: "Bookmark a chapter or a verse",
        body: "Tap the ribbon at the top corner of the page to bookmark the whole chapter, or use **Bookmark** in the verse toolbar for a specific verse. Press **b** as a keyboard shortcut for the chapter ribbon.",
      },
      {
        heading: "Find everything in the Study drawer",
        body: "The Study drawer (the highlighter icon in the reader toolbar) gathers your highlights and bookmarks in one place, grouped by book. Tap any entry to jump straight back to it.",
      },
      {
        heading: "Send a passage to Ezra or Write",
        body: "With verses selected, use **Ask Ezra** to study them, or **To Write** to drop them into a document as a formatted quote with the reference attached.",
      },
    ],
  },
  {
    slug: "listening-to-scripture",
    title: "Listening to Scripture",
    summary: "Choose a reading voice and follow along verse by verse.",
    category: "Bible reader",
    icon: "Volume2",
    readingMinutes: 3,
    intro:
      "Sometimes you want to hear the text. The reader can read any chapter aloud in one of five voices, highlighting each verse as it goes.",
    steps: [
      {
        heading: "Press play in the reader",
        body: "In the **Bible**, use the listen control in the toolbar. A dock appears at the bottom with playback controls and a verse scrubber. The verse being read glows and stays centered as you listen.",
        action: { label: "Open the Bible", to: "/app/bible" },
      },
      {
        heading: "Pick a voice that fits the passage",
        body: "Open the voice picker in the dock to choose among five reading personas — from a warm, unhurried tone for the Psalms to a brighter one for narrative. Tap any persona to audition it. Your choice is remembered.",
      },
      {
        heading: "Set speed, a sleep timer, or continuous reading",
        body: "The dock lets you adjust speed, set a sleep timer, or turn on **Continue** to read on into the next chapter — an audio-Bible mode for longer listening.",
      },
    ],
  },
  {
    slug: "drafting-and-exporting",
    title: "Drafting and exporting your work",
    summary: "Write in the editor and export to Docs, Word, or PDF.",
    category: "Write & export",
    icon: "PenLine",
    readingMinutes: 4,
    intro:
      "Write is where an outline becomes a manuscript. It's a focused editor with AI assistance on tap, and everything you write can leave in the format your workflow needs.",
    steps: [
      {
        heading: "Open a document",
        body: "Open **Write** to start a new document, or send an outline over from Ezra. The editor supports headings, lists, and quotes — the structure a sermon or study needs.",
        action: { label: "Open Write", to: "/app/write" },
      },
      {
        heading: "Ask for help inline",
        body: "Select text and use the AI menu to expand a point, tighten a paragraph, or suggest an illustration. Ezra works on the selection in place, so you keep control of the draft.",
      },
      {
        heading: "Export when you're done",
        body: "From the document, export to Google Docs, Word (DOCX), PDF, or Markdown — or copy it out. Your file goes where you preach or share from.",
        action: { label: "Open the File Cabinet", to: "/app/file-cabinet" },
      },
    ],
  },
  {
    slug: "organizing-your-prep",
    title: "Organizing your prep on the board",
    summary: "Track sermons, series, and projects on a Kanban board with a calendar.",
    category: "Organize",
    icon: "KanbanSquare",
    readingMinutes: 5,
    intro:
      "Organize is a board and calendar for the work around your studies — sermons in progress, a series being planned, admin that can't slip. Cards can link straight to the documents, collections, and chats they belong to.",
    steps: [
      {
        heading: "Make a board",
        body: "Open **Organize**. Your first board comes with starter columns (Ideas, In progress, Ready, Done). Rename columns by double-clicking, and add cards with the **Add card** button under any column.",
        action: { label: "Open Organize", to: "/app/organize" },
      },
      {
        heading: "Link cards to your work",
        body: "Open a card and use **Attach from your library** to link a document, collection, creation, or Ezra chat. The card shows a badge for each link, and clicking it opens the source — so the board stays connected to the actual work.",
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
