import { useEffect, useState } from "react";

export function useFocusMode() {
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setFocus((f) => !f);
      } else if (e.key === "Escape" && focus) {
        setFocus(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focus]);
  return { focus, setFocus, toggle: () => setFocus((f) => !f) };
}
