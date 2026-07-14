import { useEffect, useState } from "react";

export const SENTIENT_MODELS = [
  { id: "google/gemini-2.5-flash-lite", label: "Flash-Lite", hint: "Fastest" },
  { id: "google/gemini-2.5-flash", label: "Flash", hint: "Balanced" },
  { id: "google/gemini-2.5-pro", label: "Pro", hint: "Deep reasoning" },
  { id: "openai/gpt-5-mini", label: "GPT-5 mini", hint: "Alternate" },
] as const;
export type SentientModelId = typeof SENTIENT_MODELS[number]["id"];

const KEY = "sentient-model";

export function useModelPreference() {
  const [model, setModelState] = useState<SentientModelId>("google/gemini-2.5-flash-lite");
  useEffect(() => {
    const stored = localStorage.getItem(KEY) as SentientModelId | null;
    if (stored && SENTIENT_MODELS.some((m) => m.id === stored)) setModelState(stored);
  }, []);
  const setModel = (m: SentientModelId) => {
    setModelState(m);
    localStorage.setItem(KEY, m);
  };
  return { model, setModel };
}
