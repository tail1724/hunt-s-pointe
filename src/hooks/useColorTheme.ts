import { useState, useEffect, useCallback } from "react";

export type ColorTheme = "default" | "reverent" | "ocean" | "sunset" | "forest" | "lavender" | "monochrome";

const THEME_KEY = "app-color-theme";
const ACCENT_KEY = "app-custom-accent";

export function useColorTheme() {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    return (localStorage.getItem(THEME_KEY) as ColorTheme) || "reverent";
  });
  const [customAccent, setCustomAccentState] = useState<string>(() => {
    return localStorage.getItem(ACCENT_KEY) || "";
  });

  const applyTheme = useCallback((theme: ColorTheme, accent: string) => {
    const el = document.documentElement;
    if (theme === "default") {
      el.removeAttribute("data-color-theme");
    } else {
      el.setAttribute("data-color-theme", theme);
    }
    if (accent) {
      el.style.setProperty("--primary", accent);
      // Theming guard: recompute readable --primary-foreground from the
      // accent's lightness so user-picked colors (e.g. near-white) never
      // produce illegible primary buttons. Expected format: "H S% L%".
      const match = accent.match(/^\s*\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+(\d+(?:\.\d+)?)%\s*$/);
      const l = match ? parseFloat(match[1]) : 50;
      const fg = l > 60 ? "0 0% 10%" : "0 0% 100%";
      el.style.setProperty("--primary-foreground", fg);
    } else {
      el.style.removeProperty("--primary");
      el.style.removeProperty("--primary-foreground");
    }
  }, []);

  useEffect(() => {
    applyTheme(colorTheme, customAccent);
  }, [colorTheme, customAccent, applyTheme]);

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(THEME_KEY, theme);
    // Clear custom accent when changing palette
    setCustomAccentState("");
    localStorage.removeItem(ACCENT_KEY);
  };

  const setCustomAccent = (accent: string) => {
    setCustomAccentState(accent);
    if (accent) {
      localStorage.setItem(ACCENT_KEY, accent);
    } else {
      localStorage.removeItem(ACCENT_KEY);
    }
  };

  return { colorTheme, setColorTheme, customAccent, setCustomAccent };
}
