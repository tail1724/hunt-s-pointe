import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UsageTab from "@/components/analytics/UsageTab";
import CreditsTab from "@/components/analytics/CreditsTab";
import HistoryTab from "@/components/analytics/HistoryTab";
import SafetyTab from "@/components/analytics/SafetyTab";

const VALID_TABS = ["usage", "credits", "history", "safety"] as const;
type TabKey = (typeof VALID_TABS)[number];

export default function Analytics() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab");
  // "cost" was the old name for this tab; keep old links working.
  const normalized = raw === "cost" ? "credits" : raw;
  const active: TabKey = (VALID_TABS as readonly string[]).includes(normalized || "") ? (normalized as TabKey) : "usage";

  // Normalize the URL when an invalid or legacy tab is supplied.
  useEffect(() => {
    if (raw && !(VALID_TABS as readonly string[]).includes(raw)) {
      setParams({ tab: active }, { replace: true });
    }
  }, [raw, active, setParams]);

  const onChange = (next: string) => {
    setParams({ tab: next }, { replace: false });
  };

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/[0.06] to-transparent"
      />
      <div className="relative mx-auto max-w-6xl space-y-6 p-4 md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">Understand what you're doing, the credits you're using, and where you've been.</p>
          </div>
          <Tabs value={active} onValueChange={onChange}>
            <TabsList className="h-9 rounded-full bg-muted/70 p-1">
              <TabsTrigger value="usage" className="rounded-full px-4 text-xs data-[state=active]:shadow-sm">Usage</TabsTrigger>
              <TabsTrigger value="credits" className="rounded-full px-4 text-xs data-[state=active]:shadow-sm">Credits</TabsTrigger>
              <TabsTrigger value="history" className="rounded-full px-4 text-xs data-[state=active]:shadow-sm">History</TabsTrigger>
              <TabsTrigger value="safety" className="rounded-full px-4 text-xs data-[state=active]:shadow-sm">Safety</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {active === "usage" && <UsageTab />}
        {active === "credits" && <CreditsTab />}
        {active === "history" && <HistoryTab />}
        {active === "safety" && <SafetyTab />}
      </div>
    </div>
  );
}
