import { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { getRange, formatReference, parseAllReferences, listTranslations } from "@/lib/bible";
import type { TranslationMeta } from "@/lib/bible";

export interface ArtifactCitation {
  id: number;
  translation: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end?: number;
  text: string;
}

export interface ArtifactSection {
  heading?: string;
  prose: string;
  citation_ids?: number[];
}

export interface ScriptureArtifactData {
  title: string;
  tradition?: string;
  prose_style?: string;
  sections: ArtifactSection[];
  citations: ArtifactCitation[];
}

interface Props {
  data: ScriptureArtifactData;
}

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";

function sup(n: number): string {
  return String(n).split("").map((d) => SUPERSCRIPTS[parseInt(d, 10)] ?? d).join("");
}

export function ScriptureArtifact({ data }: Props) {
  const [translations, setTranslations] = useState<TranslationMeta[]>([]);
  const [activeTranslation, setActiveTranslation] = useState<string>(
    data.citations[0]?.translation ?? "KJV",
  );
  const [citations, setCitations] = useState<ArtifactCitation[]>(data.citations);

  useEffect(() => {
    listTranslations().then(setTranslations).catch(() => {});
  }, []);

  const switchTranslation = async (id: string) => {
    setActiveTranslation(id);
    const next: ArtifactCitation[] = [];
    for (const c of data.citations) {
      const refs = parseAllReferences(`${prettifyBook(c.book)} ${c.chapter}:${c.verse_start}${c.verse_end ? `-${c.verse_end}` : ""}`);
      const ref = refs[0] ?? { book: c.book, chapter: c.chapter, verseStart: c.verse_start, verseEnd: c.verse_end };
      const range = await getRange(id, ref);
      const text = range.map((v) => v.text).join(" ");
      next.push({ ...c, translation: id, text: text || c.text });
    }
    setCitations(next);
  };

  const markdown = useMemo(() => renderMarkdown(data, citations), [data, citations]);

  const copyMd = async () => {
    await navigator.clipboard.writeText(markdown);
    toast.success("Copied markdown");
  };

  return (
    <article className="space-y-4 text-sm">
      <header className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {data.tradition && <Badge variant="outline">{data.tradition}</Badge>}
          {data.prose_style && <Badge variant="outline">{data.prose_style}</Badge>}
          <Badge>{activeTranslation}</Badge>
        </div>
        <h2 className="text-lg font-semibold">{data.title}</h2>
      </header>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-3">
        {data.sections.map((s, i) => (
          <section key={i} className="space-y-1.5">
            {s.heading && <h3 className="font-semibold">{s.heading}</h3>}
            <p className="leading-relaxed whitespace-pre-wrap">
              {s.prose}
              {s.citation_ids && s.citation_ids.length > 0 && (
                <span className="ml-0.5 text-primary">{s.citation_ids.map((id) => sup(id)).join("")}</span>
              )}
            </p>
          </section>
        ))}
      </div>

      <footer className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Citations</h4>
          <div className="flex items-center gap-2">
            {translations.length > 0 && (
              <select
                aria-label="Switch translation"
                value={activeTranslation}
                onChange={(e) => switchTranslation(e.target.value)}
                className="h-7 rounded border border-border bg-background text-xs px-2"
              >
                {translations.slice(0, 25).map((t) => (
                  <option key={t.id} value={t.id}>{t.id}</option>
                ))}
              </select>
            )}
            <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={copyMd}>
              <Copy className="h-3 w-3" /> Copy
            </Button>
            <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => switchTranslation(activeTranslation)}>
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
        </div>
        <ol className="space-y-1.5 text-xs">
          {citations.map((c) => (
            <li key={c.id} className="leading-snug">
              <span className="text-muted-foreground">{sup(c.id)} </span>
              <strong>{prettifyBook(c.book)} {c.chapter}:{c.verse_start}{c.verse_end ? `-${c.verse_end}` : ""}</strong>
              {" "}({c.translation}) — <span className="italic">{c.text}</span>
            </li>
          ))}
        </ol>
      </footer>
    </article>
  );
}

function prettifyBook(slug: string): string {
  return slug
    .split("-")
    .map((part) => {
      if (part === "i") return "1";
      if (part === "ii") return "2";
      if (part === "iii") return "3";
      return part[0]?.toUpperCase() + part.slice(1);
    })
    .join(" ");
}

function renderMarkdown(data: ScriptureArtifactData, citations: ArtifactCitation[]): string {
  const lines: string[] = [`# ${data.title}`, ""];
  if (data.tradition) lines.push(`*Tradition: ${data.tradition}*`);
  if (data.prose_style) lines.push(`*Style: ${data.prose_style}*`);
  lines.push("");
  for (const s of data.sections) {
    if (s.heading) { lines.push(`## ${s.heading}`); lines.push(""); }
    const marks = s.citation_ids?.length ? ` ${s.citation_ids.map(sup).join("")}` : "";
    lines.push(s.prose + marks);
    lines.push("");
  }
  lines.push("---", "**Citations**", "");
  for (const c of citations) {
    lines.push(`${sup(c.id)} **${prettifyBook(c.book)} ${c.chapter}:${c.verse_start}${c.verse_end ? `-${c.verse_end}` : ""}** (${c.translation}) — _${c.text}_`);
  }
  return lines.join("\n");
}
