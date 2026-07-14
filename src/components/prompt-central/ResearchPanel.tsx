import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Globe, Database, Loader2, ArrowDownToLine, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface ResearchPanelProps {
  onInject: (text: string) => void;
  onClose: () => void;
}

interface ResearchResult {
  title: string;
  snippet: string;
  source?: string;
}

interface KBEntry {
  id: string;
  title: string;
  content_type: string;
  content_text: string | null;
}

export function ResearchPanel({ onInject, onClose }: ResearchPanelProps) {
  const { user } = useAuth();

  // Web Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ResearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [rawResearch, setRawResearch] = useState("");

  // Knowledge Base state
  const [kbQuery, setKbQuery] = useState("");
  const [kbResults, setKbResults] = useState<KBEntry[]>([]);
  const [kbLoading, setKbLoading] = useState(false);

  const doWebSearch = async () => {
    if (!searchQuery.trim() || searchLoading) return;
    setSearchLoading(true);
    setRawResearch("");
    setSearchResults([]);

    try {
      const { data: sessData } = await supabase.auth.getSession();
      const token = sessData.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/prompt-partner`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: searchQuery }],
            mode: "research",
          }),
        }
      );

      if (!resp.ok) throw new Error("Research request failed");
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              full += content;
              setRawResearch(full);
            }
          } catch {}
        }
      }

      // Parse structured results from the AI response
      const sections = full.split(/##\s+/).filter(Boolean);
      const results: ResearchResult[] = sections.slice(0, 5).map((s) => {
        const lines = s.trim().split("\n");
        return {
          title: lines[0]?.replace(/^\*\*|\*\*$/g, "").trim() || "Finding",
          snippet: lines.slice(1).join("\n").trim(),
        };
      });
      if (results.length > 0) setSearchResults(results);
    } catch (e) {
      console.error(e);
      toast.error("Research failed");
    } finally {
      setSearchLoading(false);
    }
  };

  const doKBSearch = async () => {
    if (!kbQuery.trim() || kbLoading || !user) return;
    setKbLoading(true);
    try {
      const [entriesRes, stacksRes] = await Promise.all([
        supabase
          .from("knowledge_entries")
          .select("id, title, content_type, content_text")
          .eq("user_id", user.id)
          .ilike("title", `%${kbQuery}%`)
          .limit(10),
        supabase
          .from("context_stacks")
          .select("id, name, category, description")
          .ilike("name", `%${kbQuery}%`)
          .limit(10),
      ]);

      const entries: KBEntry[] = (entriesRes.data || []).map((e) => ({
        id: e.id,
        title: e.title,
        content_type: e.content_type,
        content_text: e.content_text,
      }));

      const stacks: KBEntry[] = (stacksRes.data || []).map((s) => ({
        id: s.id,
        title: s.name,
        content_type: "stack",
        content_text: s.description,
      }));

      setKbResults([...entries, ...stacks]);
    } catch (e) {
      console.error(e);
      toast.error("Knowledge Base search failed");
    } finally {
      setKbLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col border-l border-border bg-card/60 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-display text-sm font-semibold">Research</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="web" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 justify-start bg-transparent">
          <TabsTrigger value="web" className="gap-1.5 text-xs">
            <Globe className="h-3.5 w-3.5" /> Web Search
          </TabsTrigger>
          <TabsTrigger value="kb" className="gap-1.5 text-xs">
            <Database className="h-3.5 w-3.5" /> Knowledge Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="web" className="flex-1 flex flex-col overflow-hidden mt-0 px-4 py-3 gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doWebSearch();
            }}
            className="flex gap-2"
          >
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Research a topic…"
              className="text-sm"
            />
            <Button type="submit" size="icon" disabled={searchLoading || !searchQuery.trim()}>
              {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>

          <div className="flex-1 overflow-y-auto space-y-2">
            {searchResults.length > 0
              ? searchResults.map((r, i) => (
                  <Card key={i} className="bg-muted/50">
                    <CardContent className="p-3 space-y-2">
                      <p className="text-xs font-semibold">{r.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3">{r.snippet.slice(0, 200)}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5"
                        onClick={() => {
                          onInject(r.snippet);
                          toast.success("Injected into chat");
                        }}
                      >
                        <ArrowDownToLine className="h-3 w-3" /> Inject
                      </Button>
                    </CardContent>
                  </Card>
                ))
              : rawResearch && (
                  <div className="space-y-2">
                    <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                      <ReactMarkdown>{rawResearch}</ReactMarkdown>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => {
                        onInject(rawResearch);
                        toast.success("Research injected into chat");
                      }}
                    >
                      <ArrowDownToLine className="h-3 w-3" /> Inject All
                    </Button>
                  </div>
                )}
          </div>
        </TabsContent>

        <TabsContent value="kb" className="flex-1 flex flex-col overflow-hidden mt-0 px-4 py-3 gap-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              doKBSearch();
            }}
            className="flex gap-2"
          >
            <Input
              value={kbQuery}
              onChange={(e) => setKbQuery(e.target.value)}
              placeholder="Search your knowledge…"
              className="text-sm"
            />
            <Button type="submit" size="icon" disabled={kbLoading || !kbQuery.trim()}>
              {kbLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>

          <div className="flex-1 overflow-y-auto space-y-2">
            {kbResults.length === 0 && kbQuery && !kbLoading && (
              <p className="text-xs text-muted-foreground text-center py-4">No results found</p>
            )}
            {kbResults.map((entry) => (
              <Card key={entry.id} className="bg-muted/50">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold flex-1 truncate">{entry.title}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {entry.content_type}
                    </Badge>
                  </div>
                  {entry.content_text && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{entry.content_text.slice(0, 150)}</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={() => {
                      onInject(entry.content_text || entry.title);
                      toast.success("Injected into chat");
                    }}
                  >
                    <ArrowDownToLine className="h-3 w-3" /> Inject
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
