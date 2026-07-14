import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Clock, KanbanSquare, Library,
  MessagesSquare, PenLine, Sparkles, Volume2, type LucideIcon,
} from "lucide-react";
import { GUIDES, getGuide, guidesByCategory } from "@/data/guides";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, Library, MessagesSquare, BookOpen, Volume2, PenLine, KanbanSquare,
};
const stepId = (i: number) => `step-${i + 1}`;

/** The docs sidebar — categories → guides, same IA as the public Learning page. */
function HelpSidebar({ activeSlug }: { activeSlug?: string }) {
  return (
    <nav className="help-nav" aria-label="Guides">
      <Link to="/app/help" className="help-nav__home">All guides</Link>
      {guidesByCategory().map(({ category, guides }) => (
        <div key={category} className="help-nav__group">
          <p className="help-nav__cat">{category}</p>
          <ul>
            {guides.map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/app/help/${g.slug}`}
                  className={cn("help-nav__link", g.slug === activeSlug && "is-active")}
                  aria-current={g.slug === activeSlug ? "page" : undefined}
                >
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** One guide, app-themed: sidebar · numbered steps · on-this-page TOC. */
export function HelpGuidePage({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const guide = getGuide(slug);
  const index = GUIDES.findIndex((g) => g.slug === slug);
  const prev = index > 0 ? GUIDES[index - 1] : null;
  const next = index >= 0 && index < GUIDES.length - 1 ? GUIDES[index + 1] : null;

  if (!guide) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-xl font-semibold">We couldn&apos;t find that guide.</h1>
        <button
          type="button"
          onClick={() => navigate("/app/help")}
          className="tactile mt-5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to guides
        </button>
      </div>
    );
  }

  const toc = guide.steps.map((s, i) => ({ id: stepId(i), heading: s.heading }));

  return (
    <div className="help-surface min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <div className="help-layout">
          <HelpSidebar activeSlug={slug} />

          <article className="min-w-0">
            <nav className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              <Link to="/app/help" className="hover:text-foreground">Help</Link>
              <span aria-hidden>/</span>
              <span>{guide.category}</span>
            </nav>

            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">{guide.category}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">{guide.title}</h1>
            <p className="mt-3 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {guide.readingMinutes} min read
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">{guide.intro}</p>

            <ol className="mt-8 list-none space-y-7 p-0">
              {guide.steps.map((step, i) => (
                <li key={step.heading} id={stepId(i)} className="relative grid grid-cols-[2.25rem_1fr] gap-4 scroll-mt-6">
                  {i < guide.steps.length - 1 && (
                    <span className="absolute left-[1.125rem] top-10 bottom-[-1.75rem] w-px bg-border" aria-hidden />
                  )}
                  <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-sm text-primary-foreground">
                    {i + 1}
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold">{step.heading}</h2>
                    <div className="prose prose-sm mt-2 max-w-none text-[0.94rem] leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_strong]:font-semibold [&_em]:text-foreground [&_code]:rounded [&_code]:border [&_code]:border-border [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.body}</ReactMarkdown>
                    </div>
                    {step.action && (
                      <Link
                        to={step.action.to}
                        className="tactile mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground"
                      >
                        {step.action.label} <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex items-center justify-between gap-4 border-t border-border pt-5">
              {prev ? (
                <Link
                  to={`/app/help/${prev.slug}`}
                  className="tactile flex max-w-[48%] items-center gap-2.5 rounded-xl border border-border px-4 py-3 hover:border-accent/60"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Previous</span>
                    <span className="block truncate text-sm font-semibold">{prev.title}</span>
                  </span>
                </Link>
              ) : <span />}
              {next ? (
                <Link
                  to={`/app/help/${next.slug}`}
                  className="tactile ml-auto flex max-w-[48%] items-center gap-2.5 rounded-xl border border-border px-4 py-3 text-right hover:border-accent/60"
                >
                  <span className="min-w-0">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Next</span>
                    <span className="block truncate text-sm font-semibold">{next.title}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ) : <span />}
            </div>
          </article>

          <aside className="help-toc" aria-label="On this page">
            <p className="help-toc__label">On this page</p>
            <ul>
              {toc.map((t) => (
                <li key={t.id}><a href={`#${t.id}`}>{t.heading}</a></li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

export { HelpSidebar, ICONS };
