import { useEffect, useState } from "react";

/**
 * Chart color system for Analytics.
 *
 * Categorical slots are brand-derived (indigo primary, gold accent) and were
 * validated with the dataviz palette validator against the app's real chart
 * surfaces — light: #ffffff (card), dark: #1c273f (hsl 222 38% 18%).
 * Both sets pass all checks: lightness band, chroma floor, adjacent-pair CVD
 * separation (worst ΔE 40+), and ≥3:1 contrast. Keep the slot ORDER fixed —
 * it is the CVD-safety mechanism, not cosmetic.
 */
export const CATEGORICAL_LIGHT = ["#4263eb", "#b08018", "#0ca678", "#7048e8", "#c2255c"] as const;
export const CATEGORICAL_DARK = ["#5c7cfa", "#bd861a", "#0da678", "#9775fa", "#d6446f"] as const;

export interface ChartTheme {
  series: readonly string[];
  /** Recessive hairline for gridlines */
  grid: string;
  /** Axis tick ink */
  tick: string;
  /** Surface color behind marks — used for stack gaps and marker rings */
  surface: string;
  tooltip: {
    background: string;
    border: string;
    text: string;
    muted: string;
  };
}

export const LIGHT_THEME: ChartTheme = {
  series: CATEGORICAL_LIGHT,
  grid: "hsl(222 16% 91%)",
  tick: "hsl(217 14% 50%)",
  surface: "#ffffff",
  tooltip: {
    background: "hsl(0 0% 100%)",
    border: "hsl(222 16% 86%)",
    text: "hsl(30 3% 14%)",
    muted: "hsl(217 16% 43%)",
  },
};

export const DARK_THEME: ChartTheme = {
  series: CATEGORICAL_DARK,
  grid: "hsl(222 30% 24%)",
  tick: "hsl(217 16% 65%)",
  surface: "#1c273f",
  tooltip: {
    background: "hsl(222 38% 15%)",
    border: "hsl(222 30% 26%)",
    text: "hsl(38 47% 94%)",
    muted: "hsl(217 16% 70%)",
  },
};

/**
 * Resolve the active chart theme from the `dark` class on <html>, staying in
 * sync when next-themes toggles it.
 */
export function useChartTheme(): ChartTheme {
  const [isDark, setIsDark] = useState<boolean>(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : true,
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark ? DARK_THEME : LIGHT_THEME;
}

/** Compact number formatting for stat tiles: 1284 → 1.3K */
export function compactNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(0)}K`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}
