import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface SessionListProps {
  activeSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  refreshKey: number;
}

export function SessionList({ activeSessionId, onSelect, onNew, refreshKey }: SessionListProps) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("partner_sessions" as any)
        .select("id, title, created_at, updated_at, messages")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (data) {
        setSessions(
          (data as any[]).map((s) => ({
            id: s.id,
            title: s.title,
            created_at: s.created_at,
            updated_at: s.updated_at,
            message_count: Array.isArray(s.messages) ? s.messages.length : 0,
          }))
        );
      }
      setLoading(false);
    })();
  }, [user, refreshKey]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("partner_sessions" as any).delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete session");
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success("Session deleted");
    }
  };

  return (
    <div className="w-64 flex flex-col">
      <div className="p-3 border-b border-border">
        <Button variant="outline" size="sm" className="w-full text-xs" onClick={onNew}>
          + New Session
        </Button>
      </div>
      <ScrollArea className="flex-1 max-h-72">
        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading…</p>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No sessions yet</p>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors hover:bg-muted group ${
                  activeSessionId === s.id ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium truncate flex-1">{s.title}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 md:h-5 md:w-5 opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0"
                    onClick={(e) => handleDelete(s.id, e)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mt-0.5">
                  <MessageSquare className="h-3 w-3" />
                  <span>{s.message_count} msgs</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(s.updated_at), { addSuffix: true })}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
