import { Reveal } from "./Reveal";
import { Link } from "react-router-dom";

// No named testimonials here on purpose — see /customers (FoundingChurches)
// for the same honesty stance. Replace this whole section once real,
// attributed quotes exist; don't reintroduce invented names/quotes here.
export function TestimonialsCarousel() {
  return (
    <section className="py-20 md:py-28 px-6 bg-muted/30 border-y border-border">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              More time for <span className="text-primary">worship</span>, less for the search.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              That's the trade we're building toward — hours back in your week to actually shepherd people.
            </p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-10 rounded-xl border border-border bg-card p-6 md:p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/70">
              The honest version
            </p>
            <h3 className="mt-3 font-display text-xl font-bold text-foreground">
              We're early. We haven't published quotes we didn't earn.
            </h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
              When real pastors are ready to be named, their words will replace this card — in their own voice, attached to their own church.
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
            >
              Be one of the first to weigh in →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
