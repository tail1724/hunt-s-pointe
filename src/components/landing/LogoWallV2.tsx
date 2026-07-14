import { Reveal } from "./Reveal";

// No invented company names here — we don't have named customers to show yet
// (see FoundingChurches on /customers for why). These rows describe real
// ministry roles/segments the product is built for, not specific accounts.
// Swap ROWS' `label` + `items` per vertical if this is reused elsewhere.
const ROWS = [
  {
    label: "Solo & bivocational",
    items: ["Solo pastors", "Bivocational pastors", "Church planters", "Interim pastors", "Pulpit supply"],
  },
  {
    label: "Teams & staff",
    items: ["Multi-site staff", "Teaching pastors", "Associate pastors", "Small group leaders", "Youth pastors"],
  },
  {
    label: "Study & training",
    items: ["Seminary students", "Bible study leaders", "Chaplains", "Campus ministers", "Lay teachers"],
  },
];

function RoleBadge({ name }: { name: string }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground/90">
      {name}
    </span>
  );
}

export function LogoWallV2() {
  return (
    <section className="py-16 md:py-20 border-b border-border">
      <div className="max-w-6xl mx-auto px-6">
        <Reveal>
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-10">
            Built for every kind of ministry
          </p>
        </Reveal>
      </div>
      <div className="space-y-6 md:space-y-8">
        {ROWS.map((row, rowIdx) => {
          const doubled = [...row.items, ...row.items];
          return (
            <Reveal key={row.label} delay={rowIdx * 100}>
              <div className="flex flex-col items-center gap-3">
                <span className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
                  {row.label}
                </span>
                <div className="w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                  <div className="marquee-slow flex w-max items-center gap-x-4">
                    {doubled.map((item, i) => (
                      <RoleBadge key={`${item}-${i}`} name={item} />
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
