import { Sparkles, Layers, Target, Globe, Shield, Zap } from "lucide-react";
import { Reveal } from "./Reveal";

const TILES = [
  {
    icon: Sparkles,
    title: "PressRoom research partner",
    blurb: "A conversational theological research partner that surfaces passages, commentaries, and cross-references — so you can preach your own words.",
    span: "md:col-span-2 md:row-span-2",
    feature: true,
  },
  {
    icon: Target,
    title: "Word-processor for sermons",
    blurb: "A real document editor with focus mode, autosave, and print-ready formatting. Built for sermon prep, not for notes.",
    span: "md:col-span-2",
  },
  {
    icon: Layers,
    title: "Collections",
    blurb: "Upload commentaries, style guides, and your own past sermons. PressRoom grounds every answer in the context you've built.",
    span: "md:col-span-2",
  },
  {
    icon: Globe,
    title: "Public-domain translations",
    blurb: "KJV, ASV, WEB, YLT, and BBE — fully searchable. Licensed translations (NIV, ESV, NASB) on the roadmap.",
    span: "md:col-span-2",
  },
  {
    icon: Shield,
    title: "Citations on every answer",
    blurb: "Every scripture quote ships with a parenthetical reference. Every commentary or web source is numbered. No anonymous claims.",
    span: "md:col-span-2",
  },
  {
    icon: Zap,
    title: "Built for church planters",
    blurb: "Designed for pastors without a Master's degree and without a $3,000 Logos library. Depth without the learning curve.",
    span: "md:col-span-2",
  },
];

export function BentoFeatures() {
  return (
    <section id="features" className="py-14 md:py-28 px-5 md:px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              Everything you need.{" "}
              <span className="text-primary">Nothing you don't.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              A focused set of capabilities engineered to work together — not against you.
            </p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-6 md:auto-rows-[minmax(180px,auto)] gap-4">
          {TILES.map((tile, i) => (
            <Reveal key={tile.title} delay={(i % 3) * 80} className={tile.span}>
              <div
                className={`group relative h-full rounded-xl border border-border bg-card p-6 lift overflow-hidden ${
                  tile.feature ? "md:p-8" : ""
                }`}
              >
                {tile.feature && (
                  <div className="absolute inset-0 gradient-mesh opacity-50 pointer-events-none" aria-hidden />
                )}
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary mb-4">
                    <tile.icon className="h-5 w-5 text-primary-foreground" strokeWidth={2} />
                  </div>
                  <h3 className={`font-display font-bold text-foreground ${tile.feature ? "text-2xl" : "text-lg"}`}>
                    {tile.title}
                  </h3>
                  <p className={`mt-2 text-muted-foreground leading-relaxed ${tile.feature ? "text-base" : "text-sm"}`}>
                    {tile.blurb}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
