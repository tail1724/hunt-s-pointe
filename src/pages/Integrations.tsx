import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plug, Zap, MessageSquare, FileText, Cog, Key, Send, ArrowRight,
  MessagesSquare, PenLine, Archive, FolderOpen, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// What already works together inside the studio — surfaced here so the
// integrations page leads with real capability, not a waitlist.
const INTERNAL_FLOWS = [
  {
    title: "Ezra → Write",
    desc: "Drafts Ezra produces become documents in one click, ready for the editor.",
    href: "/app/ezra",
    cta: "Open Ezra",
    icons: [MessagesSquare, PenLine],
  },
  {
    title: "Collections → everywhere",
    desc: "Activate a collection and its notes, files, and links ride along in Ezra and Write.",
    href: "/app/knowledge",
    cta: "Open Collections",
    icons: [FolderOpen, ArrowRight],
  },
  {
    title: "Auto-filing → File Cabinet",
    desc: "Every draft is filed automatically. Nothing you write gets lost between sessions.",
    href: "/app/file-cabinet",
    cta: "Open File Cabinet",
    icons: [PenLine, Archive],
  },
];

const EXTERNAL = [
  { name: "Zapier", desc: "Connect to 5,000+ apps with automated workflows.", icon: Zap, tint: "bg-[hsl(24_95%_53%/0.12)] text-[hsl(24_95%_43%)] dark:text-[hsl(24_95%_62%)]" },
  { name: "Slack", desc: "Send prompts and outputs directly to your Slack channels.", icon: MessageSquare, tint: "bg-[hsl(291_45%_45%/0.12)] text-[hsl(291_45%_40%)] dark:text-[hsl(291_50%_70%)]" },
  { name: "Notion", desc: "Sync your knowledge base and prompts with Notion pages.", icon: FileText, tint: "bg-muted text-foreground/70" },
  { name: "Make", desc: "Build complex automation scenarios with Make (Integromat).", icon: Cog, tint: "bg-[hsl(262_70%_55%/0.12)] text-[hsl(262_60%_50%)] dark:text-[hsl(262_70%_72%)]" },
  { name: "API Access", desc: "Programmatic access to all platform features via REST API.", icon: Key, tint: "bg-primary/10 text-primary" },
];

export default function Integrations() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requested, setRequested] = useState(false);

  const handleRequest = async () => {
    if (!email.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from("waitlist").insert({ email });
    if (error) toast.error(error.message);
    else {
      setRequested(true);
      setEmail("");
      toast.success("You're on the list — we'll email you at launch.");
    }
    setSubmitting(false);
  };

  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.06] to-transparent" />
      <div className="relative mx-auto max-w-4xl space-y-8 p-4 md:p-8">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">Integrations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The studio already works as one — and outside connections are on the way.
          </p>
        </div>

        {/* Working today */}
        <section>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Working together today
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {INTERNAL_FLOWS.map((flow, i) => {
              const [IconA, IconB] = flow.icons;
              return (
                <Link
                  key={flow.title}
                  to={flow.href}
                  className="group flex flex-col rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] card-elevate accent-draw rise-in"
                  style={{ "--stagger-i": i } as React.CSSProperties}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <IconA className="h-4 w-4" />
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/60" />
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <IconB className="h-4 w-4" />
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[hsl(150_60%_40%/0.12)] px-2 py-0.5 text-[10px] font-medium text-[hsl(150_60%_30%)] dark:text-[hsl(150_55%_55%)]">
                      <Check className="h-2.5 w-2.5" /> Live
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-sm font-semibold text-foreground">{flow.title}</h3>
                  <p className="mt-1 flex-1 text-xs leading-relaxed text-muted-foreground">{flow.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                    {flow.cta}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Coming soon */}
        <section>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Connected apps — coming soon
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXTERNAL.map((intg, i) => (
              <div
                key={intg.name}
                className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-card)] card-elevate rise-in"
                style={{ "--stagger-i": i + 3 } as React.CSSProperties}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${intg.tint} transition-transform duration-200 group-hover:scale-105`}>
                    <intg.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Coming soon
                  </span>
                </div>
                <h3 className="mt-3 font-display text-sm font-semibold text-foreground">{intg.name}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{intg.desc}</p>
                <Button variant="outline" size="sm" disabled className="mt-3 w-full text-xs">
                  <Plug className="mr-1.5 h-3.5 w-3.5" /> Connect
                </Button>
              </div>
            ))}

            {/* Waitlist card sits in the same grid — it is the 6th tile */}
            <div
              className="flex flex-col justify-between rounded-xl border border-primary/25 bg-primary/[0.04] p-4 rise-in"
              style={{ "--stagger-i": 8 } as React.CSSProperties}
            >
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">Get notified first</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Leave your email and we'll tell you the moment connections open up.
                </p>
              </div>
              {requested ? (
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[hsl(150_60%_30%)] dark:text-[hsl(150_55%_55%)]">
                  <Check className="h-3.5 w-3.5" /> You're on the list
                </p>
              ) : (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRequest(); }}
                    placeholder="your@email.com"
                    type="email"
                    className="h-8 flex-1 bg-card text-xs"
                    aria-label="Email for integration launch notification"
                  />
                  <Button onClick={handleRequest} disabled={submitting || !email.trim()} size="sm" className="h-8 gap-1.5 text-xs">
                    <Send className="h-3 w-3" /> {submitting ? "…" : "Notify"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
