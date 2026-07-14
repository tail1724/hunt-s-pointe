import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "./Reveal";
import { APP_NAME } from "@/lib/constants";
import { trackCTA } from "@/lib/track";
import heroDove from "@/assets/hero-dove.jpg";


const BEFORE_PROMPT = `Sunday's text is Luke 15. I have my notes, a half-finished outline, three commentaries I haven't opened, and four hours.`;

const AFTER_PROMPT = `Luke 15 — three parables of the lost. Ezra surfaces relevant passages, cross-references, and your saved notes on grace from last Easter.

You get an exegesis outline, a list of cited cross-references, and a structured prompt for your own draft — in fifteen minutes, not four hours.

You still write the sermon. Ezra just clears the runway.`;

interface HeroV2Props {
  onOpenAuth: () => void;
}

export function HeroV2({ onOpenAuth }: HeroV2Props) {
  const navigate = useNavigate();
  const [mobileTab, setMobileTab] = useState<"before" | "after">("after");
  return (
    <section className="relative overflow-hidden">
      <img
        src={heroDove}
        alt=""
        aria-hidden
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 w-full h-full object-cover object-top opacity-80 motion-safe:animate-[float_22s_ease-in-out_infinite] pointer-events-none select-none"
        style={{ objectPosition: "50% 18%" }}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, hsl(var(--background) / 0.35) 0%, hsl(var(--background) / 0.55) 45%, hsl(var(--background) / 0.92) 78%, hsl(var(--background)) 100%)",
        }}
      />
      <div className="absolute inset-0 gradient-mesh opacity-40 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" aria-hidden />


      <div className="relative max-w-6xl mx-auto px-5 md:px-6 pt-10 pb-14 md:py-32">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Now in early access
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-5 font-display text-[2.25rem] leading-[1.05] md:text-6xl font-extrabold tracking-tight">
              Research deeper.{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Preach your own words, faster.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-4 text-base md:text-xl text-muted-foreground leading-relaxed">
              Ezra is a theological research partner — not a sermon generator. Outline your exegesis, synthesize commentaries, and organize your study, with every claim cited. You still write the sermon.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 justify-center">
              <Button
                onClick={() => {
                  trackCTA("signup", "hero");
                  onOpenAuth();
                }}
                size="lg"
                className="rounded-lg shadow-lg hover:shadow-xl text-base px-6 sm:px-8 h-12 gap-2 w-full sm:w-auto sm:min-w-[210px] font-semibold"
              >
                Get Started — Free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  trackCTA("try-free", "hero");
                  navigate("/prompt-central-lite");
                }}
                className="rounded-lg text-base px-6 sm:px-8 h-12 gap-2 w-full sm:w-auto sm:min-w-[210px] font-semibold"
              >
                Try It Free — No Sign-up <Sparkles className="h-4 w-4" />
              </Button>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Free forever tier
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-primary" /> Cancel any time
              </span>
            </div>
          </Reveal>
        </div>

        {/* Before / After comparison — mobile tab toggle, desktop side-by-side */}
        <Reveal delay={400}>
          {/* Mobile tabs */}
          <div className="md:hidden">
            <div className="inline-flex p-1 rounded-full border border-border bg-card/80 backdrop-blur mb-3">
              <button
                type="button"
                onClick={() => setMobileTab("before")}
                className={`px-4 h-8 rounded-full text-xs font-semibold transition-colors ${
                  mobileTab === "before"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Before
              </button>
              <button
                type="button"
                onClick={() => setMobileTab("after")}
                className={`px-4 h-8 rounded-full text-xs font-semibold transition-colors ${
                  mobileTab === "after"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                After — {APP_NAME}
              </button>
            </div>
            {mobileTab === "before" ? (
              <div
                className="relative rounded-xl border border-secondary/30 bg-muted/60 backdrop-blur p-5"
                style={{ boxShadow: "var(--glow-cool)" }}
              >
                <pre className="font-mono text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {BEFORE_PROMPT}
                </pre>
              </div>
            ) : (
              <div
                className="relative rounded-xl border border-primary/30 bg-card/90 backdrop-blur p-5 shadow-lg"
                style={{ boxShadow: "var(--glow-zest)" }}
              >
                <pre className="font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                  {AFTER_PROMPT}
                </pre>
              </div>
            )}
          </div>

          {/* Desktop side-by-side */}
          <div className="hidden md:grid md:grid-cols-2 gap-6">
            <div
              className="relative rounded-xl border border-secondary/30 bg-muted/60 backdrop-blur p-6"
              style={{ boxShadow: "var(--glow-cool)" }}
            >
              <div className="absolute top-3 left-4 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Before
              </div>
              <pre className="mt-4 font-mono text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {BEFORE_PROMPT}
              </pre>
            </div>
            <div
              className="relative rounded-xl border border-primary/30 bg-card/90 backdrop-blur p-6 shadow-lg"
              style={{ boxShadow: "var(--glow-zest)" }}
            >
              <div className="absolute top-3 left-4 text-[10px] uppercase tracking-widest text-primary font-semibold">
                After — {APP_NAME}
              </div>
              <pre className="mt-4 font-mono text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {AFTER_PROMPT}
              </pre>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
