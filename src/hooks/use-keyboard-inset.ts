import { useEffect, useRef, useState } from "react";

/**
 * Tracks how much of the viewport the on-screen keyboard is covering, and
 * mirrors it onto `document.documentElement` as `--kb-inset` (px) plus a
 * `data-keyboard="open"` attribute once the inset crosses a noise threshold.
 *
 * Why visualViewport: `interactive-widget=resizes-content` (set in
 * index.html) already makes Android Chrome shrink the *layout* viewport when
 * the keyboard opens, so `100dvh` reflows for free there and the measured
 * inset stays ~0 — no double compensation. iOS Safari ignores that meta and
 * instead overlays the keyboard on top of an unchanged layout viewport, so
 * `window.visualViewport` is the only reliable signal: its height shrinks
 * and its offsetTop grows by the amount hidden behind the keyboard. Reading
 * both `innerHeight` and the live viewport keeps the two platforms unified
 * behind one measured number instead of two divergent assumptions.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const measure = () => {
      rafRef.current = null;
      const covered = window.innerHeight - vv.height - vv.offsetTop;
      const next = Math.max(0, Math.round(covered));
      setInset(next);
      const root = document.documentElement;
      root.style.setProperty("--kb-inset", `${next}px`);
      if (next > 80) root.setAttribute("data-keyboard", "open");
      else root.removeAttribute("data-keyboard");
    };

    const onChange = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(measure);
    };

    measure();
    vv.addEventListener("resize", onChange);
    vv.addEventListener("scroll", onChange);
    return () => {
      vv.removeEventListener("resize", onChange);
      vv.removeEventListener("scroll", onChange);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      document.documentElement.style.removeProperty("--kb-inset");
      document.documentElement.removeAttribute("data-keyboard");
    };
  }, []);

  return { inset, keyboardOpen: inset > 80 };
}
