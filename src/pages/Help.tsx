import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Clock,
  FileText,
  Hexagon,
  Library,
  LifeBuoy,
  Mail,
  Plug,
  Search,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { guidesByCategory } from "@/data/guides";
import { HelpGuidePage, ICONS } from "@/components/help/HelpGuidePage";

/**
 * In-app help center. Every guide is real product documentation written for
 * the people who use this product — pastors, teachers, and ministry teams
 * preparing for Sunday — not placeholder copy.
 */

interface Guide {
  title: string;
  /** Paragraphs, rendered in order. */
  body: string[];
  /** Optional numbered steps rendered after the body. */
  steps?: string[];
}

interface Section {
  id: string;
  label: string;
  icon: LucideIcon;
  blurb: string;
  guides: Guide[];
}

const SECTIONS: Section[] = [
  {
    id: "getting-started",
    label: "Getting started",
    icon: Sparkles,
    blurb: "The lay of the land — how the rooms of the study fit together.",
    guides: [
      {
        title: "A tour of your study",
        body: [
          "Think of the app as a pastor's study with five rooms. PressRoom is the research partner at the desk — ask it anything from \"walk me through Luke 15\" to \"draft a funeral homily for someone who wasn't religious.\" Write is the blank page where sermons and letters take shape. Collections is the bookshelf where your notes, PDFs, audio, and links live. File Cabinet holds finished work, and Analytics shows you how you've been using it all.",
          "Everything connects: PressRoom can read from your Collections, drafts from PressRoom open in Write, and finished pieces land in the File Cabinet.",
        ],
      },
      {
        title: "Your first week",
        body: [
          "The fastest way to feel at home is to bring one real sermon through the whole flow.",
        ],
        steps: [
          "Create a collection for this week's text (Collections → New) and drop in your notes, a commentary PDF, or a voice memo.",
          "Open PressRoom, pick your collection in the composer, and ask your first study question.",
          "When PressRoom produces a draft, click into the document card and continue in Write.",
          "Preach it Sunday. Then check Analytics on Monday to see what the preparation actually cost.",
        ],
      },
      {
        title: "Keyboard habits worth building",
        body: [
          "Enter sends a message in PressRoom; Shift+Enter adds a line break. In Write, the PressRoom assist bar accepts a ghost suggestion with Tab and submits with Enter. Small habits, but they add up across a season of sermons.",
        ],
      },
    ],
  },
  {
    id: "pressroom",
    label: "PressRoom",
    icon: Hexagon,
    blurb: "Your research partner for study, sermon prep, and pastoral writing.",
    guides: [
      {
        title: "Asking better study questions",
        body: [
          "PressRoom does its best work when you give it the same context you'd give a trusted associate pastor: the passage, the audience, and the moment. \"Analyze Proverbs 3:5–6\" is good; \"I'm preaching Proverbs 3:5–6 to a congregation walking through a church transition — what should I draw out?\" is better.",
          "PressRoom keeps the thread of a conversation, so follow-ups like \"now make that work for a youth group\" resolve against everything said before — no need to restate the passage.",
        ],
      },
      {
        title: "Scripture mode and translations",
        body: [
          "Toggle Scripture mode in the composer to have PressRoom resolve verse references against your preferred translation before answering. The first time you turn it on, you'll set your translation preferences; you can change them any time from the same toggle.",
        ],
      },
      {
        title: "Grounding answers in your own library",
        body: [
          "Pick a collection in the composer and PressRoom searches it before answering — your sermon archive, your commentaries, your notes. While it works you'll see exactly what it's doing: opening the collection, searching it, weighing the passages it found.",
          "Answers grounded in your sources carry a verification badge. \"Citations verified\" means every claim was checked against the material it cited; \"partially verified\" means some claims couldn't be traced back — read those with an editor's eye.",
        ],
      },
      {
        title: "What \"PressRoom remembers\" means",
        body: [
          "Longer sessions build a running memory — the passage you're working on, the date you're preaching, decisions you've already made. When you see the \"PressRoom remembers\" chip, hover it to read the summary. Memory stays within its session; a new session starts clean.",
        ],
      },
      {
        title: "From answer to document",
        body: [
          "When PressRoom writes something long-form — an outline, a liturgy, a full manuscript — it arrives as a document card, not a wall of chat. Edit it in place, or open it in Write to keep working. For shorter answers, the pen icon under any response copies it and takes you straight to a fresh page in Write.",
        ],
      },
      {
        title: "Rerunning and refining",
        body: [
          "The regenerate icon under PressRoom's latest answer asks for another take on the same question. If a response is heading the wrong direction mid-stream, hit stop and redirect — you won't lose the conversation.",
        ],
      },
    ],
  },
  {
    id: "write",
    label: "Write",
    icon: FileText,
    blurb: "The blank page, with a research partner one keystroke away.",
    guides: [
      {
        title: "The PressRoom assist bar",
        body: [
          "At the bottom of every document sits a quiet command bar. Type what you need — \"tighten this paragraph,\" \"add a transition into the second point,\" \"suggest a closing illustration\" — and PressRoom answers with the surrounding text in view. Press Tab to accept the rotating ghost suggestion if you're not sure what to ask.",
          "When a result comes back you choose what happens: insert it below your cursor, replace your selection, or dismiss it. Nothing touches your manuscript until you say so.",
        ],
      },
      {
        title: "Working with selections",
        body: [
          "Select a passage before invoking the assist bar and PressRoom treats it as the subject: rewrite it, expand it, translate its register from page to pulpit. The \"replace selection\" action swaps your selected text for the result in one motion.",
        ],
      },
      {
        title: "Focus mode",
        body: [
          "Focus mode strips the chrome — toolbar, cards, the assist bar — leaving you and the manuscript. Saturday-night friendly. Toggle it off when you want your tools back.",
        ],
      },
    ],
  },
  {
    id: "collections",
    label: "Collections",
    icon: Library,
    blurb: "Your bookshelf — the sources PressRoom studies before it answers.",
    guides: [
      {
        title: "What belongs in a collection",
        body: [
          "Anything you'd pull off the shelf while preparing: sermon manuscripts, commentary excerpts, meeting notes, article links, even audio and video — a recorded sermon or a lecture gets transcribed and indexed just like a document.",
          "Organize by how you actually work. A collection per sermon series works well; so does one per ministry area (funerals, weddings, membership class).",
        ],
      },
      {
        title: "Adding items",
        body: [],
        steps: [
          "Open a collection and choose Add item.",
          "Paste text, drop a link, or upload a file — documents, images, audio, or video.",
          "Give it a moment: new items are analyzed and indexed in the background so PressRoom can search them by meaning, not just keywords.",
        ],
      },
      {
        title: "Making a collection active",
        body: [
          "Each surface remembers its own active collection. Set one in PressRoom's composer and every substantive question searches it first; set one in Write and the assist bar drafts with it as background. Your choice follows you across devices.",
        ],
      },
    ],
  },
  {
    id: "file-cabinet",
    label: "File Cabinet",
    icon: Archive,
    blurb: "Where finished work lives — and leaves.",
    guides: [
      {
        title: "Finding what you made",
        body: [
          "Every document and export lands here, searchable and sorted by recency. The sermon you wrote in March for Easter is three keystrokes away next March.",
        ],
      },
      {
        title: "Exporting for Sunday",
        body: [
          "Open any item to export it in the format your workflow needs — print-ready for the pulpit, or copy-paste clean for your bulletin, slides, or church management system.",
        ],
      },
      {
        title: "Sending work back through PressRoom",
        body: [
          "Any item can seed a new PressRoom conversation — useful when this year's stewardship letter should learn from last year's. Look for the send-to-PressRoom action on the item.",
        ],
      },
    ],
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    blurb: "Stewardship of the tool itself — usage, cost, and history.",
    guides: [
      {
        title: "Reading the usage dashboard",
        body: [
          "The Usage tab shows conversations, documents, and model activity over time — a fair picture of where the tool earns its keep in your week. Cost shows what that activity translates to, so budget conversations with your board are numbers, not guesses.",
        ],
      },
      {
        title: "Working from history",
        body: [
          "The History tab is a ledger of past prompts and outputs. Reopen any entry to see exactly what was asked and answered, or send it back into PressRoom to continue where you left off.",
        ],
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Plug,
    blurb: "Connecting the study to the rest of your ministry stack.",
    guides: [
      {
        title: "Connecting a service",
        body: [
          "The Integrations page lists available connections. Connect the tools your church already runs — each card walks through its own authorization, and you can disconnect any service from the same card at any time.",
        ],
      },
      {
        title: "API keys, safely",
        body: [
          "Some integrations use API keys. Treat a key like a church credit card: store it only here, never in a shared document, and revoke it from the provider's dashboard if it ever leaks. Keys are stored encrypted and never shown in full after you save them.",
        ],
      },
    ],
  },
];

export default function Help() {
  const { slug } = useParams<{ slug: string }>();
  if (slug) return <HelpGuidePage slug={slug} />;
  return <HelpHub />;
}

/** The Help landing: step-by-step guides (docs layout, via /app/help/:slug) up top, the field-guide accordion below. */
function HelpHub() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTIONS;
    return SECTIONS.map((s) => ({
      ...s,
      guides: s.guides.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.body.some((p) => p.toLowerCase().includes(q)) ||
          (g.steps || []).some((p) => p.toLowerCase().includes(q)),
      ),
    })).filter((s) => s.guides.length > 0);
  }, [query]);

  const scrollTo = (id: string) => {
    document.getElementById(`help-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-2 text-primary">
          <LifeBuoy className="h-5 w-5" />
          <span className="text-[11px] font-semibold uppercase tracking-widest">Help &amp; Guides</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground">
          Field guides for every room in the study
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Short, honest guides to PressRoom, Write, Collections, and the rest — written for the week
          you're actually having, not the demo.
        </p>
      </header>

      {/* Step-by-step guides — the same content and docs layout as the public Learning page */}
      <div className="mb-12 space-y-8">
        {guidesByCategory().map(({ category, guides }) => (
          <section key={category}>
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-primary">{category}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {guides.map((g) => {
                const Icon = ICONS[g.icon] ?? Sparkles;
                return (
                  <Link
                    key={g.slug}
                    to={`/app/help/${g.slug}`}
                    className="tactile group flex flex-col rounded-xl border border-border bg-card/60 p-4 transition-colors hover:border-primary/40"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h3 className="mt-3 font-display text-sm font-semibold text-foreground">{g.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{g.summary}</p>
                    <span className="mt-auto flex items-center gap-1.5 pt-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                      <Clock className="h-3 w-3" /> {g.readingMinutes} min
                      <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the guides — try “citations”, “focus mode”, “collection”…"
          className="pl-9"
          aria-label="Search help guides"
        />
      </div>

      {/* Quick jump chips */}
      {!query && (
        <nav className="mb-8 flex flex-wrap gap-2" aria-label="Jump to section">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className="tactile inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <s.icon className="h-3.5 w-3.5 text-primary" />
              {s.label}
            </button>
          ))}
        </nav>
      )}

      {/* Sections */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
          <p className="text-sm font-medium text-foreground">Nothing matched “{query}”.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a feature name — “scripture mode”, “export”, “memory” — or clear the search.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {filtered.map((section) => (
            <section key={section.id} id={`help-${section.id}`} className="scroll-mt-6">
              <div className="mb-3 flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <section.icon className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-semibold tracking-tight text-foreground">
                    {section.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">{section.blurb}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-card/50 px-5">
                <Accordion type="single" collapsible className="w-full">
                  {section.guides.map((g, i) => (
                    <AccordionItem
                      key={g.title}
                      value={`${section.id}-${i}`}
                      className={cn("border-border/50", i === section.guides.length - 1 && "border-b-0")}
                    >
                      <AccordionTrigger className="py-3.5 text-left text-sm font-medium text-foreground/90 hover:no-underline">
                        {g.title}
                      </AccordionTrigger>
                      <AccordionContent className="text-[13px] leading-6 text-muted-foreground">
                        <div className="space-y-2.5 pb-1">
                          {g.body.map((p, j) => (
                            <p key={j}>{p}</p>
                          ))}
                          {g.steps && (
                            <ol className="list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-primary">
                              {g.steps.map((s, j) => (
                                <li key={j}>{s}</li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Support footer */}
      <footer className="mt-12 flex flex-col items-start gap-3 rounded-xl border border-border bg-card/50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Still stuck?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Write to us — a person reads every message, usually within a day.
          </p>
        </div>
        <a
          href="mailto:support@pressroomresearch.ai?subject=Help%20request"
          className="tactile inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
        >
          <Mail className="h-4 w-4 text-primary" />
          Contact support
        </a>
      </footer>
    </div>
  );
}
