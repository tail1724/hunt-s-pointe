import { Button } from "@/components/ui/button";
import { ArrowRight, Lock, Sparkles, Save, Infinity as InfinityIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { trackCTA, trackEvent } from "@/lib/track";
import { useEffect } from "react";

interface LiteSoftWallProps {
  onOpenAuth: () => void;
}

const BULLETS = [
  { icon: InfinityIcon, text: "Unlimited turns, full model access" },
  { icon: Save, text: "Your session — saved & resumable" },
  { icon: Sparkles, text: "Personas, exports & shareable links" },
];

export function LiteSoftWall({ onOpenAuth }: LiteSoftWallProps) {
  useEffect(() => {
    trackEvent("lite_wall_shown");
  }, []);

  return (
    <div className="relative">
      {/* Blurred teaser of "next turn" */}
      <div className="px-5 pt-4 pb-2 select-none pointer-events-none" aria-hidden>
        <div className="blur-sm opacity-60 space-y-2">
          <div className="h-3 rounded bg-muted/80 w-5/6" />
          <div className="h-3 rounded bg-muted/80 w-4/6" />
          <div className="h-3 rounded bg-muted/80 w-3/4" />
        </div>
      </div>

      <div className="border-t border-border bg-gradient-to-b from-card/80 to-card p-5 md:p-6 rounded-b-2xl">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-2">
          <Lock className="h-3.5 w-3.5" />
          You've used your 2 free turns
        </div>
        <h3 className="font-display text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
          Sign up to keep going — free.
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          We'll save this session to your account so you don't lose your work.
        </p>

        <ul className="mt-4 space-y-2">
          {BULLETS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2.5 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-foreground/90">{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          <Button
            size="lg"
            className="rounded-lg h-12 text-base font-semibold gap-2 flex-1"
            onClick={() => {
              trackCTA("signup", "lite-soft-wall");
              trackEvent("lite_wall_signup_click");
              onOpenAuth();
            }}
          >
            Continue free <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-lg h-12 text-base font-medium flex-1"
            onClick={() => trackCTA("pricing", "lite-soft-wall")}
          >
            <Link to="/pricing">See pricing</Link>
          </Button>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground text-center">
          No credit card · Cancel anytime
        </p>
      </div>
    </div>
  );
}
