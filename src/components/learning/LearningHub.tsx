import { Link } from "react-router-dom";
import {
  ArrowUpRight, BookOpen, Clock, KanbanSquare, Library, MessagesSquare, PenLine, Sparkles, Volume2,
  type LucideIcon,
} from "lucide-react";
import { guidesByCategory } from "@/data/guides";
import { FAQList } from "@/components/public/sections/AllSections";
import { EzraGuideAssistant } from "./EzraGuideAssistant";

const ICONS: Record<string, LucideIcon> = {
  Sparkles, Library, MessagesSquare, BookOpen, Volume2, PenLine, KanbanSquare,
};

/** The Learning hub: assistant up top, then real guides grouped by category. */
export function LearningHub() {
  return (
    <section className="page active" id="learning"><div className="wrap pad">
      <header className="head">
        <p className="eyebrow eyebrow--c reveal">Learning</p>
        <h1 className="display reveal">Everything you need <span className="mark">to feel at home</span>.</h1>
        <p className="lead center mxw-60 reveal" style={{ marginTop: 16 }}>
          Step-by-step guides for every part of Ezra — and a helper that answers &ldquo;how do I…&rdquo; in plain language.
        </p>
      </header>

      <div className="pad-t reveal">
        <EzraGuideAssistant />
      </div>

      {guidesByCategory().map(({ category, guides }) => (
        <div className="pad-t" key={category}>
          <p className="eyebrow eyebrow--c reveal">{category}</p>
          <div className="grid cols-3 reveal" style={{ marginTop: 22 }}>
            {guides.map((g) => {
              const Icon = ICONS[g.icon] ?? Sparkles;
              return (
                <Link key={g.slug} to={`/learning/${g.slug}`} className="card learn-card learn-card--link">
                  <div className="icon icon--paper"><Icon className="h-5 w-5" aria-hidden /></div>
                  <h3 className="h3">{g.title}</h3>
                  <p>{g.summary}</p>
                  <span className="learn-card__cta">
                    <Clock className="h-3 w-3" aria-hidden /> {g.readingMinutes} min
                    <ArrowUpRight className="h-3.5 w-3.5 learn-card__arrow" aria-hidden />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div className="pad-t">
        <div className="head">
          <p className="eyebrow eyebrow--c reveal">Questions</p>
          <h2 className="h2 reveal" style={{ marginTop: 14 }}>Frequently asked <span className="mark">questions</span>.</h2>
        </div>
        <FAQList />
      </div>
    </div></section>
  );
}
