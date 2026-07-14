import { useState, useRef } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { APP_NAME } from "@/lib/constants";

export function FooterCTA() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ title: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setStatus("loading");

    const { error } = await supabase.from("waitlist").insert({ email: trimmed });

    if (error && error.code === "23505") {
      toast({ title: "You're already on the list!", description: "We'll be in touch soon." });
    } else if (error) {
      toast({ title: "Something went wrong.", description: error.message, variant: "destructive" });
      setStatus("idle");
      return;
    }

    setStatus("success");
  };

  return (
    <section className="py-20 px-6 bg-primary/5 border-t border-border">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
          Ready to Get Started?
        </h2>
        <p className="mt-3 text-muted-foreground text-lg">
          Join the waitlist and be among the first to access {APP_NAME}.
        </p>

        {status !== "success" ? (
          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <Input
              ref={inputRef}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={status === "loading"}
              className="flex-1 border-input focus-visible:ring-primary focus-visible:border-primary"
            />
            <Button
              onClick={handleSubmit}
              disabled={status === "loading"}
              className="rounded-lg shadow-lg hover:shadow-xl hover:brightness-110 whitespace-nowrap"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining…
                </>
              ) : (
                "Join the Waitlist"
              )}
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center animate-fade-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary mb-3">
              <Check className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <p className="font-display text-xl font-bold text-foreground">You're on the list!</p>
            <p className="mt-1 text-sm text-muted-foreground">We'll reach out when your slot is ready.</p>
          </div>
        )}
      </div>
    </section>
  );
}
