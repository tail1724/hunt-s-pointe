import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const BLOCKS = [
  { label: "Step 1", color: "bg-primary text-primary-foreground", order: [3, 0] },
  { label: "Step 2", color: "bg-secondary text-secondary-foreground", order: [0, 1] },
  { label: "Step 3", color: "bg-accent text-accent-foreground", order: [1, 2] },
  { label: "Step 4", color: "bg-muted text-foreground", order: [4, 3] },
  { label: "Step 5", color: "bg-destructive text-destructive-foreground", order: [2, 4] },
];

export function WHPSection() {
  const [sorted, setSorted] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setSorted((s) => !s), 2500);
    return () => clearInterval(interval);
  }, []);

  const items = [...BLOCKS].sort((a, b) => {
    const idx = sorted ? 1 : 0;
    return a.order[idx] - b.order[idx];
  });

  return (
    <section id="how-it-works" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Powered by the{" "}
              <span className="text-primary">Smart Processing Engine.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-4">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Our proprietary engine
              ensures your input remains the priority, while metadata is algorithmically
              front-loaded for maximum output adherence.
            </p>
            <p className="text-muted-foreground text-sm">
              Watch the blocks rearrange into their optimal processing order.
            </p>
          </div>

          {/* Animated blocks */}
          <div className="flex flex-col gap-3">
            {items.map((block) => (
              <div
                key={block.label}
                className={cn(
                  "rounded-lg px-5 py-3 font-display text-sm font-bold transition-all duration-700 ease-in-out",
                  block.color
                )}
              >
                {block.label}
                {block.label === "Step 1" && sorted && (
                  <span className="ml-2 text-xs font-normal opacity-70">← Always first</span>
                )}
              </div>
            ))}
            <div className="text-center mt-2">
              <span className={cn(
                "text-xs font-mono transition-colors",
                sorted ? "text-primary" : "text-muted-foreground"
              )}>
                {sorted ? "✓ Optimized" : "⟳ Unoptimized order..."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
