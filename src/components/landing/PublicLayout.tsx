import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import { AnnounceBar } from "@/components/public/AnnounceBar";
import { Newsletter } from "@/components/public/Newsletter";
import { CookieConsentBanner } from "./CookieConsentBanner";

export function PublicLayout() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.slice(1);
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  }, [pathname, hash]);

  return (
    <div className="ezra-public rdy min-h-dvh flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <AnnounceBar />
      <PublicNav />
      <main id="main-content" className="flex-grow">
        <Outlet />
      </main>
      <Newsletter />
      <PublicFooter />
      <CookieConsentBanner />
    </div>
  );
}
