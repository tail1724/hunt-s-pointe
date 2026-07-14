import { useState, useRef } from "react";
import { Check, Loader2, Zap, Shield, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from "@/lib/constants";

type Stage = "idle" | "focused" | "processing" | "pulsing" | "success";

const BENEFITS = [
  "Full access to all platform modules.",
  "Priority processing on the core engine.",
  "Lifetime founding member badge and permanent price lock.",
  "Private community access with the founding team.",
];

const WHY_WAIT = [
  {
    icon: Zap,
    title: "Deterministic Output",
    copy: "What you configure is what you get. No surprises.",
  },
  {
    icon: Sparkles,
    title: "Premium Models Only",
    copy: "We use the latest and most capable models. No basic tiers.",
  },
  {
    icon: Shield,
    title: "Founder's Guarantee",
    copy: "You are building the future of this platform with us.",
  },
];

export function PricingSection() {
  const [stage, setStage] = useState<Stage>("idle");
  const [email, setEmail] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setStage("processing");
    setTimeout(() => setStage("pulsing"), 500);

    const { error } = await supabase.from("waitlist" as any).insert({ email: trimmed } as any);

    setTimeout(() => {
      if (error && error.code === "23505") {
        toast({ title: "You're already on the list!", description: "We'll be in touch soon." });
      } else if (error) {
        toast({ title: "Something went wrong.", description: error.message, variant: "destructive" });
        setStage("idle");
        return;
      }
      setStage("success");
    }, 2500);
  };

  const cardBorderClass = {
    idle: "border-accent/10 shadow-[var(--shadow-card)]",
    focused: "border-primary shadow-[0_0_20px_hsl(18_100%_60%/0.25)]",
    processing: "border-primary shadow-[0_0_20px_hsl(18_100%_60%/0.25)]",
    pulsing: "border-transparent",
    success: "border-primary shadow-[var(--glow-zest)] animate-[success-reveal_0.8s_forwards]",
  }[stage];

  return (
    <section className="py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        {/* Headline */}
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Get Early Access. Secure Your Slot.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {APP_NAME} is currently in invite-only development. We are onboarding{" "}
            <span className="font-semibold text-foreground">500 Founding Members</span> for our Alpha Launch.
          </p>
        </div>

        {/* Waitlist Card */}
        <div className="max-w-lg mx-auto">
          <div
            className={`relative rounded-lg bg-card p-8 border-2 transition-all duration-500 ${cardBorderClass} ${
              stage === "pulsing" ? "border-pulse-wrapper" : ""
            }`}
          >
            {stage === "pulsing" && (
              <div className="absolute inset-0 rounded-lg border-pulse pointer-events-none" style={{ padding: "2px" }}>
                <div className="h-full w-full rounded-[6px] bg-card" />
              </div>
            )}

            <div className="relative z-10">
              {stage !== "success" ? (
                <>
                  <div className="inline-flex items-center gap-2 rounded-full bg-secondary/10 px-4 py-1.5 mb-6">
                    <Shield className="h-4 w-4 text-secondary-foreground" />
                    <span className="text-sm font-semibold text-secondary-foreground">Early Access Tier: $0</span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-foreground mb-1">Be the first to try it.</h3>

                  <ul className="mt-4 space-y-2">
                    {BENEFITS.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 flex flex-col sm:flex-row gap-2">
                    <Input
                      ref={inputRef}
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => stage === "idle" && setStage("focused")}
                      onBlur={() => stage === "focused" && setStage("idle")}
                      disabled={stage === "processing" || stage === "pulsing"}
                      className="flex-1 border-input focus-visible:ring-primary focus-visible:border-primary transition-all"
                    />
                    <Button
                      onClick={handleSubmit}
                      disabled={stage === "processing" || stage === "pulsing"}
                      className="rounded-lg shadow-lg hover:shadow-xl hover:brightness-110 whitespace-nowrap"
                    >
                      {stage === "processing" || stage === "pulsing" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing…
                        </>
                      ) : (
                        "Request Early Access"
                      )}
                    </Button>
                  </div>

                  <p className="mt-3 text-xs text-muted-foreground text-center">
                    Only <span className="font-semibold text-foreground">142 slots remaining</span> for the Alpha cohort.
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center text-center py-6 animate-fade-in">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-4">
                    <Check className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    Slot Secured. Welcome Aboard.
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Check your email for your access token.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Why Wait? */}
        <div className="mt-24 text-center">
          <h3 className="font-display text-2xl font-bold text-foreground mb-10">Why Wait?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {WHY_WAIT.map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-display font-bold text-foreground">{item.title}</h4>
                <p className="mt-2 text-sm text-muted-foreground">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
