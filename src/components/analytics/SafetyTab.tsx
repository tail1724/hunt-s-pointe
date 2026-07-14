import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface EventRow {
  id: string;
  function: string;
  category: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  coding: "Programming request",
  academic_dishonesty: "Academic-integrity request",
  bulk_abuse: "Bulk generation",
  prompt_injection: "Prompt injection",
  off_domain: "Off-domain request",
};

const FN_LABELS: Record<string, string> = {
  "prompt-partner": "Ezra chat",
  "write-assist": "Write assistant",
  "generate-image": "Image studio",
};

/**
 * Safety tab — the user-visible face of the guardrail telemetry. Shows when
 * the platform's domain guardrails declined a request on this account, so
 * scope enforcement is transparent rather than mysterious.
 */
export default function SafetyTab() {
  const { user } = useAuth();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("guardrail_events" as never)
      .select("id, function, category, created_at")
      .eq("user_id" as never, user.id as never)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(
        ({ data }) => {
          if (!cancelled) {
            setRows((data as unknown as EventRow[]) ?? []);
            setLoading(false);
          }
        },
        () => {
          // Table not migrated yet — show the clean state.
          if (!cancelled) setLoading(false);
        },
      );
    return () => { cancelled = true; };
  }, [user]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold">Domain guardrails</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ezra Research is scoped to ministry work — Scripture study, sermon prep, pastoral care, and
              congregational communications. Requests outside that scope (coding, graded coursework,
              bulk content) are declined automatically, per the{" "}
              <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms of Service</Link>.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
          <h3 className="font-display text-base font-semibold">All clear</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            No requests on this account have been declined by the guardrails.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Surface</th>
                <th className="px-4 py-2.5 font-medium">Declined as</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(r.created_at))} ago
                  </td>
                  <td className="px-4 py-2.5">{FN_LABELS[r.function] ?? r.function}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs">
                      {CATEGORY_LABELS[r.category] ?? r.category}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
