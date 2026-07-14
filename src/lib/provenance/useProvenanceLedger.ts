import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { verifyChain } from "./hashChain";

export interface ProvenanceRow {
  id: string;
  document_id: string;
  seal_hash: string;
  prev_hash: string | null;
  active_seconds: number;
  keystroke_count: number;
  backspace_count: number;
  sealed_at: string;
}

export function useProvenanceLedger(documentId: string | null) {
  const { user } = useAuth();
  const [rows, setRows] = useState<ProvenanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [chainIntact, setChainIntact] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    if (!user || !documentId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("provenance_ledger" as any)
      .select("*")
      .eq("document_id", documentId)
      .eq("user_id", user.id)
      .order("sealed_at", { ascending: true });
    const list = ((data ?? []) as unknown) as ProvenanceRow[];
    setRows(list);
    const verdict = await verifyChain(list.map((r) => ({
      document_id: r.document_id,
      keystroke_count: r.keystroke_count,
      backspace_count: r.backspace_count,
      active_seconds: r.active_seconds,
      prev_hash: r.prev_hash,
      seal_hash: r.seal_hash,
    })));
    setChainIntact(list.length > 0 ? verdict.intact : null);
    setLoading(false);
  }, [user, documentId]);

  useEffect(() => { load(); }, [load]);

  const totals = rows.reduce(
    (acc, r) => ({
      activeSeconds: acc.activeSeconds + r.active_seconds,
      keystrokes: acc.keystrokes + r.keystroke_count,
      backspaces: acc.backspaces + r.backspace_count,
    }),
    { activeSeconds: 0, keystrokes: 0, backspaces: 0 },
  );

  return { rows, loading, chainIntact, totals, reload: load };
}
