import { useCallback, useEffect, useState } from "react";
import { playNavFlight, type FlightDirection } from "@/lib/nav-flight";

export type NavPlacement = "left" | "top";

const KEY = "pressroom.navPlacement";

function read(): NavPlacement {
  if (typeof window === "undefined") return "top";
  const v = window.localStorage.getItem(KEY);
  // First run (no stored value) defaults to the pinned top nav so the
  // workspace opens uncluttered. A returning user who explicitly chose the
  // left sidebar keeps it.
  return v === "left" ? "left" : "top";
}

// Module-level store so every consumer updates in lockstep when the
// transition controller commits the new placement.
let current: NavPlacement = read();
const listeners = new Set<(p: NavPlacement) => void>();

function commitStore(p: NavPlacement) {
  if (current === p) return;
  current = p;
  try {
    window.localStorage.setItem(KEY, p);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(p));
}

export function useNavPlacement() {
  const [placement, setLocal] = useState<NavPlacement>(current);

  useEffect(() => {
    listeners.add(setLocal);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        const next = read();
        commitStore(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(setLocal);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setPlacement = useCallback((p: NavPlacement) => {
    if (current === p) return;
    const direction: FlightDirection =
      current === "left" ? "left-to-top" : "top-to-left";
    playNavFlight(direction, () => commitStore(p));
  }, []);

  const toggle = useCallback(() => {
    setPlacement(current === "left" ? "top" : "left");
  }, [setPlacement]);

  return { placement, setPlacement, toggle };
}
