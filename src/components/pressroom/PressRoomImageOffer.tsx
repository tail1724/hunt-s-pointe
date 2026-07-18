import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Download, ImageIcon, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { IMAGE_STYLES, DEFAULT_STYLE_ID, type StyleFamily } from "@/lib/image-styles";
import { parseAllReferences, formatReference } from "@/lib/bible";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";

interface Props {
  /** The user turn that produced this answer — the image subject seed. */
  userPrompt: string;
  /** The assistant answer, mined for scripture references and context. */
  assistantText: string;
}

type Phase = "offer" | "pick" | "generating" | "done" | "dismissed";

const ASPECTS = [
  { key: "square", label: "Square", hint: "1:1 · post" },
  { key: "wide", label: "Wide", hint: "16:9 · slide" },
  { key: "story", label: "Story", hint: "9:16 · reel" },
  { key: "print", label: "Print", hint: "3:4 · poster" },
] as const;

type AspectKey = (typeof ASPECTS)[number]["key"];

/**
 * Per-turn image offer — after every completed PressRoom answer, the user is
 * invited (never forced) to turn the study into a designed image. Expands
 * into the curated style picker; results are saved to the File Cabinet's
 * Images section automatically by the generate-image function.
 */
export function PressRoomImageOffer({ userPrompt, assistantText }: Props) {
  const [phase, setPhase] = useState<Phase>("offer");
  const [family, setFamily] = useState<StyleFamily>("modern");
  const [styleId, setStyleId] = useState(DEFAULT_STYLE_ID);
  const [overlay, setOverlay] = useState(() => {
    // Prefill the featured text with the first scripture reference in the
    // answer — usually exactly what the user wants set in type.
    const ref = parseAllReferences(assistantText)[0];
    return ref ? formatReference(ref) : "";
  });
  const [aspect, setAspect] = useState<AspectKey>("square");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const subject = useMemo(() => {
    const excerpt = assistantText.replace(/\s+/g, " ").trim().slice(0, 400);
    return `${userPrompt.trim().slice(0, 300)}\n\nStudy context: ${excerpt}`;
  }, [userPrompt, assistantText]);

  const styles = IMAGE_STYLES.filter((s) => s.family === family);

  const generate = async () => {
    setPhase("generating");
    haptics.tap();
    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          prompt: subject,
          style_id: styleId,
          overlay_text: overlay.trim() || undefined,
          aspect_ratio: aspect,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        toast.error(json.error || "Image generation failed");
        setPhase("pick");
        return;
      }
      setImageUrl(json.url);
      setPhase("done");
      haptics.turnComplete?.();
      toast.success("Image saved to your File Cabinet");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't reach the image studio");
      setPhase("pick");
    }
  };

  if (phase === "dismissed") return null;

  // Slim, dismissible invitation — the "ask with each prompt" moment.
  if (phase === "offer") {
    return (
      <div className="pressroom-artifact-reveal flex items-center gap-2 rounded-xl border border-dashed border-[var(--pressroom-border)] bg-[var(--pressroom-panel)]/50 px-3 py-2">
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--pressroom-accent)]" />
        <span className="min-w-0 flex-1 truncate text-xs text-[var(--pressroom-fg-muted)]">
          Want an image from this? Verse art, sermon graphics — modern or classic.
        </span>
        <button
          type="button"
          onClick={() => setPhase("pick")}
          className="pressroom-tactile shrink-0 rounded-full bg-[var(--pressroom-active-bg)] px-3 py-1 text-xs font-medium text-[var(--pressroom-accent)] hover:bg-[var(--pressroom-active-bg)]/80"
        >
          Create image
        </button>
        <button
          type="button"
          onClick={() => setPhase("dismissed")}
          aria-label="Dismiss image offer"
          className="pressroom-tactile shrink-0 rounded-full p-1 text-[var(--pressroom-fg-muted)] hover:bg-[var(--pressroom-hover-bg)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="pressroom-artifact-reveal space-y-3 rounded-2xl border border-[var(--pressroom-border)] bg-[var(--pressroom-panel)]/70 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--pressroom-fg)]">
          <ImageIcon className="h-3.5 w-3.5 text-[var(--pressroom-accent)]" />
          Image studio
        </div>
        <button
          type="button"
          onClick={() => setPhase("dismissed")}
          aria-label="Close image studio"
          className="pressroom-tactile rounded-full p-1 text-[var(--pressroom-fg-muted)] hover:bg-[var(--pressroom-hover-bg)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {phase !== "done" && (
        <>
          {/* Modern / Classic family toggle */}
          <div className="flex items-center gap-1 rounded-full bg-[var(--pressroom-hover-bg)]/70 p-1 w-fit">
            {(["modern", "classic"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setFamily(f);
                  const first = IMAGE_STYLES.find((s) => s.family === f);
                  if (first) setStyleId(first.id);
                }}
                className={cn(
                  "pressroom-tactile rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                  family === f
                    ? "bg-[var(--pressroom-composer-bg)] text-[var(--pressroom-fg)] shadow-sm"
                    : "text-[var(--pressroom-fg-muted)] hover:text-[var(--pressroom-fg)]",
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {styles.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyleId(s.id)}
                disabled={phase === "generating"}
                className={cn(
                  "pressroom-tactile rounded-xl border px-2.5 py-2 text-left transition-colors disabled:opacity-60",
                  styleId === s.id
                    ? "border-[var(--pressroom-active-border)] bg-[var(--pressroom-active-bg)]"
                    : "border-[var(--pressroom-border)] bg-[var(--pressroom-composer-bg)]/60 hover:border-[var(--pressroom-accent)]/50",
                )}
              >
                <span className="block text-xs font-semibold text-[var(--pressroom-fg)]">{s.name}</span>
                <span className="mt-0.5 block text-[10px] leading-snug text-[var(--pressroom-fg-muted)]">{s.blurb}</span>
              </button>
            ))}
          </div>

          {/* Format presets — social, slide, story, poster */}
          <div className="flex flex-wrap items-center gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setAspect(a.key)}
                disabled={phase === "generating"}
                className={cn(
                  "pressroom-tactile rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors disabled:opacity-60",
                  aspect === a.key
                    ? "border-[var(--pressroom-active-border)] bg-[var(--pressroom-active-bg)] text-[var(--pressroom-fg)]"
                    : "border-[var(--pressroom-border)] text-[var(--pressroom-fg-muted)] hover:text-[var(--pressroom-fg)]",
                )}
              >
                {a.label} <span className="opacity-60">{a.hint}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={overlay}
              onChange={(e) => setOverlay(e.target.value)}
              placeholder="Text on the image (verse, title) — optional"
              disabled={phase === "generating"}
              className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--pressroom-composer-border)] bg-[var(--pressroom-composer-bg)] px-3 text-xs text-[var(--pressroom-fg)] outline-none placeholder:text-[var(--pressroom-fg-muted)]/60 focus:border-[var(--pressroom-accent)] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={generate}
              disabled={phase === "generating"}
              className="pressroom-tactile inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--pressroom-accent)] px-4 text-xs font-semibold text-[var(--pressroom-accent-fg)] disabled:opacity-70"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {phase === "generating" ? "Composing…" : "Generate"}
            </button>
          </div>
        </>
      )}

      {phase === "generating" && (
        <div className="overflow-hidden rounded-xl border border-[var(--pressroom-border)]" aria-label="Generating image">
          <div className="shimmer aspect-video w-full" />
          <p className="bg-[var(--pressroom-composer-bg)]/60 px-3 py-2 text-[11px] text-[var(--pressroom-fg-muted)]">
            Setting the composition — this usually takes a few seconds.
          </p>
        </div>
      )}

      {phase === "done" && imageUrl && (
        <div className="space-y-2">
          <img
            src={imageUrl}
            alt={overlay || "Generated study image"}
            className="w-full rounded-xl border border-[var(--pressroom-border)]"
            loading="lazy"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="pressroom-tactile inline-flex items-center gap-1.5 rounded-full border border-[var(--pressroom-border)] px-3 py-1.5 text-xs font-medium text-[var(--pressroom-fg)] hover:bg-[var(--pressroom-hover-bg)]"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
            <Link
              to="/app/file-cabinet?tab=images"
              className="pressroom-tactile inline-flex items-center gap-1.5 rounded-full border border-[var(--pressroom-border)] px-3 py-1.5 text-xs font-medium text-[var(--pressroom-fg)] hover:bg-[var(--pressroom-hover-bg)] no-underline"
            >
              <Archive className="h-3.5 w-3.5" /> File Cabinet
            </Link>
            <button
              type="button"
              onClick={() => setPhase("pick")}
              className="pressroom-tactile inline-flex items-center gap-1.5 rounded-full border border-[var(--pressroom-border)] px-3 py-1.5 text-xs font-medium text-[var(--pressroom-fg)] hover:bg-[var(--pressroom-hover-bg)]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try another style
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
