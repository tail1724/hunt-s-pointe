import { useCallback, useEffect, useState } from "react";

export const SILENCE_THRESHOLD_MS = 1500;

export interface VoicePrefs {
  autoSend: boolean;
  silenceThresholdMs: number;
  minTranscriptChars: number;
  sounds: boolean;
}

const KEY = "ezra:voice-prefs";
const DEFAULTS: VoicePrefs = {
  autoSend: false,
  silenceThresholdMs: SILENCE_THRESHOLD_MS,
  minTranscriptChars: 3,
  sounds: false,
};

function read(): VoicePrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
}

export function useVoicePreferences() {
  const [prefs, setPrefs] = useState<VoicePrefs>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setPrefs(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((patch: Partial<VoicePrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  return { prefs, update };
}
