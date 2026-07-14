import { useState } from "react";
import { Reveal } from "./Reveal";
import { vertical } from "@/config/vertical";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function UseCaseTabs() {
  const [active, setActive] = useState(vertical.useCases[0]?.key);
  const current = vertical.useCases.find((u) => u.key === active) ?? vertical.useCases[0];

  return (
    <section className="py-20 md:py-28 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              Built for <span className="text-primary">every workflow</span>.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Pick your role and see how pastors like you put it to work.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="grid md:grid-cols-5 gap-6">
            <div className="md:col-span-2 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {vertical.useCases.map((uc) => (
                <button
                  key={uc.key}
                  onClick={() => setActive(uc.key)}
                  className={cn(
                    "shrink-0 text-left rounded-lg border px-4 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active === uc.key
                      ? "border-primary bg-primary/5 text-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground",
                  )}
                >
                  <span className="font-display font-bold text-sm md:text-base block">{uc.title}</span>
                </button>
              ))}
            </div>

            <div className="md:col-span-3 rounded-xl border border-border bg-card p-6 md:p-8">
              <h3 className="font-display text-2xl font-bold text-foreground">{current.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{current.blurb}</p>
              <ul className="mt-6 space-y-2.5">
                {current.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-foreground/90">{o}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-6 border-t border-border">
                <Button asChild variant="ghost" className="gap-2">
                  <Link to={`/use-cases#${current.key}`}>
                    Read more <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
