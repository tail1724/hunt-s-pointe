import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackCTA } from "@/lib/track";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    setStatus("loading");
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: trimmed, source: "newsletter" } as never);

    if (error && error.code !== "23505") {
      toast({ title: "Something went wrong.", description: error.message, variant: "destructive" });
      setStatus("idle");
      return;
    }
    trackCTA("newsletter-subscribe", "footer");
    setStatus("success");
  };

  return (
    <section className="py-10 md:py-12 px-5 border-t border-border bg-card/40">
      <div className="max-w-2xl mx-auto text-center">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
          <Mail className="h-5 w-5" />
        </div>
        <h3 className="font-display text-xl md:text-2xl font-bold text-foreground">
          Stay in the loop
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Monthly updates on features, stories, and product thinking. No spam, ever.
        </p>

        {status !== "success" ? (
          <form onSubmit={handleSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              required
              className="flex-1 h-11 text-base"
              aria-label="Email address"
            />
            <Button
              type="submit"
              disabled={status === "loading"}
              className="rounded-lg whitespace-nowrap h-11"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Subscribing…
                </>
              ) : (
                "Subscribe"
              )}
            </Button>
          </form>
        ) : (
          <div className="mt-6 inline-flex items-center gap-2 text-sm text-primary font-medium">
            <Check className="h-4 w-4" /> You're in. Watch your inbox.
          </div>
        )}
      </div>
    </section>
  );
}
