import { Link } from "react-router-dom";
import { ArrowUpRight, Hexagon, FileText, Image as ImageIcon } from "lucide-react";
import type { CollectionArtifact } from "@/lib/collections/types";
import { formatDistanceToNowStrict } from "date-fns";

const ICONS = {
  mary_session: Hexagon,
  document: FileText,
  image: ImageIcon,
} as const;

const LABELS = {
  mary_session: "Ezra thread",
  document: "Document",
  image: "Image",
} as const;

interface Props {
  artifact: CollectionArtifact;
}

export function ArtifactRow({ artifact }: Props) {
  const Icon = ICONS[artifact.artifact_type];
  const href =
    artifact.artifact_type === "mary_session"
      ? `/app/ezra?session=${artifact.artifact_id}`
      : artifact.artifact_type === "document"
        ? `/app/write/${artifact.artifact_id}`
        : `/app/file-cabinet`;
  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 transition-all card-elevate hover:bg-card hover:border-primary/40"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 transition-transform duration-200 group-hover:scale-105">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {artifact.preview_title || "(untitled)"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {LABELS[artifact.artifact_type]} · {formatDistanceToNowStrict(new Date(artifact.created_at))} ago
        </p>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 -translate-x-1 group-hover:translate-x-0 group-hover:opacity-100" />
    </Link>
  );
}
