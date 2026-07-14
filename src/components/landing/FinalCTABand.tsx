import { Button } from "@/components/ui/button";
import { Reveal } from "./Reveal";
import { ArrowRight, Calendar } from "lucide-react";
import { CONTACT_EMAIL } from "@/lib/constants";
import { trackCTA } from "@/lib/track";

interface FinalCTABandProps {
  onOpenAuth: () => void;
  headlineOverride?: React.ReactNode;
  subheadOverride?: React.ReactNode;
}

export function FinalCTABand({ onOpenAuth, headlineOverride, subheadOverride }: FinalCTABandProps) {
  return (
    <section className="relative overflow-hidden py-14 md:py-28 px-5 md:px-6">
      <div className="absolute inset-0 gradient-mesh opacity-90 pointer-events-none" aria-hidden />
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" aria-hidden />
      <div className="relative max-w-3xl mx-auto text-center">
        <Reveal>
          <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            {headlineOverride ?? (<>Ready to bring the <span className="text-primary">Gospel</span> to the masses?</>)}
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mt-3 md:mt-4 text-muted-foreground text-base md:text-lg">
            {subheadOverride ?? "Magnify your worship with AI."}
          </p>
        </Reveal>
        <Reveal delay={200}>
          <div className="mt-7 md:mt-8 flex flex-col sm:flex-row gap-2.5 sm:gap-3 justify-center">
            <Button
              onClick={() => {
                trackCTA("signup", "final-cta");
                onOpenAuth();
              }}
              size="lg"
              className="rounded-lg shadow-lg hover:shadow-xl text-base px-6 sm:px-8 h-12 gap-2 w-full sm:w-auto sm:min-w-[200px] font-semibold"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              onClick={() => trackCTA("book-demo", "final-cta")}
              className="rounded-lg text-base px-6 sm:px-8 h-12 gap-2 w-full sm:w-auto sm:min-w-[200px] font-semibold"
            >
              <a href={`mailto:${CONTACT_EMAIL}?subject=Book%20a%20demo`}>
                Book a demo <Calendar className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
