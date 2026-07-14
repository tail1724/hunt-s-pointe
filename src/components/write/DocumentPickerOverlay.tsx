import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { FileText, Loader2 } from "lucide-react";

interface DocRow {
  id: string;
  title: string;
  content_text: string;
  updated_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentId?: string;
}

function groupByRecency(docs: DocRow[]) {
  const now = Date.now();
  const day = 86400_000;
  const groups: Record<string, DocRow[]> = { Today: [], "Last 7 days": [], "Last 30 days": [], Older: [] };
  for (const d of docs) {
    const age = now - new Date(d.updated_at).getTime();
    if (age < day) groups.Today.push(d);
    else if (age < 7 * day) groups["Last 7 days"].push(d);
    else if (age < 30 * day) groups["Last 30 days"].push(d);
    else groups.Older.push(d);
  }
  return groups;
}

export function DocumentPickerOverlay({ open, onOpenChange, currentId }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("documents" as any)
        .select("id, title, content_text, updated_at")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (!cancelled) {
        setDocs(((data as any) as DocRow[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  const groups = groupByRecency(docs);

  const open_ = (id: string) => {
    onOpenChange(false);
    navigate(`/app/write/${id}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search your File Cabinet…" />
      <CommandList>
        {loading ? (
          <div className="py-8 flex items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading documents…
          </div>
        ) : (
          <>
            <CommandEmpty>No documents found.</CommandEmpty>
            {Object.entries(groups).map(([label, rows]) =>
              rows.length ? (
                <CommandGroup key={label} heading={label}>
                  {rows.map((d) => (
                    <CommandItem
                      key={d.id}
                      value={`${d.title} ${d.content_text?.slice(0, 80) ?? ""}`}
                      onSelect={() => open_(d.id)}
                      disabled={d.id === currentId}
                      className="gap-3"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-medium">
                          {d.title || "Untitled Document"}
                          {d.id === currentId && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">current</span>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {d.content_text?.slice(0, 90) || "Empty document"}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(d.updated_at).toLocaleDateString()}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null,
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
