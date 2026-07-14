import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, Gauge, Sparkles, Lightbulb, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LabelList } from "recharts";
import { format, subDays, startOfDay, startOfMonth, startOfMonth as sOM, addMonths, differenceInCalendarDays } from "date-fns";
import {
  CREDITS_PER_EVENT, BUCKET_LABELS, FEATURE_LABELS, PLAN_ALLOWANCE,
  formatCredits, type CreditBucket, type FeatureKey,
} from "@/lib/credit-schedule";
import { StatTile, ChartCard, ChartTooltip, VizEmpty } from "./ChartKit";
import { useChartTheme } from "@/lib/analytics/chart-theme";

// Fixed slot order from the validated categorical palette (see chart-theme.ts).
const BUCKET_ORDER: CreditBucket[] = ["orchestration", "refinement", "partner_message", "image_generation", "other"];

interface Event {
  date: Date;
  bucket: CreditBucket;
  feature: FeatureKey;
  credits: number;
}

function classifyMode(mode: string | null | undefined): FeatureKey {
  if (!mode) return "other";
  const m = mode.toLowerCase();
  if (m.includes("mary") || m.includes("partner")) return "mary";
  if (m.includes("write") || m.includes("doc")) return "write";
  if (m.includes("image") || m.includes("create") || m.includes("generate")) return "create";
  return "sentient";
}

function classifyEvent(eventType: string): FeatureKey {
  const t = (eventType || "").toLowerCase();
  if (t.includes("partner") || t.includes("mary")) return "mary";
  if (t.includes("write") || t.includes("doc")) return "write";
  if (t.includes("image") || t.includes("generation")) return "create";
  if (t.includes("orchestr") || t.includes("refine")) return "sentient";
  return "other";
}

/** Circular credits gauge — used vs. monthly allowance, in the brand brass. */
function CreditsRing({ used, allowance, renews }: { used: number; allowance: number; renews: string }) {
  const pct = Math.min(1, allowance > 0 ? used / allowance : 0);
  const remaining = Math.max(0, allowance - used);
  const R = 76;
  const C = 2 * Math.PI * R;
  const dash = C * pct;
  const over = used > allowance;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:flex-row sm:gap-6">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
          <circle cx="90" cy="90" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
          <circle
            cx="90" cy="90" r={R} fill="none"
            stroke={over ? "hsl(var(--destructive))" : "hsl(var(--accent))"}
            strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`}
            style={{ transition: "stroke-dasharray 700ms cubic-bezier(0.32,0.72,0,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold leading-none text-foreground">{formatCredits(remaining)}</span>
          <span className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">credits left</span>
        </div>
      </div>
      <div className="text-center sm:text-left">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{formatCredits(used)}</span> of {formatCredits(allowance)} used this month
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Renews {renews}</p>
        {over && (
          <p className="mt-2 text-xs font-medium text-destructive">You've used your monthly credits — they refresh on {renews}.</p>
        )}
      </div>
    </div>
  );
}

export default function CreditsTab() {
  const { user } = useAuth();
  const chart = useChartTheme();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Free plan by default — matches the plan label shown elsewhere in the app.
  const allowance = PLAN_ALLOWANCE.free;

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const since = subDays(new Date(), 60).toISOString();
      const [historyRes, gensRes, feedbackRes, logsRes] = await Promise.all([
        supabase.from("prompt_history").select("id, created_at, mode").eq("user_id", user.id).gte("created_at", since),
        supabase.from("generations").select("id, created_at").eq("user_id", user.id).gte("created_at", since),
        supabase.from("prompt_feedback" as any).select("created_at, corrective_input").eq("user_id", user.id).gte("created_at", since),
        supabase.from("usage_logs" as any).select("created_at, event_type").eq("user_id", user.id).gte("created_at", since),
      ]);

      const ev: Event[] = [];
      (historyRes.data || []).forEach((h: any) => ev.push({
        date: new Date(h.created_at), bucket: "orchestration", feature: classifyMode(h.mode), credits: CREDITS_PER_EVENT.orchestration,
      }));
      (gensRes.data || []).forEach((g: any) => ev.push({
        date: new Date(g.created_at), bucket: "image_generation", feature: "create", credits: CREDITS_PER_EVENT.image_generation,
      }));
      (feedbackRes.data as any[] || []).filter((f) => f.corrective_input).forEach((f) => ev.push({
        date: new Date(f.created_at), bucket: "refinement", feature: "sentient", credits: CREDITS_PER_EVENT.refinement,
      }));
      (logsRes.data as any[] || []).forEach((l) => {
        const isPartner = l.event_type === "partner_message";
        ev.push({
          date: new Date(l.created_at),
          bucket: isPartner ? "partner_message" : "other",
          feature: classifyEvent(l.event_type),
          credits: isPartner ? CREDITS_PER_EVENT.partner_message : CREDITS_PER_EVENT.other,
        });
      });

      setEvents(ev);
      setLoading(false);
    })();
  }, [user]);

  const summary = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const monthEvents = events.filter((e) => e.date >= monthStart);
    const monthUsed = monthEvents.reduce((s, e) => s + e.credits, 0);
    const orch = monthEvents.filter((e) => e.bucket === "orchestration");
    const avgPerStudy = orch.length > 0 ? monthUsed / orch.length : 0;
    const byBucket = monthEvents.reduce<Record<string, number>>((acc, e) => { acc[e.bucket] = (acc[e.bucket] || 0) + e.credits; return acc; }, {});
    const topBucket = Object.entries(byBucket).sort((a, b) => b[1] - a[1])[0]?.[0] as CreditBucket | undefined;

    // Pace: project month-end usage from the fraction of the month elapsed.
    const now = new Date();
    const daysElapsed = Math.max(1, differenceInCalendarDays(now, monthStart) + 1);
    const daysInMonth = differenceInCalendarDays(addMonths(sOM(now), 1), sOM(now));
    const projected = Math.round((monthUsed / daysElapsed) * daysInMonth);
    const projectedPct = allowance > 0 ? Math.round((projected / allowance) * 100) : 0;
    const renews = format(addMonths(sOM(now), 1), "MMM d");

    return { monthUsed, avgPerStudy, topBucket, projectedPct, renews };
  }, [events, allowance]);

  const dailyStacked = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = startOfDay(subDays(new Date(), 29 - i));
      return {
        date: format(d, "MMM d"), _date: d,
        orchestration: 0, refinement: 0, partner_message: 0, image_generation: 0, other: 0,
      };
    });
    events.forEach((e) => {
      const ds = startOfDay(e.date).getTime();
      const row = days.find((d) => d._date.getTime() === ds);
      if (row) (row as any)[e.bucket] += e.credits;
    });
    return days.map(({ _date, ...rest }) => rest);
  }, [events]);

  const featureSpend = useMemo(() => {
    const map: Record<FeatureKey, number> = { mary: 0, write: 0, create: 0, sentient: 0, other: 0 };
    events.forEach((e) => { map[e.feature] += e.credits; });
    return (Object.entries(map) as [FeatureKey, number][])
      .map(([k, v]) => ({ name: FEATURE_LABELS[k], value: v }))
      .filter((r) => r.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [events]);

  const tips = useMemo(() => {
    const out: string[] = [];
    if (summary.projectedPct > 0 && summary.projectedPct <= 100) {
      out.push(`At your current pace you'll use about ${summary.projectedPct}% of this month's credits — comfortably within your membership.`);
    } else if (summary.projectedPct > 100) {
      out.push(`At your current pace you're on track to run out before ${summary.renews}. Lowering the Ezra power level on simpler questions stretches your credits further.`);
    }
    const refCount = events.filter((e) => e.bucket === "refinement").length;
    const orchCount = events.filter((e) => e.bucket === "orchestration").length;
    if (orchCount > 0 && refCount / orchCount > 2) {
      out.push(`You're averaging ${(refCount / orchCount).toFixed(1)} refinements per study. Tightening the first prompt usually gets you there for fewer credits.`);
    }
    if (out.length === 0) out.push("Your usage looks healthy. Ezra's power dial lets you spend fewer credits on quick questions and save the deep runs for real exegesis.");
    return out;
  }, [events, summary]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-[220px] animate-pulse rounded-xl bg-muted/40" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground shrink-0"><Sparkles className="h-3 w-3" /> Membership</span>
        <span className="text-xs text-muted-foreground">Your plan includes a monthly pool of credits. Everything you do with Ezra draws from it — nothing here is a separate charge.</span>
      </div>

      <CreditsRing used={summary.monthUsed} allowance={allowance} renews={summary.renews} />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Used this month" value={formatCredits(summary.monthUsed)} icon={Coins} className="rise-in" style={{ "--stagger-i": 0 } as React.CSSProperties} />
        <StatTile label="Remaining" value={formatCredits(Math.max(0, allowance - summary.monthUsed))} icon={Wallet} className="rise-in" style={{ "--stagger-i": 1 } as React.CSSProperties} />
        <StatTile label="Avg / study" value={formatCredits(summary.avgPerStudy)} icon={Gauge} className="rise-in" style={{ "--stagger-i": 2 } as React.CSSProperties} />
        <StatTile label="Top activity" value={summary.topBucket ? BUCKET_LABELS[summary.topBucket] : "—"} icon={Lightbulb} className="rise-in" style={{ "--stagger-i": 3 } as React.CSSProperties} />
      </div>

      <ChartCard title="Credits over time" subtitle="Daily credits used by activity, last 30 days">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyStacked} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={chart.grid} strokeWidth={1} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: chart.tick }} interval={4} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: chart.tick }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: chart.grid, opacity: 0.4 }}
                content={<ChartTooltip theme={chart} formatValue={(v) => `${formatCredits(Number(v))} cr`} />}
              />
              {BUCKET_ORDER.map((k, i) => (
                <Bar
                  key={k}
                  dataKey={k}
                  stackId="credits"
                  name={BUCKET_LABELS[k]}
                  fill={chart.series[i]}
                  stroke={chart.surface}
                  strokeWidth={1}
                  maxBarSize={18}
                  radius={i === BUCKET_ORDER.length - 1 ? [4, 4, 0, 0] : undefined}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-2">
          {BUCKET_ORDER.map((k, i) => (
            <span key={k} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span aria-hidden className="h-2 w-2 rounded-[3px]" style={{ background: chart.series[i] }} />
              {BUCKET_LABELS[k]}
            </span>
          ))}
        </div>
      </ChartCard>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <ChartCard title="Credits by feature" subtitle="Where your credits go">
          {featureSpend.length === 0 ? (
            <VizEmpty icon={Coins} title="No credits used yet" body="Credits appear as soon as you run a study or chat with Ezra." className="h-64" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={featureSpend} layout="vertical" margin={{ left: 16, right: 44, top: 4, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: chart.tick }} width={72} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: chart.grid, opacity: 0.4 }} content={<ChartTooltip theme={chart} formatValue={(v) => `${formatCredits(Number(v))} cr`} />} />
                  <Bar dataKey="value" name="Credits" radius={[0, 4, 4, 0]} maxBarSize={18}>
                    {featureSpend.map((_, i) => <Cell key={i} fill={chart.series[i % chart.series.length]} />)}
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v: number) => formatCredits(v)}
                      style={{ fontSize: 10, fill: chart.tick, fontVariantNumeric: "tabular-nums" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Getting the most from your credits" subtitle="Reading your recent activity">
          <ul className="space-y-3 px-2 pb-1">
            {tips.map((t, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-foreground/90">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-accent/15">
                  <Lightbulb className="h-3 w-3 text-accent" />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
