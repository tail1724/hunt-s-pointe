import { useMemo } from "react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, ArrowRight, ArrowUpRight, Clock } from "lucide-react";
import { GUIDES, getGuide } from "@/data/guides";
import { GuideSidebar } from "./GuideSidebar";

/** Slug → stable anchor id for a step heading. */
const stepId = (i: number) => `step-${i + 1}`;

interface Props {
  slug: string;
}

/** A single guide rendered as a premium doc page: sidebar · content · TOC. */
export function GuidePage({ slug }: Props) {
  const guide = getGuide(slug);
  const index = GUIDES.findIndex((g) => g.slug === slug);
  const prev = index > 0 ? GUIDES[index - 1] : null;
  const next = index >= 0 && index < GUIDES.length - 1 ? GUIDES[index + 1] : null;

  const toc = useMemo(() => guide?.steps.map((s, i) => ({ id: stepId(i), heading: s.heading })) ?? [], [guide]);

  if (!guide) {
    return (
      <section className="page active"><div className="wrap pad">
        <p className="eyebrow eyebrow--c">Not found</p>
        <h1 className="display" style={{ marginTop: 12 }}>We couldn&apos;t find that guide.</h1>
        <Link to="/learning" className="btn btn--ink" style={{ marginTop: 20 }}>
          <ArrowLeft className="h-4 w-4" /> Back to Learning
        </Link>
      </div></section>
    );
  }

  return (
    <section className="page active"><div className="wrap pad">
      <div className="guide-layout">
        <GuideSidebar activeSlug={slug} />

        <article className="guide-main">
          <nav className="guide-crumb" aria-label="Breadcrumb">
            <Link to="/learning">Learning</Link>
            <span aria-hidden>/</span>
            <span>{guide.category}</span>
          </nav>

          <p className="eyebrow eyebrow--c">{guide.category}</p>
          <h1 className="display guide-title">{guide.title}</h1>
          <p className="guide-meta">
            <Clock className="h-3.5 w-3.5" aria-hidden /> {guide.readingMinutes} min read
          </p>
          <p className="lead guide-intro">{guide.intro}</p>

          <ol className="guide-steps">
            {guide.steps.map((step, i) => (
              <li key={step.heading} id={stepId(i)} className="guide-step">
                <div className="guide-step__num" aria-hidden>{i + 1}</div>
                <div className="guide-step__body">
                  <h2 className="h3 guide-step__heading">{step.heading}</h2>
                  <div className="guide-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.body}</ReactMarkdown>
                  </div>
                  {step.action && (
                    <Link to={step.action.to} className="btn btn--ink btn--sm guide-step__action">
                      {step.action.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ol>

          <div className="guide-pager">
            {prev ? (
              <Link to={`/learning/${prev.slug}`} className="guide-pager__link">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span><small>Previous</small>{prev.title}</span>
              </Link>
            ) : <span />}
            {next ? (
              <Link to={`/learning/${next.slug}`} className="guide-pager__link guide-pager__link--next">
                <span><small>Next</small>{next.title}</span>
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : <span />}
          </div>
        </article>

        <aside className="guide-toc" aria-label="On this page">
          <p className="guide-toc__label">On this page</p>
          <ul>
            {toc.map((t) => (
              <li key={t.id}><a href={`#${t.id}`}>{t.heading}</a></li>
            ))}
          </ul>
        </aside>
      </div>
    </div></section>
  );
}
