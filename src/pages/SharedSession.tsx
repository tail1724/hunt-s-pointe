import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

export default function SharedSession() {
  const { slug } = useParams<{ slug: string }>();
  const [title, setTitle] = useState<string>("Shared Session");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [redact, setRedact] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      // Public access goes through a security-definer RPC that only returns
      // the safe columns (title, messages, redaction flag, expiry) for a single slug.
      const { data, error: e1 } = await supabase
        .rpc("get_shared_session" as any, { _slug: slug });
      if (e1) { setError("This link is invalid or expired."); setLoading(false); return; }
      const row: any = Array.isArray(data) ? data[0] : data;
      if (!row) { setError("This link is invalid or expired."); setLoading(false); return; }
      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        setError("This link has expired."); setLoading(false); return;
      }
      setRedact(!!row.redact_user_msgs);
      setTitle(row.title || "Shared Session");
      setMessages(Array.isArray(row.messages) ? row.messages : []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-dvh flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (error) return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-3">
      <p className="text-muted-foreground">{error}</p>
      <Link to="/" className="text-primary text-sm underline">Go home</Link>
    </div>
  );

  const visible = redact ? messages.filter((m) => m.role === "assistant") : messages;

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-8 pb-4 border-b border-border">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Shared from Ezra</p>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="text-xs text-muted-foreground mt-1">Read-only · Powered by Lovable</p>
        </header>

        <div className="space-y-6">
          {visible.map((m, i) => (
            <div key={i} className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {m.role === "user" ? "User" : "Ezra"}
              </div>
              <div className={m.role === "user" ? "rounded-lg bg-muted/60 p-3 text-sm" : "prose prose-sm dark:prose-invert max-w-none"}>
                {m.role === "user" ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-12 pt-4 border-t border-border text-center">
          <Link to="/" className="text-xs text-primary underline">Build your own with Ezra →</Link>
        </footer>
      </div>
    </div>
  );
}
