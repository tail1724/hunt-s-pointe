import { Megaphone, Image, Video, Music } from "lucide-react";

const MOCK_ASSETS = [
  { type: "Image", count: 24, icon: Image },
  { type: "Video", count: 8, icon: Video },
  { type: "Audio", count: 12, icon: Music },
];

export function CampaignSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Built for Professionals, <span className="text-primary">Not Hobbyists.</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Save project personas to ensure
              every output maintains a perfect match across all assets.
            </p>
          </div>

          {/* Mock campaign card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-sm">Project Alpha</h3>
                <p className="text-xs text-muted-foreground">Sample project campaign</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {MOCK_ASSETS.map((a) => (
                <div key={a.type} className="rounded-lg bg-muted/50 p-3 text-center">
                  <a.icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="font-display text-lg font-bold">{a.count}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{a.type}s</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {["Tag One", "Tag Two", "Tag Three"].map((tag) => (
                <span key={tag} className="text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
