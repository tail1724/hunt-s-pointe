import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

interface MobileNavOverride {
  /** True while a page wants to own the full screen (e.g. Write's focus mode) — hides the header. */
  focusMode?: boolean;
}


interface Ctx {
  override: MobileNavOverride;
  setOverride: (next: MobileNavOverride) => void;
  isOpen: boolean;
  setOpen: (o: boolean) => void;
  toggle: () => void;
}

const MobileNavCtx = createContext<Ctx | null>(null);

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<MobileNavOverride>({});
  const [isOpen, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((o) => !o), []);
  const value = useMemo(() => ({ override, setOverride, isOpen, setOpen, toggle }), [override, isOpen, toggle]);
  return <MobileNavCtx.Provider value={value}>{children}</MobileNavCtx.Provider>;
}

export function useMobileNav() {
  const ctx = useContext(MobileNavCtx);
  if (!ctx) {
    // Allow safe no-op usage on desktop / public pages.
    return {
      override: {} as MobileNavOverride,
      setOverride: (_: MobileNavOverride) => {},
      isOpen: false,
      setOpen: (_: boolean) => {},
      toggle: () => {},
    } satisfies Ctx;
  }
  return ctx;
}
