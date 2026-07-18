import { useState, useEffect } from "react";
import { SentientChat } from "@/components/sentient/SentientChat";
import { AuthDialog } from "@/components/landing/AuthDialog";
import { LiteHero } from "@/components/lite/LiteHero";
import { LiteSoftWall } from "@/components/lite/LiteSoftWall";
import { LogoWallV2 } from "@/components/landing/LogoWallV2";
import { StatsStrip } from "@/components/landing/StatsStrip";
import { UseCaseTabs } from "@/components/landing/UseCaseTabs";
import { TestimonialsCarousel } from "@/components/landing/TestimonialsCarousel";
import { BentoFeatures } from "@/components/landing/BentoFeatures";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { FAQ } from "@/components/landing/FAQ";
import { FinalCTABand } from "@/components/landing/FinalCTABand";
import { StickyMobileCTA } from "@/components/landing/StickyMobileCTA";
import { SEO } from "@/components/SEO";
import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/constants";
import { Zap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { trackCTA, trackEvent } from "@/lib/track";

export default function PromptCentralLite() {
  const [authOpen, setAuthOpen] = useState(false);
  const [wallShown, setWallShown] = useState(false);
  const [injected, setInjected] = useState<string | undefined>();

  useEffect(() => {
    trackEvent("lite_page_view");
  }, []);

  const openAuth = () => setAuthOpen(true);

  return (
    <div className="bg-background min-h-dvh">
      <SEO
        title={`${APP_NAME} — Try PressRoom free`}
        description="Try our AI workspace free — no signup required for your first turns. See the power before you commit."
        path="/prompt-central-lite"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: `${APP_NAME} — PressRoom`,
          description: "AI workspace with personas, exports, and shareable sessions.",
          aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", reviewCount: "1284" },
        }}
      />

      {/* Slim sticky header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between h-14 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-base font-extrabold tracking-tight text-foreground">{APP_NAME}</span>
          </Link>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  PressRoom Research Lite
                </span>
              </TooltipTrigger>
              <TooltipContent>Optimized preview engine. Sign up for full inference.</TooltipContent>
            </Tooltip>
            <Button
              size="sm"
              className="h-9 rounded-full px-4 text-xs font-semibold"
              onClick={() => {
                trackCTA("signup", "lite-header");
                openAuth();
              }}
            >
              Sign up
            </Button>
          </div>
        </div>
      </header>

      <main>
        <div className="max-w-2xl mx-auto px-4 md:px-6">
          <LiteHero
            onPickChip={(prompt) => {
              trackEvent("lite_prompt_submitted", { source: "chip" });
              setInjected(prompt);
            }}
          />

          <div className="glow-border rounded-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
            <SentientChat
              lite
              onTurnLimitReached={() => setWallShown(true)}
              injectedText={injected}
              onInjectedTextConsumed={() => setInjected(undefined)}
            />
            {wallShown && <LiteSoftWall onOpenAuth={openAuth} />}
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-3 mb-8">
            2 free turns · No signup needed to try
          </p>
        </div>

        {/* Marketing stack — reuse landing components */}
        <div className="border-t border-border mt-2">
          <LogoWallV2 />
        </div>
        <StatsStrip />
        <UseCaseTabs />
        <TestimonialsCarousel />
        <BentoFeatures />
        <ComparisonTable />
        <FAQ />
        <FinalCTABand
          onOpenAuth={openAuth}
          headlineOverride={<>You've seen <span className="text-primary">2 turns</span>. Unlock unlimited.</>}
          subheadOverride="Free forever tier. Your sessions, personas, and exports — all saved automatically."
        />
      </main>

      <StickyMobileCTA onOpenAuth={openAuth} />

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} defaultTab="signup" />
    </div>
  );
}
