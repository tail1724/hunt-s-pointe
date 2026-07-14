import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Editor } from "@tiptap/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, FileQuestion } from "lucide-react";
import { DocumentEditor } from "@/components/write/DocumentEditor";
import { EditorChrome } from "@/components/write/EditorChrome";
import { EditorToolbar } from "@/components/write/EditorToolbar";
import { EzraAssistBar } from "@/components/write/EzraAssistBar";
import { MarginRail } from "@/components/write/MarginRail";
import { HistoryDrawer } from "@/components/write/HistoryDrawer";
import { ProvenanceCertificate } from "@/components/write/ProvenanceCertificate";
import { DistributePanel } from "@/components/write/DistributePanel";
import { useProvenanceTracking } from "@/lib/provenance/useProvenanceTracking";
import { DocumentSwitcherBar } from "@/components/write/DocumentSwitcherBar";
import { useAutosave } from "@/hooks/useAutosave";
import { useActiveCollection } from "@/lib/collections/useActiveCollection";
import { tagArtifact } from "@/lib/collections/useCollections";
import { useDocumentAnnotations } from "@/lib/annotations/useDocumentAnnotations";
import { useDocumentVersions } from "@/lib/annotations/useDocumentVersions";
import type { DocumentVersion } from "@/lib/annotations/types";
import { useStyleGuide } from "@/lib/authenticity/useStyleGuide";
import { useVoiceProfile } from "@/lib/authenticity/useVoiceProfile";
import { CollectionPicker } from "@/components/collections/CollectionPicker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileNav } from "@/components/mobile/mobile-nav-context";
import { ArticleHeader, type ArticleMeta, type ArticleStatus } from "@/components/write/ArticleHeader";

interface DocRow {
  id: string;
  title: string;
  content: any;
  content_text: string;
  source: "manual" | "mary" | "build_prompts";
  auto_created: boolean;
  updated_at: string;
  dek?: string | null;
  byline?: string[] | null;
  section?: string | null;
  status?: ArticleStatus | null;
  story_tags?: string[] | null;
  publish_at?: string | null;
}

const DEFAULT_TITLE = "Untitled Document";
const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

/** Paper-shaped skeleton so opening the editor feels like a page settling in. */
function PageSkeleton({ message }: { message: string }) {
  const lineWidths = ["82%", "94%", "76%", "88%", "64%"];
  return (
    <div className="flex h-full flex-col editor-desk">
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto my-10 max-w-[816px] px-4">
          <div className="rounded-[6px] bg-card border border-border/40 shadow-[0_24px_60px_-24px_hsl(222_50%_8%/0.35),0_2px_6px_hsl(222_50%_8%/0.08)] px-10 pt-16 pb-24 md:px-20 md:pt-20">
            <div className="h-10 w-2/3 animate-pulse rounded-md bg-muted/70" />
            <div className="mt-10 space-y-4">
              {lineWidths.map((w, i) => (
                <div
                  key={i}
                  className="h-3.5 animate-pulse rounded bg-muted/50"
                  style={{ width: w, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground inline-flex w-full items-center justify-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {message}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * /app/write entry: spin up a blank document and redirect into the editor.
 * Uses replace() so the back button doesn't re-trigger creation.
 */
function BlankDocumentBootstrap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ranRef = useRef(false);

  useEffect(() => {
    if (!user || ranRef.current) return;
    ranRef.current = true;
    (async () => {
      // Reuse most recent blank/untouched doc if present, so refreshing /app/write
      // doesn't pile up empty rows.
      const { data: existing } = await supabase
        .from("documents" as any)
        .select("id, title, content_text, updated_at")
        .eq("user_id", user.id)
        .eq("title", DEFAULT_TITLE)
        .eq("content_text", "")
        .is("archived_at", null)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing && (existing as any).id) {
        navigate(`/app/write/${(existing as any).id}`, { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("documents" as any)
        .insert({
          user_id: user.id,
          title: DEFAULT_TITLE,
          content: EMPTY_DOC,
          content_text: "",
          source: "manual",
        } as any)
        .select("id")
        .single();
      if (error || !data) {
        toast.error("Couldn't open the editor");
        return;
      }
      navigate(`/app/write/${(data as any).id}`, { replace: true });
    })();
  }, [user, navigate]);

  return <PageSkeleton message="Opening a fresh page…" />;
}

function DocumentEditorPage({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { collection: writeCollection } = useActiveCollection("write");
  const [doc, setDoc] = useState<DocRow | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [contentText, setContentText] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [meta, setMeta] = useState<ArticleMeta>({
    dek: "",
    byline: [],
    section: "",
    status: "draft",
    storyTags: [],
    publishAt: null,
  });
  const [focusMode, setFocusMode] = useState(false);
  // Scrolled into the document: header bars tuck away, the floating toolbar
  // stays right above the page for editing from anywhere in the manuscript.
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();
  const { setOverride } = useMobileNav();

  // On mobile, hide the shell header while in focus mode so the editor owns
  // the screen — EditorChrome already provides its own exit-focus control.
  useEffect(() => {
    if (!isMobile) return;
    setOverride(focusMode ? { focusMode: true } : {});
    return () => setOverride({});
  }, [isMobile, focusMode, setOverride]);

  const dirtyRef = useRef(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Opening a different document starts back at the top with headers shown.
  useEffect(() => {
    setScrolled(false);
    scrollAreaRef.current?.scrollTo(0, 0);
  }, [documentId]);

  useEffect(() => {
    if (!user) return;
    dirtyRef.current = false;
    (async () => {
      const { data, error } = await supabase
        .from("documents" as any)
        .select("id, title, content, content_text, source, auto_created, updated_at, dek, byline, section, status, story_tags, publish_at")
        .eq("id", documentId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error || !data) { setNotFound(true); return; }
      const row = data as any as DocRow;
      setDoc(row);
      setTitle(row.title || "");
      setContent(row.content || EMPTY_DOC);
      setContentText(row.content_text || "");
      setMeta({
        dek: row.dek ?? "",
        byline: row.byline ?? [],
        section: row.section ?? "",
        status: (row.status as ArticleStatus) ?? "draft",
        storyTags: row.story_tags ?? [],
        publishAt: row.publish_at ?? null,
      });
    })();
  }, [user, documentId]);

  const saveValue = useMemo(
    () => ({ title, content, contentText, meta }),
    [title, content, contentText, meta],
  );

  const annotations = useDocumentAnnotations(documentId);
  const versions = useDocumentVersions(documentId);
  const styleGuide = useStyleGuide();
  const voiceProfile = useVoiceProfile();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [provenanceOpen, setProvenanceOpen] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  // Snapshot a human-attributed version at most once every 2 minutes of
  // active saving — every autosave tick would otherwise flood the History
  // drawer with near-duplicate entries.
  const lastVersionAtRef = useRef(0);
  const VERSION_INTERVAL_MS = 120_000;

  const { status, savedAt, flush } = useAutosave({
    value: saveValue,
    enabled: !!doc && !!user,
    delayMs: 8000,
    save: async (v) => {
      if (!user) return;
      const { error } = await supabase
        .from("documents" as any)
        .update({
          title: v.title || DEFAULT_TITLE,
          content: v.content as any,
          content_text: v.contentText,
          auto_created: false,
          dek: v.meta.dek || null,
          byline: v.meta.byline,
          section: v.meta.section || null,
          status: v.meta.status,
          story_tags: v.meta.storyTags,
          publish_at: v.meta.publishAt,
          headline: v.title || DEFAULT_TITLE,
        } as any)
        .eq("id", documentId)
        .eq("user_id", user.id);
      if (error) throw error;
      // Tag this document to the active Write collection (idempotent upsert).
      if (writeCollection) {
        const snippet = (v.contentText || "").trim().slice(0, 200);
        await tagArtifact({
          collectionId: writeCollection.id,
          userId: user.id,
          artifactType: "document",
          artifactId: documentId,
          previewTitle: (v.title || DEFAULT_TITLE).slice(0, 120),
          previewSnippet: snippet,
        }).catch(() => {});
      }
      const now = Date.now();
      if (now - lastVersionAtRef.current > VERSION_INTERVAL_MS) {
        lastVersionAtRef.current = now;
        void versions.record({ content: v.content, contentText: v.contentText, authorKind: "human" });
      }
    },
  });

  const [editor, setEditor] = useState<Editor | null>(null);

  useProvenanceTracking(documentId, editor?.view.dom as HTMLElement | null ?? null);

  const handleRestore = useCallback((version: DocumentVersion) => {
    if (!editor) return;
    editor.commands.setContent((version.content as any) ?? EMPTY_DOC);
    dirtyRef.current = true;
    setContent(version.content);
    setContentText(version.content_text);
    setHistoryOpen(false);
    toast.success("Restored — save to keep this version");
  }, [editor]);

  const wordCount = useMemo(
    () => (contentText.match(/\S+/g) || []).length,
    [contentText],
  );

  // Cleanup: if user navigates away without editing, soft-delete the blank shell.
  useEffect(() => {
    return () => {
      if (!user || dirtyRef.current) return;
      const cleanTitle = (title || "").trim();
      const cleanText = (contentText || "").trim();
      const isBlank = cleanText === "" && (cleanTitle === "" || cleanTitle === DEFAULT_TITLE);
      if (!isBlank) return;
      void supabase
        .from("documents" as any)
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", documentId)
        .eq("user_id", user.id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, user]);

  // Keyboard shortcuts: Cmd/Ctrl+S forces a save, Esc exits focus,
  // Cmd/Ctrl+. toggles it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault(); // stop the browser's Save-page dialog
        void flush();
        return;
      }
      if (e.key === "Escape" && focusMode) {
        const ae = document.activeElement as HTMLElement | null;
        if (ae?.closest('[role="dialog"], [data-radix-popper-content-wrapper]')) return;
        e.preventDefault();
        setFocusMode(false);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ".") {
        e.preventDefault();
        setFocusMode((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, flush]);

  useEffect(() => {
    if (!focusMode) return;
    try {
      if (sessionStorage.getItem("write.focusHintShown")) return;
      sessionStorage.setItem("write.focusHintShown", "1");
    } catch {}
    toast("Focus mode on", {
      description: "Press Esc or click Exit focus to leave.",
      duration: 4000,
    });
  }, [focusMode]);

  if (notFound) {
    return (
      <div className="flex h-full items-center justify-center editor-desk p-10">
        <div className="max-w-sm rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted/70">
            <FileQuestion className="h-5 w-5 text-muted-foreground" />
          </span>
          <h2 className="mt-3 font-display text-base font-semibold text-foreground">Page not found</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">This document doesn't exist or you don't have access to it.</p>
          <div className="flex justify-center gap-2">
            <Button onClick={() => navigate("/app/write")}>New document</Button>
            <Button variant="outline" onClick={() => navigate("/app/file-cabinet")}>File Cabinet</Button>
          </div>
        </div>
      </div>
    );
  }
  if (!doc || content === null) {
    return <PageSkeleton message="Loading your document…" />;
  }

  const showDropCap = wordCount > 120;

  const markDirty = () => { dirtyRef.current = true; };

  const headerHidden = scrolled && !focusMode;

  return (
    <div className="flex flex-col h-full editor-desk relative">
      {/* Header bars tuck away once the reader scrolls into the manuscript,
          and slide back when they return to the top. */}
      <div
        className={cn(
          "transition-all duration-300 ease-out overflow-hidden",
          headerHidden ? "max-h-0 opacity-0 pointer-events-none" : "max-h-40 opacity-100",
        )}
      >
        <EditorChrome
          title={title}
          status={status}
          savedAt={savedAt}
          contentText={contentText}
          wordCount={wordCount}
          focusMode={focusMode}
          onSave={flush}
          onToggleFocus={() => setFocusMode((v) => !v)}
          onBack={() => navigate("/app/file-cabinet")}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenProvenance={() => setProvenanceOpen(true)}
          onOpenDistribute={() => setDistributeOpen(true)}
        />
      </div>
      <EditorToolbar editor={editor} focusMode={focusMode} />
      <div
        className={cn(
          "transition-all duration-300 ease-out overflow-hidden",
          headerHidden ? "max-h-0 opacity-0 pointer-events-none" : "max-h-40 opacity-100",
        )}
      >
        <DocumentSwitcherBar currentId={documentId} hidden={focusMode} />
        {!focusMode && (
          <div className="border-b border-border/40 bg-background/60 backdrop-blur-sm px-4 py-1.5 flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">Context</span>
            <CollectionPicker surface="write" compact />
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 flex">
        <div
          ref={scrollAreaRef}
          className="flex-1 min-w-0 overflow-auto"
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 48)}
        >
          <div
            className={cn(
              "mx-auto px-4 transition-all duration-300 ease-out page-lift print:my-0 print:px-0 print:max-w-none print:shadow-none print:border-0",
              focusMode ? "max-w-[920px] my-6" : "max-w-[816px] my-10",
              showDropCap && "with-dropcap"
            )}
          >
            <div className="rounded-[6px] bg-card border border-border/40 shadow-[0_24px_60px_-24px_hsl(222_50%_8%/0.35),0_2px_6px_hsl(222_50%_8%/0.08)] print:shadow-none print:border-0 overflow-hidden">
              <div className="px-4 md:px-20 pt-16 md:pt-20">
                <input
                  value={title}
                  onChange={(e) => { markDirty(); setTitle(e.target.value); }}
                  placeholder="Headline"
                  className="w-full bg-transparent border-0 outline-none font-display text-[38px] md:text-[42px] font-extrabold tracking-tight leading-[1.1] text-foreground placeholder:text-muted-foreground/40 title-underline pb-3"
                  aria-label="Headline"
                />
                <ArticleHeader
                  value={meta}
                  onChange={(patch) => { markDirty(); setMeta((m) => ({ ...m, ...patch })); }}
                />
              </div>
              <DocumentEditor
                initialContent={content}
                onReady={setEditor}
                onPropose={annotations.propose}
                voiceLocks={voiceProfile.lockedTraits}
                styleRules={styleGuide.asRules()}
                onChange={(json, text) => {
                  markDirty();
                  setContent(json);
                  setContentText(text);
                }}
              />
            </div>
            {!focusMode && (
              <div className="text-center text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 mt-4 print:hidden">
                Page 1
              </div>
            )}
          </div>
        </div>
        {/* PressRoom rides beside the manuscript on desktop — margin-only,
            never editing the page directly (addendum feature 15). */}
        {!focusMode && (
          <aside className="hidden lg:block w-[330px] shrink-0 py-3 pr-3">
            <MarginRail
              documentId={documentId}
              editor={editor}
              annotations={annotations}
              versions={versions}
              voiceLocks={voiceProfile.lockedTraits}
              styleRules={styleGuide.asRules()}
            />
          </aside>
        )}
      </div>
      {/* Compact floating bar remains for smaller screens. */}
      <div className="lg:hidden">
        <EzraAssistBar
          editor={editor}
          annotations={annotations}
          versions={versions}
          voiceLocks={voiceProfile.lockedTraits}
          styleRules={styleGuide.asRules()}
          hidden={focusMode}
        />
      </div>
      <HistoryDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        versions={versions}
        onRestore={handleRestore}
      />
      <ProvenanceCertificate
        open={provenanceOpen}
        onOpenChange={setProvenanceOpen}
        documentId={documentId}
        versions={versions}
      />
      <DistributePanel
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
        documentId={documentId}
        title={title}
        contentText={contentText}
        meta={meta}
        voiceLocks={voiceProfile.lockedTraits}
      />
    </div>
  );
}

export default function Write() {
  const { documentId } = useParams();
  return documentId ? <DocumentEditorPage documentId={documentId} /> : <BlankDocumentBootstrap />;
}
