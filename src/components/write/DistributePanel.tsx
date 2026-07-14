import { useState } from "react";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ArticleMeta } from "./ArticleHeader";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  title: string;
  contentText: string;
  meta: ArticleMeta;
  voiceLocks?: string[];
}

const FN_URL = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;

async function authedFetch(name: string, body: unknown) {
  const { data: sess } = await supabase.auth.getSession();
  const tok = sess.session?.access_token;
  if (!tok) throw new Error("Not signed in");
  const resp = await fetch(FN_URL(name), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Error ${resp.status}`);
  return resp.json();
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const ASSET_LABELS: Record<string, string> = {
  seo: "SEO title & meta description",
  newsletter: "Newsletter edition",
  social_thread: "Social thread",
  excerpt: "Excerpt hook",
};

/**
 * The production-pipeline surface (addendum Group II, features 3-5, 9-10).
 * Everything generated here is machine-authored by design — it lives
 * outside the manuscript, is clearly labeled, and nothing publishes without
 * the editor reviewing it here first (addendum §C.0).
 */
export function DistributePanel({ open, onOpenChange, documentId, title, contentText, meta, voiceLocks }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  // CMS export
  const [format, setFormat] = useState<"json" | "markdown">("json");
  const runExport = async () => {
    setBusy("export");
    try {
      const j = await authedFetch("export-cms", {
        document_id: documentId, format, title,
        dek: meta.dek, byline: meta.byline, section: meta.section,
        status: meta.status, story_tags: meta.storyTags, publish_at: meta.publishAt,
        content_text: contentText,
      });
      download(j.filename, j.content);
      toast.success(`Exported ${j.filename}`);
    } catch (e: any) { toast.error(e.message || "Export failed"); }
    finally { setBusy(null); }
  };

  // Cascade
  const [assetTypes, setAssetTypes] = useState<string[]>(["seo", "newsletter"]);
  const [assets, setAssets] = useState<{ asset_type: string; content: string }[]>([]);
  const runCascade = async () => {
    if (assetTypes.length === 0) return;
    setBusy("cascade");
    try {
      const j = await authedFetch("derive-assets", { document_id: documentId, title, content_text: contentText, asset_types: assetTypes });
      setAssets(j.assets ?? []);
      toast.success(`Generated ${(j.assets ?? []).length} asset${(j.assets ?? []).length === 1 ? "" : "s"}`);
    } catch (e: any) { toast.error(e.message || "Cascade failed"); }
    finally { setBusy(null); }
  };

  // Headlines
  const [variants, setVariants] = useState<{ formula: string; headline: string; heuristic_score: number }[]>([]);
  const runHeadlines = async () => {
    setBusy("headlines");
    try {
      const j = await authedFetch("headline-sandbox", { document_id: documentId, content_text: contentText, current_headline: title });
      setVariants(j.variants ?? []);
    } catch (e: any) { toast.error(e.message || "Headline sandbox failed"); }
    finally { setBusy(null); }
  };

  // Localize
  const [locale, setLocale] = useState("en-GB");
  const [regionLabel, setRegionLabel] = useState("UK edition");
  const [localized, setLocalized] = useState<string | null>(null);
  const runLocalize = async () => {
    if (!locale.trim()) return;
    setBusy("localize");
    try {
      const j = await authedFetch("localize", {
        document_id: documentId, content_text: contentText, locale: locale.trim(),
        label: regionLabel, spelling_system: locale.startsWith("en-GB") ? "UK" : undefined,
        voice_locks: voiceLocks,
      });
      setLocalized(j.content ?? null);
    } catch (e: any) { toast.error(e.message || "Localization failed"); }
    finally { setBusy(null); }
  };

  // Bulk pipeline
  const [templateName, setTemplateName] = useState("News brief");
  const [instruction, setInstruction] = useState("Turn this raw input into a clean, standardized news brief.");
  const [rawInputs, setRawInputs] = useState("");
  const [pipelineResults, setPipelineResults] = useState<{ status: string; document_id?: string; error?: string }[]>([]);
  const runPipeline = async () => {
    const inputs = rawInputs.split(/\n-{3,}\n/).map((s) => s.trim()).filter(Boolean);
    if (inputs.length === 0) { toast.error("Add at least one raw input, separated by a line of ---"); return; }
    setBusy("pipeline");
    try {
      const j = await authedFetch("pipeline-run", { template_name: templateName, instruction, output_status: "draft", raw_inputs: inputs });
      setPipelineResults(j.results ?? []);
      const done = (j.results ?? []).filter((r: any) => r.status === "done").length;
      toast.success(`${done}/${inputs.length} drafts created in your Newsroom`);
    } catch (e: any) { toast.error(e.message || "Pipeline run failed"); }
    finally { setBusy(null); }
  };

  const copy = async (text: string) => { await navigator.clipboard.writeText(text); toast.success("Copied"); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Distribute</DialogTitle>
          <DialogDescription>
            Machine-authored, always reviewed here first — nothing publishes automatically.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="cascade">Cascade</TabsTrigger>
            <TabsTrigger value="headlines">Headlines</TabsTrigger>
            <TabsTrigger value="localize">Localize</TabsTrigger>
            <TabsTrigger value="bulk">Bulk</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-3 pt-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm">Format</Label>
              <div className="flex gap-1.5">
                <Button size="sm" variant={format === "json" ? "default" : "outline"} onClick={() => setFormat("json")}>Structured JSON</Button>
                <Button size="sm" variant={format === "markdown" ? "default" : "outline"} onClick={() => setFormat("markdown")}>Markdown + front-matter</Button>
              </div>
            </div>
            <Button size="sm" onClick={runExport} disabled={busy === "export"} className="gap-1.5">
              {busy === "export" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Export
            </Button>
          </TabsContent>

          <TabsContent value="cascade" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ASSET_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={assetTypes.includes(key)}
                    onCheckedChange={(v) => setAssetTypes((prev) => v ? [...prev, key] : prev.filter((k) => k !== key))}
                  />
                  {label}
                </label>
              ))}
            </div>
            <Button size="sm" onClick={runCascade} disabled={busy === "cascade"}>
              {busy === "cascade" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate cascade"}
            </Button>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {assets.map((a) => (
                <div key={a.asset_type} className="rounded-lg border border-border/60 bg-card/60 p-2.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{ASSET_LABELS[a.asset_type] ?? a.asset_type}</span>
                    <button onClick={() => copy(a.content)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                  </div>
                  <p className="whitespace-pre-wrap text-xs text-foreground">{a.content}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="headlines" className="space-y-3 pt-3">
            <Button size="sm" onClick={runHeadlines} disabled={busy === "headlines"}>
              {busy === "headlines" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate headline variants"}
            </Button>
            <p className="text-[11px] text-muted-foreground">Heuristic scores — formula fit and length/clarity only, not a trained CTR model.</p>
            <div className="space-y-2">
              {variants.map((v) => (
                <div key={v.formula} className="rounded-lg border border-border/60 bg-card/60 p-2.5">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-ai">{v.formula.replace(/_/g, " ")}</span>
                    <span className="text-[10px] text-muted-foreground">{Math.round(v.heuristic_score * 100)}</span>
                  </div>
                  <p className="text-sm text-foreground">{v.headline}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="localize" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Locale</Label>
                <Input value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="en-GB" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={regionLabel} onChange={(e) => setRegionLabel(e.target.value)} placeholder="UK edition" />
              </div>
            </div>
            <Button size="sm" onClick={runLocalize} disabled={busy === "localize"}>
              {busy === "localize" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate regional variant"}
            </Button>
            {localized && (
              <div className="max-h-56 overflow-y-auto rounded-lg border border-border/60 bg-card/60 p-2.5">
                <div className="mb-1 flex justify-end">
                  <button onClick={() => copy(localized)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                </div>
                <p className="whitespace-pre-wrap text-xs text-foreground">{localized}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bulk" className="space-y-3 pt-3">
            <p className="text-[11px] text-muted-foreground">
              Batch raw inputs — press releases, wire copy, transcripts — into standardized drafts. Separate inputs with a line of <code>---</code>. Every output lands in your Newsroom as a draft; nothing auto-publishes.
            </p>
            <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="Template name" />
            <Input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Instruction" />
            <Textarea rows={5} value={rawInputs} onChange={(e) => setRawInputs(e.target.value)} placeholder={"First raw input…\n---\nSecond raw input…"} />
            <Button size="sm" onClick={runPipeline} disabled={busy === "pipeline"}>
              {busy === "pipeline" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Run pipeline"}
            </Button>
            {pipelineResults.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {pipelineResults.map((r, i) => (
                  <li key={i}>{r.status === "done" ? `✓ Draft created` : `✕ Failed — ${r.error}`}</li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
