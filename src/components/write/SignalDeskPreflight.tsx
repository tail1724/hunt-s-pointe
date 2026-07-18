import { useEffect, useRef, useState } from "react";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { ArticleMeta } from "./ArticleHeader";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  title: string;
  contentText: string;
  meta: ArticleMeta;
}

type Stage = "review" | "staging" | "staged" | "conflict" | "error";

type StageResult = {
  ok: boolean;
  signaldesk_id?: string | null;
  admin_path?: string | null;
  source_version?: number;
  revision?: number;
  action?: "created" | "updated";
  replayed?: boolean;
  error?: string;
};

type ConflictInfo = {
  code: "stale_revision" | "editorial_locked";
  current_revision: number | null;
  workflow_stage: string | null;
  admin_path: string | null;
};

type StatusResult = {
  status?: string;
  error_code?: string | null;
  draft_id?: string | null;
  admin_path?: string | null;
  revision?: number | null;
  workflow_stage?: string | null;
  updatedAt?: string | null;
};

const FN_URL = (name: string) => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
// Optional — enables a real "Open in Payload" link. Without it the receipt
// still shows the admin path, just not as a clickable absolute URL.
const SIGNALDESK_URL = import.meta.env.VITE_SIGNALDESK_URL as string | undefined;

/** Error that keeps the structured response body (conflict codes etc.). */
class FunctionError extends Error {
  status: number;
  detail: Record<string, unknown>;
  constructor(status: number, detail: Record<string, unknown>) {
    super(
      typeof detail.error === "object" && detail.error !== null
        ? (detail.error as { message?: string }).message ?? `Error ${status}`
        : String(detail.error ?? `Error ${status}`),
    );
    this.status = status;
    this.detail = detail;
  }
}

async function authedFetch<T>(name: string, body: unknown): Promise<T> {
  const { data: sess } = await supabase.auth.getSession();
  const tok = sess.session?.access_token;
  if (!tok) throw new Error("Not signed in");
  const resp = await fetch(FN_URL(name), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
    body: JSON.stringify(body),
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new FunctionError(resp.status, json);
  return json as T;
}

function wordCount(text: string) {
  return (text.match(/\S+/g) || []).length;
}

/**
 * The Hunt's Pointe -> SignalDesk transfer preflight (Epic F, VaporNet
 * Americana plan). Replaces the bare "Stage in SignalDesk" button: shows
 * what will be sent, requires an explicit draft-only acknowledgement, and
 * — once staged — polls SignalDesk for the draft's real downstream status
 * instead of leaving the editor with only a one-time toast.
 *
 * The transfer itself is server-enforced as draft-only on SignalDesk's side
 * (see app/api/integrations/hunts-pointe/route.ts) — this UI cannot bypass
 * that; it can only make the existing boundary legible before the editor
 * commits to it.
 */
export function SignalDeskPreflight({ open, onOpenChange, documentId, title, contentText, meta }: Props) {
  const [stage, setStage] = useState<Stage>("review");
  const [acknowledged, setAcknowledged] = useState(false);
  const [result, setResult] = useState<StageResult | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [statusResult, setStatusResult] = useState<StatusResult | null>(null);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      setStage("review");
      setAcknowledged(false);
      setResult(null);
      setStatusResult(null);
      setConflict(null);
      if (pollRef.current) window.clearInterval(pollRef.current);
    }
  }, [open]);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);

  const words = wordCount(contentText);
  const fieldsComplete = title.trim().length > 0 && contentText.trim().length > 0;
  const hasByline = meta.byline.length > 0;
  const hasSection = meta.section.trim().length > 0;

  async function pollStatus() {
    try {
      const j = await authedFetch<StatusResult>("signaldesk-status", { document_id: documentId });
      setStatusResult(j);
      if (j.status === "published" && pollRef.current) {
        window.clearInterval(pollRef.current);
      }
    } catch {
      // Best-effort — a failed poll just means the chip keeps its last state
    }
  }

  async function confirm() {
    if (!acknowledged) return;
    setStage("staging");
    try {
      const j = await authedFetch<StageResult>("push-signaldesk", {
        document_id: documentId,
        title,
        dek: meta.dek || undefined,
        byline: meta.byline,
        section: meta.section || undefined,
        story_tags: meta.storyTags,
        publish_at: meta.publishAt || undefined,
        content_text: contentText,
      });
      setResult(j);
      setStage("staged");
      void pollStatus();
      pollRef.current = window.setInterval(pollStatus, 15_000);
    } catch (e) {
      // PRD §7.2 conflicts come back as structured 409s — show what happened
      // and the way forward instead of a generic failure.
      if (e instanceof FunctionError && e.status === 409 && typeof e.detail.code === "string") {
        setConflict({
          code: e.detail.code as ConflictInfo["code"],
          current_revision: (e.detail.current_revision as number | null) ?? null,
          workflow_stage: (e.detail.workflow_stage as string | null) ?? null,
          admin_path: (e.detail.admin_path as string | null) ?? null,
        });
        setStage("conflict");
        return;
      }
      const message = e instanceof Error ? e.message : "Stage to SignalDesk failed";
      setResult({ ok: false, error: message });
      setStage("error");
    }
  }

  const adminUrl = result?.admin_path
    ? SIGNALDESK_URL
      ? `${SIGNALDESK_URL.replace(/\/$/, "")}${result.admin_path}`
      : null
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Stage this article for editorial review</DialogTitle>
          <DialogDescription>
            Nothing publishes from this action. SignalDesk will create a new Payload draft with
            provenance and an audit event — a human editor still has to publish it there.
          </DialogDescription>
        </DialogHeader>

        {(stage === "review" || stage === "staging") && (
          <div className="space-y-3 py-1">
            <PreflightRow ok={fieldsComplete} label="Article fields" detail={`${words.toLocaleString()} words`} />
            <PreflightRow
              ok={hasByline}
              warn={!hasByline}
              label="Byline"
              detail={hasByline ? meta.byline.join(", ") : "No byline set — SignalDesk will still accept the draft"}
            />
            <PreflightRow
              ok={hasSection}
              warn={!hasSection}
              label="Destination section"
              detail={
                hasSection
                  ? `${meta.section} — matched automatically if it exists, otherwise queued for editor review`
                  : "Not set — will be queued for a managing editor to assign"
              }
            />
            <PreflightRow ok={false} neutral label="Media rights" detail="No media attached to this document" />
            <PreflightRow ok label="Destination" detail="Hampton Roads History" />
            <PreflightRow
              ok
              label="Handoff contract"
              detail="EditorialPackage v1 — revision lineage, checksum, provenance, and a validation snapshot travel with the draft"
            />

            <label className="flex items-start gap-2.5 pt-2 text-sm text-foreground">
              <Checkbox
                checked={acknowledged}
                onCheckedChange={(v) => setAcknowledged(v === true)}
                disabled={stage === "staging"}
              />
              I understand this creates a draft and requires a human editor to publish.
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={stage === "staging"}>
                Cancel
              </Button>
              <Button onClick={confirm} disabled={!acknowledged || stage === "staging"} className="gap-1.5">
                {stage === "staging" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Signing and staging…
                  </>
                ) : (
                  "Stage review draft"
                )}
              </Button>
            </div>
          </div>
        )}

        {stage === "staged" && result && (
          <div className="space-y-3 py-1">
            <div className="flex items-start gap-3 rounded-lg border border-verified/30 bg-verified/10 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verified" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {result.replayed
                    ? "Already staged in SignalDesk"
                    : result.action === "updated"
                      ? "Linked draft updated in SignalDesk"
                      : "Draft created in SignalDesk"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  ID {result.signaldesk_id ?? "unknown"} · revision {result.revision ?? result.source_version ?? "?"} · status:
                  review draft — remains unpublished until an editor reviews it.
                </p>
              </div>
            </div>

            {statusResult && (
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground w-fit">
                <span className={cn("h-1.5 w-1.5 rounded-full", statusResult.status === "published" ? "bg-verified" : "bg-guardrail")} />
                Downstream status: {statusResult.status ?? "unknown"}
                {statusResult.workflow_stage ? ` · stage: ${statusResult.workflow_stage.replace(/_/g, " ")}` : ""}
                {typeof statusResult.revision === "number" ? ` · rev ${statusResult.revision}` : ""}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {adminUrl ? (
                <Button asChild className="gap-1.5">
                  <a href={adminUrl} target="_blank" rel="noreferrer">
                    Open in Payload <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              ) : (
                <Button disabled title="Set VITE_SIGNALDESK_URL to enable a direct link">
                  {result.admin_path ?? "Admin path unavailable"}
                </Button>
              )}
            </div>
          </div>
        )}

        {stage === "conflict" && conflict && (
          <div className="space-y-3 py-1">
            <div className="flex items-start gap-3 rounded-lg border border-guardrail/30 bg-guardrail/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-guardrail" />
              <div className="text-sm">
                <p className="font-medium text-foreground">
                  {conflict.code === "stale_revision"
                    ? "SignalDesk already holds a newer revision"
                    : "This story is now in editorial review"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {conflict.code === "stale_revision" ? (
                    <>
                      The linked article is at revision {conflict.current_revision ?? "?"} — this push did not
                      overwrite it. Pushing again will send the next revision on top of the current one.
                    </>
                  ) : (
                    <>
                      An editor moved the story to “{conflict.workflow_stage ?? "review"}”, so Hunt's Pointe can no
                      longer overwrite it. Nothing was changed — request edits through the editor in Payload.
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {conflict.admin_path && SIGNALDESK_URL ? (
                <Button asChild className="gap-1.5">
                  <a
                    href={`${SIGNALDESK_URL.replace(/\/$/, "")}${conflict.admin_path}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Payload <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              ) : conflict.code === "stale_revision" ? (
                <Button onClick={() => setStage("review")}>Review and push again</Button>
              ) : null}
            </div>
          </div>
        )}

        {stage === "error" && result && (
          <div className="space-y-3 py-1">
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Stage to SignalDesk failed</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{result.error}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => setStage("review")}>Try again</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PreflightRow({
  ok,
  warn,
  neutral,
  label,
  detail,
}: {
  ok: boolean;
  warn?: boolean;
  neutral?: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-t border-border/50 py-2 text-sm first:border-t-0 first:pt-0">
      <span className="text-foreground">{label}</span>
      <span
        className={cn(
          "text-right text-xs",
          neutral ? "text-muted-foreground" : warn ? "text-amber-600 dark:text-amber-400" : ok ? "text-verified" : "text-muted-foreground",
        )}
      >
        {detail}
      </span>
    </div>
  );
}
