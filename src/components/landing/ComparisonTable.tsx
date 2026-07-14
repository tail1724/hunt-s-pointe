import { Reveal } from "./Reveal";
import { vertical } from "@/config/vertical";
import { Check, X } from "lucide-react";
import { APP_NAME } from "@/lib/constants";

function Cell({ value, highlight }: { value: boolean | string; highlight?: boolean }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className={`h-5 w-5 mx-auto ${highlight ? "text-primary" : "text-foreground/60"}`} />
    ) : (
      <X className="h-5 w-5 mx-auto text-muted-foreground/40" />
    );
  }
  return (
    <span
      className={`text-xs md:text-sm ${highlight ? "font-semibold text-foreground" : "text-muted-foreground"}`}
    >
      {value}
    </span>
  );
}

function MobileValue({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="h-4 w-4 text-primary" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground/40" />
    );
  }
  return <span className="text-xs font-medium">{value}</span>;
}

export function ComparisonTable() {
  const { comparison } = vertical;
  return (
    <section className="py-14 md:py-28 px-5 md:px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10 md:mb-12">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              How we <span className="text-primary">stack up</span>.
            </h2>
            <p className="mt-3 md:mt-4 text-muted-foreground text-base md:text-lg">
              An honest comparison against the alternatives.
            </p>
          </div>
        </Reveal>

        {/* Desktop table */}
        <Reveal delay={120}>
          <div className="hidden md:block overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-semibold text-foreground w-1/2">Feature</th>
                  <th className="text-center p-4 font-display font-bold text-primary bg-primary/5 border-x border-primary/20">
                    {APP_NAME}
                  </th>
                  <th className="text-center p-4 font-display font-semibold text-muted-foreground">
                    {comparison.altA}
                  </th>
                  <th className="text-center p-4 font-display font-semibold text-muted-foreground">
                    {comparison.altB}
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={`border-t border-border ${i % 2 === 0 ? "bg-card" : "bg-background"}`}
                  >
                    <td className="p-4 text-foreground/90 font-medium">{row.feature}</td>
                    <td className="p-4 text-center bg-primary/5 border-x border-primary/10">
                      <Cell value={row.us} highlight />
                    </td>
                    <td className="p-4 text-center">
                      <Cell value={row.altA} />
                    </td>
                    <td className="p-4 text-center">
                      <Cell value={row.altB} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile stacked cards */}
          <div className="md:hidden space-y-3">
            {comparison.rows.map((row) => (
              <div
                key={row.feature}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <div className="px-4 py-3 bg-muted/40 border-b border-border text-sm font-semibold text-foreground">
                  {row.feature}
                </div>
                <div className="grid grid-cols-3 divide-x divide-border text-center">
                  <div className="p-3 bg-primary/5">
                    <div className="text-[10px] uppercase tracking-widest text-primary font-bold mb-1.5">
                      {APP_NAME}
                    </div>
                    <div className="flex items-center justify-center min-h-6">
                      <MobileValue value={row.us} />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5 truncate">
                      {comparison.altA}
                    </div>
                    <div className="flex items-center justify-center min-h-6 text-muted-foreground">
                      <MobileValue value={row.altA} />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1.5 truncate">
                      {comparison.altB}
                    </div>
                    <div className="flex items-center justify-center min-h-6 text-muted-foreground">
                      <MobileValue value={row.altB} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
