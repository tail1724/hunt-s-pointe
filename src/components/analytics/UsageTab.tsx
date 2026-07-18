import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3, Zap, Image, RefreshCw, ThumbsUp, ThumbsDown, Activity,
  MessagesSquare, Gauge, PenLine, Hexagon, Wand2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { StatTile, ChartCard, ChartTooltip, VizEmpty } from "./ChartKit";
import { useChartTheme } from "@/lib/analytics/chart-theme";

const EVENT_ICONS: Record<string, typeof Zap> = {
  partner_message: MessagesSquare,
  orchestration: Zap,
  refinement: RefreshCw,
  image_generation: Image,
  document: PenLine,
};

function eventIcon(type: string) {
  const key = Object.keys(EVENT_ICONS).find((k) => type.includes(k.split("_")[0]));
  return key ? EVENT_ICONS[key] : Activity;
}

export default function UsageTab() {
  const { user } = useAuth();
  const chart = useChartTheme();
  const [stats, setStats] = useState({
    totalOrchestrations: 0,
    totalGenerations: 0,
    totalRefinements: 0,
    avgAccuracy: 0,
    votesUp: 0,
    votesDown: 0,
    avgRefinementsPerPrompt: 0,
    partnerSessions: 0,
    delta30: 0,
  });
  const [dailyData, setDailyData] = useState<{ date: string; count: number }[]>([]);
  const [modeData, setModeData] = useState<{ name: string; value: number }[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [historyRes, gensRes, feedbackRes, logsRes] = await Promise.all([
        supabase.from("prompt_history").select("id, created_at, mode").eq("user_id", user.id),
        supabase.from("generations").select("id").eq("user_id", user.id),
        supabase.from("prompt_feedback" as any).select("*").eq("user_id", user.id),
        supabase.from("usage_logs" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      ]);

      const history = historyRes.data || [];
      const gens = gensRes.data || [];
      const feedback = (feedbackRes.data || []) as any[];
      const logs = (logsRes.data || []) as any[];

      const refinements = feedback.filter((f: any) => f.corrective_input);
      const scores = feedback.filter((f: any) => f.accuracy_score != null).map((f: any) => f.accuracy_score);
      const avgScore = scores.length > 0 ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10 : 0;
      const votesUp = feedback.filter((f: any) => f.vote === "up").length;
      const votesDown = feedback.filter((f: any) => f.vote === "down").length;
      const partnerMessages = logs.filter((l: any) => l.event_type === "partner_message").length;
      const avgRef = history.length > 0 ? Math.round((refinements.length / history.length) * 10) / 10 : 0;

      // Momentum: this 30-day window vs the previous one.
      const now = Date.now();
      const d30 = subDays(new Date(), 30).getTime();
      const d60 = subDays(new Date(), 60).getTime();
      const inWindow = (ts: string, from: number, to: number) => {
        const t = new Date(ts).getTime();
        return t >= from && t < to;
      };
      const recent30 = history.filter((h) => inWindow(h.created_at, d30, now)).length;
      const prior30 = history.filter((h) => inWindow(h.created_at, d60, d30)).length;

      setStats({
        totalOrchestrations: history.length,
        totalGenerations: gens.length,
        totalRefinements: refinements.length,
        avgAccuracy: avgScore,
        votesUp,
        votesDown,
        avgRefinementsPerPrompt: avgRef,
        partnerSessions: partnerMessages,
        delta30: recent30 - prior30,
      });

      const last30 = Array.from({ length: 30 }, (_, i) => {
        const d = startOfDay(subDays(new Date(), 29 - i));
        return { date: format(d, "MMM d"), count: 0, _date: d };
      });
      history.forEach((h: any) => {
        const hd = startOfDay(new Date(h.created_at));
        const entry = last30.find((d) => d._date.getTime() === hd.getTime());
        if (entry) entry.count++;
      });
      setDailyData(last30.map(({ date, count }) => ({ date, count })));

      const modes: Record<string, number> = {};
      history.forEach((h: any) => {
        modes[h.mode] = (modes[h.mode] || 0) + 1;
      });
      setModeData(
        Object.entries(modes)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
      );

      setRecentLogs(logs);
      setLoading(false);
    })();
  }, [user]);

  const modeTotal = useMemo(() => modeData.reduce((s, m) => s + m.value, 0), [modeData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-xl bg-muted/40 lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-xl bg-muted/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Primary activity tiles */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Studies run"
          value={stats.totalOrchestrations}
          icon={Zap}
          delta={stats.delta30}
          className="rise-in"
          style={{ "--stagger-i": 0 } as React.CSSProperties}
        />
        <StatTile label="PressRoom messages" value={stats.partnerSessions} icon={MessagesSquare} className="rise-in" style={{ "--stagger-i": 1 } as React.CSSProperties} />
        <StatTile label="Generations" value={stats.totalGenerations} icon={Image} className="rise-in" style={{ "--stagger-i": 2 } as React.CSSProperties} />
        <StatTile label="Refinements" value={stats.totalRefinements} icon={RefreshCw} upIsGood={false} className="rise-in" style={{ "--stagger-i": 3 } as React.CSSProperties} />
      </div>

      {/* Quality strip */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Avg accuracy" value={stats.avgAccuracy ? `${stats.avgAccuracy}` : "—"} hint={stats.avgAccuracy ? "/ 10" : undefined} icon={Gauge} className="rise-in" style={{ "--stagger-i": 4 } as React.CSSProperties} />
        <StatTile label="Upvotes" value={stats.votesUp} icon={ThumbsUp} className="rise-in" style={{ "--stagger-i": 5 } as React.CSSProperties} />
        <StatTile label="Downvotes" value={stats.votesDown} icon={ThumbsDown} upIsGood={false} className="rise-in" style={{ "--stagger-i": 6 } as React.CSSProperties} />
        <StatTile label="Refinements / study" value={stats.avgRefinementsPerPrompt} icon={BarChart3} className="rise-in" style={{ "--stagger-i": 7 } as React.CSSProperties} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <ChartCard
          title="Activity"
          subtitle="Studies per day, last 30 days"
          className="lg:col-span-2"
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={chart.grid} strokeWidth={1} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: chart.tick }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: chart.tick }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: chart.grid, opacity: 0.4 }}
                  content={<ChartTooltip theme={chart} />}
                />
                <Bar
                  dataKey="count"
                  name="Studies"
                  fill={chart.series[0]}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Mode distribution" subtitle="Share of studies by mode">
          {modeData.length > 0 ? (
            <div className="flex h-64 flex-col">
              <div className="relative flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="62%"
                      outerRadius="88%"
                      paddingAngle={2}
                      stroke={chart.surface}
                      strokeWidth={2}
                    >
                      {modeData.map((_, i) => (
                        <Cell key={i} fill={chart.series[i % chart.series.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip theme={chart} />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-bold text-foreground">{modeTotal}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">total</span>
                </div>
              </div>
              <ul className="mt-3 space-y-1 px-2">
                {modeData.slice(0, 4).map((m, i) => (
                  <li key={m.name} className="flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 capitalize text-muted-foreground">
                      <span aria-hidden className="h-2 w-2 rounded-[3px]" style={{ background: chart.series[i % chart.series.length] }} />
                      {m.name}
                    </span>
                    <span className="tabular-nums text-foreground">
                      {m.value} · {modeTotal ? Math.round((m.value / modeTotal) * 100) : 0}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <VizEmpty
              icon={Hexagon}
              title="No studies yet"
              body="Run a study in PressRoom and the breakdown lands here."
              className="h-64"
            />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Recent activity" subtitle="Latest 50 events across the studio">
        {recentLogs.length === 0 ? (
          <VizEmpty
            icon={Wand2}
            title="Nothing logged yet"
            body="Ask PressRoom a question or start a draft in Write — every event shows up here."
          />
        ) : (
          <div className="max-h-80 overflow-y-auto px-2">
            <ol className="relative space-y-0.5">
              {recentLogs.map((log: any) => {
                const Icon = eventIcon(log.event_type);
                return (
                  <li
                    key={log.id}
                    className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-medium capitalize text-foreground">
                        {log.event_type.replaceAll("_", " ")}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {log.metadata?.platform || ""}
                        {log.metadata?.accuracy_score != null ? ` · scored ${log.metadata.accuracy_score}/10` : ""}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {format(new Date(log.created_at), "MMM d, h:mm a")}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
