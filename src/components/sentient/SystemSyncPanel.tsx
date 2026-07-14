import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RefreshCw, X } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SyncData {
  harmony_score: number;
  workflow_delta: { label: string; value: number }[];
  resource_allocation: { label: string; value: number }[];
}

// Generate sine-wave data for the Harmony Wave
function generateHarmonyWave(energy: number) {
  return Array.from({ length: 30 }, (_, i) => ({
    x: i,
    y: Math.sin(i * 0.4) * energy * 50 + 50 + Math.sin(i * 0.7) * energy * 20,
  }));
}

export function SystemSyncPanel({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<SyncData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSync = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData.session?.access_token;
      if (!token) { setLoading(false); return; }
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sentient-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );
      if (resp.ok) setData(await resp.json());
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSync(); }, [user]);

  const harmonyPct = data?.harmony_score ?? 0;
  const harmonyWave = generateHarmonyWave(harmonyPct / 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold">Biometric Sync</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchSync} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Biometric Harmony — Sine Wave */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Biometric Harmony
          </p>
          <motion.span
            className="text-lg font-bold font-mono text-primary"
            key={harmonyPct}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            {harmonyPct}
          </motion.span>
        </div>
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={harmonyWave}>
              <defs>
                <linearGradient id="harmonyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#harmonyGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Neural Pathway Delta */}
      {data?.workflow_delta && data.workflow_delta.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
            Neural Pathway Delta
          </p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.workflow_delta}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="hsl(var(--primary) / 0.1)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Metabolic Distribution */}
      {data?.resource_allocation && data.resource_allocation.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wider">
            Metabolic Distribution
          </p>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.resource_allocation}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ fontSize: 10 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} animationDuration={1200} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
