import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, FolderDown, ImageIcon, Loader2, MessagesSquare, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useImageLightbox } from "@/contexts/ImageLightboxContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { decodeStyleCaption, type StyleFamily } from "@/lib/image-styles";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";

interface GenRow {
  id: string;
  source_prompt: string;
  result_url: string | null;
  caption: string | null;
  created_at: string;
}

type FamilyFilter = "all" | StyleFamily;

/**
 * The Images section of the File Cabinet — every generation from the PressRoom
 * image studio lands here automatically. Search by prompt, filter by
 * modern/classic family, open in the lightbox, download, or hand the prompt
 * back to PressRoom.
 */
export function ImageGallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { openLightbox } = useImageLightbox();
  const [rows, setRows] = useState<GenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<FamilyFilter>("all");
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("generations")
      .select("id, source_prompt, result_url, caption, created_at")
      .eq("user_id", user.id)
      .eq("media_type", "image")
      .eq("status", "complete")
      .not("result_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast.error("Couldn't load images");
    setRows((data as GenRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (row: GenRow) => {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    const { error } = await supabase.from("generations").delete().eq("id", row.id).eq("user_id", user!.id);
    if (error) {
      toast.error("Couldn't delete image");
      load();
      return;
    }
    toast.success("Image deleted");
  };

  const askPressRoom = (row: GenRow) => {
    navigate("/app/pressroom", {
      state: { prefill: `Let's iterate on this image concept:\n\n${row.source_prompt.slice(0, 500)}` },
    });
  };

  const filtered = useMemo(() => {
    let out = rows;
    if (family !== "all") {
      out = out.filter((r) => decodeStyleCaption(r.caption)?.family === family);
    }
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((r) => r.source_prompt.toLowerCase().includes(q));
    return out;
  }, [rows, family, query]);

  // Batch export: fetch each visible image as a blob and trigger a download.
  // Sequential with a short gap so browsers don't drop the later saves.
  const exportAll = async () => {
    if (filtered.length === 0 || exporting) return;
    setExporting(true);
    let saved = 0;
    try {
      for (const row of filtered) {
        try {
          const blob = await fetch(row.result_url!).then((r) => (r.ok ? r.blob() : Promise.reject()));
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = `pressroom-${decodeStyleCaption(row.caption)?.id ?? "image"}-${row.id.slice(0, 8)}.png`;
          a.click();
          URL.revokeObjectURL(a.href);
          saved++;
          await new Promise((r) => setTimeout(r, 350));
        } catch {
          /* skip unreachable file, keep going */
        }
      }
    } finally {
      setExporting(false);
    }
    toast[saved > 0 ? "success" : "error"](
      saved > 0 ? `Exported ${saved} image${saved === 1 ? "" : "s"}` : "Export failed",
    );
  };

  const familyFilters: { key: FamilyFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "modern", label: "Modern" },
    { key: "classic", label: "Classic" },
  ];

  return (
    <div>
      {/* Toolbar: search · style family filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by prompt…"
            className="h-9 pl-9 text-sm bg-card"
          />
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted/70 p-1">
          {familyFilters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFamily(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium tactile transition-colors",
                family === f.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        {filtered.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={exportAll}
            disabled={exporting}
          >
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderDown className="h-3.5 w-3.5" />}
            {exporting ? "Exporting…" : `Export all (${filtered.length})`}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded-xl bg-muted/40" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ImageIcon className="h-6 w-6 text-primary" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold">No images yet</h2>
          <p className="mx-auto mt-1 mb-6 max-w-sm text-sm text-muted-foreground">
            Ask PressRoom anything, then choose "Create image" under the answer — article art, section headers,
            social cards, and more. Everything you make is filed here.
          </p>
          <Button asChild className="gap-2">
            <Link to="/app/pressroom">
              <Sparkles className="h-4 w-4" /> Start a story
            </Link>
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <h2 className="font-display text-base font-semibold">No images match</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row, i) => {
            const style = decodeStyleCaption(row.caption);
            return (
              <figure
                key={row.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] card-elevate accent-draw rise-in"
                style={{ "--stagger-i": Math.min(i, 11) } as React.CSSProperties}
              >
                <button
                  type="button"
                  onClick={() => openLightbox(row.result_url!, row.source_prompt.slice(0, 120))}
                  className="block aspect-[4/3] w-full overflow-hidden bg-muted/30"
                  aria-label="View image full size"
                >
                  <img
                    src={row.result_url!}
                    alt={row.source_prompt.slice(0, 120)}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </button>

                <figcaption className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div className="min-w-0">
                    {style && (
                      <span
                        className={cn(
                          "mb-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px]",
                          style.family === "modern"
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-accent/30 bg-accent/10 text-accent-foreground",
                        )}
                      >
                        {style.name}
                      </span>
                    )}
                    <p className="truncate text-xs text-muted-foreground">{row.source_prompt}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(row.created_at))} ago
                  </span>
                </figcaption>

                <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border border-border/60 bg-card/90 p-0.5 opacity-100 shadow-sm backdrop-blur transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a
                        href={row.result_url!}
                        download
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-md text-muted-foreground tactile hover:bg-primary/10 hover:text-primary"
                        aria-label="Download image"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Download</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => askPressRoom(row)}
                        className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-md text-muted-foreground tactile hover:bg-primary/10 hover:text-primary"
                        aria-label="Iterate with PressRoom"
                      >
                        <MessagesSquare className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Iterate with PressRoom</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => remove(row)}
                        className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-md text-muted-foreground tactile hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Delete image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Delete</TooltipContent>
                  </Tooltip>
                </div>
              </figure>
            );
          })}
        </div>
      )}
    </div>
  );
}
