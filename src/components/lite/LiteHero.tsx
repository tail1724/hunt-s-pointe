import { NexusPulse } from "@/components/sentient/NexusPulse";
import { LitePromptChips } from "./LitePromptChips";
import { Star, ShieldCheck, Users } from "lucide-react";

interface LiteHeroProps {
  onPickChip: (prompt: string) => void;
}

export function LiteHero({ onPickChip }: LiteHeroProps) {
  return (
    <section className="px-5 pt-6 pb-4 md:pt-10 md:pb-6 text-center">
      <div className="flex justify-center mb-4">
        <NexusPulse mode="direct" state="idle" inline size={56} />
      </div>
      <h1 className="font-display text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">
        Ask anything. <span className="text-primary">See it shipped.</span>
      </h1>
      <p className="mt-2 md:mt-3 text-sm md:text-base text-muted-foreground max-w-md mx-auto">
        Try Ezra free — no signup needed for your first two turns.
      </p>

      <div className="mt-3 flex items-center justify-center gap-3 text-[11px] md:text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> Built by a Top 1% engineer</span>
        <span className="opacity-40">·</span>
        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> Over 500,000 lines of code</span>
        <span className="opacity-40">·</span>
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Inspired by Donald Knuth</span>
      </div>

      <div className="mt-5 md:mt-6">
        <LitePromptChips onPick={onPickChip} />
      </div>
    </section>
  );
}
