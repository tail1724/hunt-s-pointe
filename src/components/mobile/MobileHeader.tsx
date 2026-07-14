import { useMobileNav } from "./mobile-nav-context";
import { FiveBarIcon } from "./FiveBarIcon";
import { haptics } from "@/lib/haptics";


export function MobileHeader() {
  const { isOpen, toggle, override } = useMobileNav();

  if (override.focusMode) return null;

  return (
    <header className="mobile-header" role="banner">
      <button
        type="button"
        className="mobile-header__menu"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        onClick={() => {
          haptics.tap();
          toggle();
        }}
      >
        <FiveBarIcon open={isOpen} />
      </button>

      {/* The masthead: centered, spanning the bar, the quiet anchor of the
          whole authenticated experience. */}
      <span className="mobile-header__wordmark">Ezra Research</span>
    </header>
  );
}

