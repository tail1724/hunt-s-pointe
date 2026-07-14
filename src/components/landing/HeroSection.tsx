import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";

const BEFORE_PROMPT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit.`;

const AFTER_PROMPT = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra.`;

interface HeroSectionProps {
  onOpenAuth: () => void;
}

export function HeroSection({ onOpenAuth }: HeroSectionProps) {
  const navigate = useNavigate();
  return (
    <section className="py-20 md:py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-[1.1]">
            Simplify Your Workflow.{" "}
            <span className="text-primary">Get Started Today.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3 justify-center">
            <Button onClick={onOpenAuth} size="lg" className="rounded-lg shadow-lg hover:shadow-xl text-base px-8 h-12 gap-2">
              Get Started — Free Trial <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate("/prompt-central-lite")} className="rounded-lg text-base px-8 h-12 gap-2">
              Try it Free — No Sign-up <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Before / After comparison */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          <div className="relative rounded-xl border border-secondary/30 bg-muted/50 p-4 md:p-6" style={{ boxShadow: "var(--glow-cool)" }}>
            <div className="absolute top-3 left-4 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Before</div>
            <pre className="mt-4 font-mono text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{BEFORE_PROMPT}</pre>
          </div>
          <div className="relative rounded-xl border border-primary/30 bg-card p-4 md:p-6 shadow-lg" style={{ boxShadow: "var(--glow-zest)" }}>
            <div className="absolute top-3 left-4 text-[10px] uppercase tracking-widest text-primary font-semibold">After — {APP_NAME}</div>
            <pre className="mt-4 font-mono text-[10px] md:text-xs text-foreground whitespace-pre-wrap leading-relaxed">{AFTER_PROMPT}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}
