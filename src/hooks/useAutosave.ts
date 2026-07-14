import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface UseAutosaveOptions<T> {
  value: T;
  delayMs?: number;
  /** Called with the latest value to perform the save. Should throw on failure. */
  save: (value: T) => Promise<void>;
  /** Skip saving (e.g., before initial load completes). */
  enabled?: boolean;
}

export function useAutosave<T>({ value, delayMs = 8000, save, enabled = true }: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef(value);
  const firstRunRef = useRef(true);
  latestValueRef.current = value;

  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setStatus("saving");
    try {
      await save(latestValueRef.current);
      setStatus("saved");
      setSavedAt(new Date());
    } catch (e) {
      console.error("Autosave failed", e);
      setStatus("error");
    }
  }, [save]);

  useEffect(() => {
    if (!enabled) return;
    if (firstRunRef.current) { firstRunRef.current = false; return; }
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("dirty");
    timerRef.current = setTimeout(() => { flush(); }, delayMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delayMs, enabled]);

  return { status, savedAt, flush };
}
