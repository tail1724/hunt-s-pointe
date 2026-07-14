import { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";
import { vertical, type StatEntry, type CitedSource } from "@/config/vertical";

function CountUp({ target, suffix }: { target: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(target);
  const numeric = parseFloat(target.replace(/,/g, ""));
  const hasNumber = !isNaN(numeric);

  useEffect(() => {
    if (!hasNumber) {
      setDisplay(target);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const duration = 1400;
        const start = performance.now();
        const isInt = Number.isInteger(numeric);
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const value = numeric * eased;
          setDisplay(
            isInt
              ? Math.round(value).toLocaleString()
              : value.toFixed(1).replace(/\.0$/, ""),
          );
          if (t < 1) requestAnimationFrame(step);
          else setDisplay(target);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [target, numeric, hasNumber]);

  return (
    <span ref={ref}>
      {display}
    </span>
  );
}

interface StatsStripProps {
  stats?: StatEntry[];
  sources?: CitedSource[];
  eyebrow?: string;
  heading?: string;
}

export function StatsStrip({ stats = vertical.stats, sources, eyebrow, heading }: StatsStripProps) {
  const count = stats.length;
  const colsClass =
    count === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : count === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-2 md:grid-cols-4";

  return (
    <section className="py-16 px-6 border-y border-border bg-card/40">
      <div className="max-w-6xl mx-auto">
        {(eyebrow || heading) && (
          <Reveal className="text-center mb-10">
            {eyebrow && (
              <p className="text-xs md:text-sm font-medium uppercase tracking-widest text-muted-foreground">
                {eyebrow}
              </p>
            )}
            {heading && (
              <h2 className="mt-2 font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
                {heading}
              </h2>
            )}
          </Reveal>
        )}
        <div className={`grid ${colsClass} gap-8 md:gap-10`}>
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 80} className="text-center min-w-0">
              <div className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-none break-words">
                <CountUp target={stat.value} />
              </div>
              {stat.suffix ? (
                <p className="mt-2 text-sm md:text-base font-medium text-foreground/80">
                  {stat.suffix}
                </p>
              ) : null}
              <p className="mt-2 text-xs md:text-sm text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </p>
            </Reveal>
          ))}
        </div>
        {sources && sources.length > 0 && (
          <p className="mt-10 text-center text-xs text-muted-foreground/80">
            Sources ·{" "}
            {sources.map((s, i) => (
              <span key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
                  {s.label}
                </a>
                {i < sources.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        )}
      </div>
    </section>
  );
}
