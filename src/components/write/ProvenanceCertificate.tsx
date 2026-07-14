import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import { ShieldCheck, ShieldAlert, Clock, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProvenanceLedger } from "@/lib/provenance/useProvenanceLedger";
import { computeAuthorshipRatio } from "@/lib/provenance/authorshipRatio";
import type { useDocumentVersions } from "@/lib/annotations/useDocumentVersions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  versions: ReturnType<typeof useDocumentVersions>;
}

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * The "Proof of Human Work" certificate (addendum feature 11): a plain-
 * language summary of the hash-chained session ledger plus the attributed
 * version history, so an editor can see — and eventually export — evidence
 * that a manuscript was composed organically over time, not generated in a
 * single batch. Aggregate telemetry only; never keystroke content.
 */
export function ProvenanceCertificate({ open, onOpenChange, documentId, versions }: Props) {
  const ledger = useProvenanceLedger(open ? documentId : null);
  const authorship = computeAuthorshipRatio(versions.versions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-verified" /> Provenance certificate
          </DialogTitle>
          <DialogDescription>
            Aggregate session telemetry only — never keystroke content. Attests how this
            manuscript was composed, not what was typed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
            ledger.chainIntact === false ? "border-guardrail/40 bg-guardrail/10 text-guardrail" : "border-verified/30 bg-verified/10 text-verified",
          )}>
            {ledger.chainIntact === false ? <ShieldAlert className="h-4 w-4 shrink-0" /> : <ShieldCheck className="h-4 w-4 shrink-0" />}
            {ledger.loading ? "Verifying chain…"
              : ledger.chainIntact === null ? "No sealed sessions yet — keep writing."
              : ledger.chainIntact ? "Chain verified — no gaps or tampering detected."
              : "Chain broken — verification failed."}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border/60 bg-card/60 p-3">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground"><Clock className="h-3 w-3" /> Active writing time</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{formatDuration(ledger.totals.activeSeconds)}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-card/60 p-3">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground"><Keyboard className="h-3 w-3" /> Sealed sessions</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{ledger.rows.length}</p>
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">Authorship split (by character volume)</p>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-verified" style={{ width: `${authorship.humanPct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {authorship.humanPct.toFixed(0)}% human-typed · {(100 - authorship.humanPct).toFixed(0)}% from applied PressRoom suggestions
            </p>
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground/80">
            Certificates travel with CMS exports as metadata. Provenance tracking can be turned
            off entirely in Settings — see our Privacy Policy for what's recorded.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
