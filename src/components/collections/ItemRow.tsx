import { useState } from "react";
import { FileText, Image as ImageIcon, Link as LinkIcon, MoreVertical, NotebookPen, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import type { CollectionItem } from "@/lib/collections/types";

const ICONS = {
  text: NotebookPen,
  file: FileText,
  link: LinkIcon,
  image: ImageIcon,
} as const;

// Per-kind tint so a mixed list scans by shape *and* color.
const TINTS = {
  text: "bg-primary/10 text-primary",
  file: "bg-accent/15 text-accent",
  link: "bg-[hsl(210_80%_50%/0.12)] text-[hsl(210_80%_45%)] dark:text-[hsl(210_80%_65%)]",
  image: "bg-[hsl(150_60%_40%/0.12)] text-[hsl(150_60%_32%)] dark:text-[hsl(150_55%_55%)]",
} as const;

interface Props {
  item: CollectionItem;
  onDelete: (id: string) => void;
}

export function ItemRow({ item, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[item.kind];
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border bg-card/60 p-3 transition-colors hover:bg-card hover:border-primary/30">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TINTS[item.kind]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <button onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {item.title || (item.kind === "link" ? item.source_url : "(untitled)")}
          </p>
          {item.status === "pending" && (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Loader2 className="h-3 w-3 animate-spin" /> Ingesting
            </Badge>
          )}
          {item.status === "error" && (
            <Badge variant="destructive" className="gap-1 text-[10px]">
              <AlertCircle className="h-3 w-3" /> Failed
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {item.char_count.toLocaleString()} chars
          {item.mime_type ? ` · ${item.mime_type.split("/").pop()}` : ""}
        </p>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="opacity-0 transition-opacity group-hover:opacity-100">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpen(true)}>View extracted text</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">{item.title || "Item"}</DialogTitle>
          </DialogHeader>
          {item.status === "error" && item.error_message && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {item.error_message}
            </div>
          )}
          {item.source_url && (
            <a href={item.source_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
              {item.source_url}
            </a>
          )}
          <pre className="mt-2 flex-1 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-relaxed text-foreground">
{item.body_text || "(no extracted text)"}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
