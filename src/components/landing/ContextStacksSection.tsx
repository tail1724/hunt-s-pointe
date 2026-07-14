import { useState } from "react";
import { cn } from "@/lib/utils";
import { Box, Palette, Eye, Layers } from "lucide-react";

const STACKS = [
  {
    name: "Module A",
    icon: Box,
    category: "Processing",
    before: "Lorem ipsum dolor sit amet.",
    after: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam.",
  },
  {
    name: "Module B",
    icon: Palette,
    category: "Styling",
    before: "Consectetur adipiscing elit.",
    after: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.",
  },
  {
    name: "Module C",
    icon: Eye,
    category: "Analysis",
    before: "Sed do eiusmod tempor.",
    after: "Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit.",
  },
  {
    name: "Module D",
    icon: Layers,
    category: "Integration",
    before: "Ut labore et dolore magna.",
    after: "Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Maecenas faucibus mollis interdum.",
  },
];

export function ContextStacksSection() {
  const [active, setActive] = useState(0);

  return (
    <section id="features" className="py-24 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
            Modular Architecture. <span className="text-primary">Plug and Play.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pre-built modules you can mix and match.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Cards */}
          <div className="grid grid-cols-2 gap-3">
            {STACKS.map((s, i) => (
              <button
                key={s.name}
                onClick={() => setActive(i)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border p-3 md:p-5 transition-all text-center",
                  active === i
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border bg-card hover:border-primary/30"
                )}
              >
                <s.icon className={cn("h-6 w-6", active === i ? "text-primary" : "text-muted-foreground")} />
                <span className="font-display text-sm font-bold">{s.name}</span>
                <span className="text-[10px] md:text-[11px] text-muted-foreground uppercase tracking-wider">{s.category}</span>
              </button>
            ))}
          </div>

          {/* Before / After */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">Input</div>
              <p className="font-mono text-sm text-muted-foreground">{STACKS[active].before}</p>
            </div>
            <div className="rounded-lg border border-primary/30 bg-card p-4 shadow-sm">
              <div className="text-[10px] uppercase tracking-widest text-primary font-semibold mb-2">
                + {STACKS[active].name}
              </div>
              <p className="font-mono text-xs text-foreground leading-relaxed">{STACKS[active].after}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
