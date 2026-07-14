import { Reveal } from "./Reveal";
import { vertical } from "@/config/vertical";
import { Helmet } from "react-helmet-async";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQProps {
  /** When true, emits FAQPage JSON-LD (set on landing page only to avoid duplicates) */
  emitJsonLd?: boolean;
}

export function FAQ({ emitJsonLd = false }: FAQProps) {
  return (
    <section id="faq" className="py-14 md:py-28 px-5 md:px-6 bg-muted/30 border-y border-border">
      {emitJsonLd && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: vertical.faqs.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            })}
          </script>
        </Helmet>
      )}

      <div className="max-w-3xl mx-auto">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight">
              Frequently asked <span className="text-primary">questions</span>.
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Can't find what you're looking for? Reach out — we read every message.
            </p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <Accordion type="single" collapsible className="w-full">
            {vertical.faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border border-border rounded-lg bg-card mb-2 px-4 data-[state=open]:border-primary/40"
              >
                <AccordionTrigger className="text-left text-sm md:text-base font-semibold py-4 min-h-12 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
