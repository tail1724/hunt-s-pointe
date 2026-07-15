import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeSealHash } from "./hashChain";

const SEAL_INTERVAL_MS = 90_000;
/** Gaps longer than this don't count as active editing time. */
const IDLE_GAP_MS = 30_000;

/**
 * Background "Proof of Human Work" telemetry (addendum feature 11).
 * Aggregate-only: keystroke and backspace COUNTS, active seconds — never
 * keystroke content. Every ~90s of active editing, the window's counters
 * are sealed into a hash-chained `provenance_ledger` row and reset. Nothing
 * here blocks or slows typing; it's a passive listener on the editor's DOM.
 */
export function useProvenanceTracking(documentId: string | null, editorEl: HTMLElement | null) {
  const { user } = useAuth();
  const keystrokes = useRef(0);
  const backspaces = useRef(0);
  const activeSeconds = useRef(0);
  const lastActivityAt = useRef(Date.now());
  const prevHash = useRef<string | null>(null);
  const prevHashLoaded = useRef(false);

  useEffect(() => {
    prevHashLoaded.current = false;
    if (!documentId || !user) return;
    (async () => {
      const { data } = await supabase
        .from("provenance_ledger" as any)
        .select("seal_hash")
        .eq("document_id", documentId)
        .eq("user_id", user.id)
        .order("sealed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      prevHash.current = (data as any)?.seal_hash ?? null;
      prevHashLoaded.current = true;
    })();
  }, [documentId, user]);

  const seal = useCallback(async () => {
    if (!documentId || !user || !prevHashLoaded.current) return;
    const ks = keystrokes.current;
    const bs = backspaces.current;
    const secs = Math.round(activeSeconds.current);
    if (ks === 0 && secs === 0) return;
    keystrokes.current = 0;
    backspaces.current = 0;
    activeSeconds.current = 0;

    const fields = {
      document_id: documentId,
      keystroke_count: ks,
      backspace_count: bs,
      active_seconds: secs,
      prev_hash: prevHash.current,
    };
    const hash = await computeSealHash(fields);
    const { error } = await supabase.from("provenance_ledger" as any).insert({
      document_id: documentId,
      user_id: user.id,
      seal_hash: hash,
      prev_hash: fields.prev_hash,
      active_seconds: secs,
      keystroke_count: ks,
      backspace_count: bs,
    } as any);
    if (!error) prevHash.current = hash;
  }, [documentId, user]);

  useEffect(() => {
    if (!editorEl) return;
    const onKeydown = () => {
      keystrokes.current += 1;
      const now = Date.now();
      const gap = now - lastActivityAt.current;
      if (gap < IDLE_GAP_MS) activeSeconds.current += gap / 1000;
      lastActivityAt.current = now;
    };
    const onKeyup = (e: KeyboardEvent) => {
      if (e.key === "Backspace" || e.key === "Delete") backspaces.current += 1;
    };
    editorEl.addEventListener("keydown", onKeydown);
    editorEl.addEventListener("keyup", onKeyup);
    return () => {
      editorEl.removeEventListener("keydown", onKeydown);
      editorEl.removeEventListener("keyup", onKeyup);
    };
  }, [editorEl]);

  useEffect(() => {
    const timer = window.setInterval(() => { void seal(); }, SEAL_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      void seal();
    };
  }, [seal]);
}
