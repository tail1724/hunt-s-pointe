import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  FileText, Sparkles, Trash2, Archive, Search, Plus, ArrowUpDown, MessagesSquare, ImageIcon,
} from "lucide-react";
import { ImageGallery } from "@/components/cabinet/ImageGallery";
import { TrashButton } from "@/components/write/TrashButton";
import { TrashModal } from "@/components/write/TrashModal";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { ARTICLE_STATUSES, type ArticleStatus } from "@/components/write/ArticleHeader";

interface DocRow {
  id: string;
  title: string;
  content_text: string;
  source: "manual" | "mary" | "build_prompts";
  auto_created: boolean;
  updated_at: string;
  dek?: string | null;
  byline?: string[] | null;
  section?: string | null;
  status?: ArticleStatus | null;
}

type StatusFilter = "all" | ArticleStatus;
type SortKey = "recent" | "alpha";

function StatusPill({ status }: { status: ArticleStatus }) {
  const s = ARTICLE_STATUSES.find((x) => x.value === status) ?? ARTICLE_STATUSES[0];
  return (
    <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}

function wordCount(text: string): number {
  return (text.match(/\S+/g) || []).length;
}

type CabinetTab = "documents" | "images";

export default function FileCabinet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: CabinetTab = searchParams.get("tab") === "images" ? "images" : "documents";
  const setTab = (t: CabinetTab) =>
    setSearchParams(t === "images" ? { tab: "images" } : {}, { replace: true });
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(0);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");

  const loadTrashCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from("documents" as any)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("deleted_at", "is", null);
    setTrashCount(count || 0);
  }, [user]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("documents" as any)
      .select("id, title, content_text, source, auto_created, updated_at, dek, byline, section, status")
      .eq("user_id", user.id)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });
    if (error) toast.error("Couldn't load documents");
    setDocs((data as any[] as DocRow[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); loadTrashCount(); }, [load, loadTrashCount]);

  const softDelete = async (id: string, title: string) => {
    if (!user) return;
    const deletedAt = new Date().toISOString();
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setTrashCount((c) => c + 1);
    const { error } = await supabase
      .from("documents" as any)
      .update({ deleted_at: deletedAt } as any)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Couldn't move to trash");
      load();
      loadTrashCount();
      return;
    }
    toast.success(`"${title || "Untitled Document"}" moved to trash`, {
      action: {
        label: "Undo",
        onClick: async () => {
          await supabase
            .from("documents" as any)
            .update({ deleted_at: null } as any)
            .eq("id", id)
            .eq("user_id", user.id);
          load();
          loadTrashCount();
        },
      },
      duration: 5000,
    });
  };

  // Hand the document to Ezra as a study seed — the cabinet and the chat are
  // one workflow, not two silos.
  const askEzra = (d: DocRow) => {
    const excerpt = (d.content_text || "").trim().slice(0, 800);
    const prompt = excerpt
      ? `Let's work on my draft "${d.title || "Untitled Document"}". Here's where it stands:\n\n${excerpt}${d.content_text.length > 800 ? "…" : ""}\n\nWhat's strong, and what should I sharpen?`
      : `I'm starting a draft called "${d.title || "Untitled Document"}". Help me find the guiding idea and a working outline.`;
    navigate("/app/ezra", { state: { prefill: prompt } });
  };

  const filtered = useMemo(() => {
    let rows = docs;
    if (statusFilter !== "all") {
      rows = rows.filter((d) => (d.status ?? "draft") === statusFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (d) =>
          (d.title || "").toLowerCase().includes(q) ||
          (d.dek || "").toLowerCase().includes(q) ||
          (d.byline || []).some((b) => b.toLowerCase().includes(q)) ||
          (d.content_text || "").toLowerCase().includes(q),
      );
    }
    if (sort === "alpha") {
      rows = [...rows].sort((a, b) => (a.title || "Untitled").localeCompare(b.title || "Untitled"));
    }
    return rows;
  }, [docs, statusFilter, query, sort]);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "draft", label: "Draft" },
    { key: "in_review", label: "In review" },
    { key: "ready", label: "Ready" },
    { key: "published", label: "Published" },
    { key: "archived", label: "Archived" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto">
      <TrashModal
        open={trashOpen}
        onOpenChange={setTrashOpen}
        onChanged={() => { load(); loadTrashCount(); }}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" />
            File Cabinet
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "documents"
              ? <>Every draft, filed automatically — {docs.length} document{docs.length === 1 ? "" : "s"} on hand.</>
              : <>Every image from the Ezra studio, filed automatically.</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tab === "documents" && <TrashButton count={trashCount} onClick={() => setTrashOpen(true)} />}
          {tab === "documents" ? (
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/app/write"><Plus className="h-4 w-4" /> New document</Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="gap-1.5">
              <Link to="/app/ezra"><Sparkles className="h-4 w-4" /> Create in Ezra</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Section tabs: Documents | Images */}
      <div className="mb-6 flex items-center gap-1 rounded-full bg-muted/70 p-1 w-fit">
        {([
          { key: "documents", label: "Documents", icon: FileText },
          { key: "images", label: "Images", icon: ImageIcon },
        ] as const).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium tactile transition-colors",
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
            aria-pressed={tab === t.key}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "images" ? (
        <ImageGallery />
      ) : (
      <>
      {/* Toolbar: search · source filter · sort */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search headline, byline, dek…"
            className="h-9 pl-9 text-sm bg-card"
          />
        </div>
        <div className="flex items-center gap-1 rounded-full bg-muted/70 p-1 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium tactile transition-colors",
                statusFilter === f.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 gap-1.5 text-xs text-muted-foreground"
          onClick={() => setSort((s) => (s === "recent" ? "alpha" : "recent"))}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sort === "recent" ? "Most recent" : "A → Z"}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted/40" style={{ opacity: 1 - i * 0.1 }} />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <FileText className="h-6 w-6 text-primary" />
          </span>
          <h2 className="mt-4 font-display text-lg font-bold">Your cabinet is empty</h2>
          <p className="mx-auto mt-1 mb-6 max-w-sm text-sm text-muted-foreground">
            Drafts you write and studies Ezra turns into documents are filed here automatically — nothing gets lost.
          </p>
          <div className="flex justify-center gap-2">
            <Button asChild className="gap-2"><Link to="/app/write"><FileText className="h-4 w-4" /> Start writing</Link></Button>
            <Button asChild variant="outline" className="gap-2"><Link to="/app/ezra"><Sparkles className="h-4 w-4" /> Ask Ezra</Link></Button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
          <h2 className="font-display text-base font-semibold">No documents match</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or filter.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d, i) => {
            const snippet = (d.content_text || "").slice(0, 160);
            const words = wordCount(d.content_text || "");
            return (
              <article
                key={d.id}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] card-elevate accent-draw rise-in"
                style={{ "--stagger-i": Math.min(i, 11) } as React.CSSProperties}
              >
                <Link to={`/app/write/${d.id}`} className="absolute inset-0 z-0" aria-label={`Open ${d.title || "Untitled Document"} in Write`} />

                {/* Paper preview — the snippet reads like the page it opens into */}
                <div className="pointer-events-none border-b border-border/50 bg-gradient-to-b from-muted/30 to-transparent px-4 pb-3 pt-4">
                  <h3 className="font-display text-sm font-semibold leading-snug text-foreground line-clamp-1">
                    {d.title || "Untitled Document"}
                  </h3>
                  <p
                    className="mt-2 min-h-[3.9em] text-[13px] italic leading-relaxed text-muted-foreground line-clamp-3"
                    style={{ fontFamily: "'Lora', Georgia, serif" }}
                  >
                    {snippet || "Empty document"}
                  </p>
                </div>

                <div className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <SourceBadge source={d.source} autoCreated={d.auto_created} />
                    {words > 0 && (
                      <span className="text-[10px] tabular-nums text-muted-foreground">{words.toLocaleString()} words</span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNowStrict(new Date(d.updated_at))} ago
                  </span>
                </div>

                {/* Actions — always visible on touch; hover-revealed on desktop
                    (md+) where the card itself signals interactivity on hover. */}
                <div className="absolute right-2 top-2 z-10 flex items-center gap-0.5 rounded-lg border border-border/60 bg-card/90 p-0.5 opacity-100 shadow-sm backdrop-blur transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); askEzra(d); }}
                        className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-md text-muted-foreground tactile hover:bg-primary/10 hover:text-primary"
                        aria-label="Ask Ezra about this document"
                      >
                        <MessagesSquare className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Ask Ezra about this</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); softDelete(d.id, d.title); }}
                        className="flex h-9 w-9 md:h-7 md:w-7 items-center justify-center rounded-md text-muted-foreground tactile hover:bg-destructive/10 hover:text-destructive"
                        aria-label="Move to trash"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Move to trash</TooltipContent>
                  </Tooltip>
                </div>
              </article>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
}
