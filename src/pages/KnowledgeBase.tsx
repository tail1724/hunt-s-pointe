import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogTrigger as DialogTrigger,
} from "@/components/ui/responsive-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { StackPicker } from "@/components/workspace/StackPicker";
import { Plus, Trash2, Edit2, Upload, FileText, File, Lock, ChevronRight, User, BookOpen, Database } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

// ── Modules Tab (from Library) ──
const LAYERS = [
  { key: "visual", label: "Visual" },
  { key: "environmental", label: "Environmental" },
  { key: "motion", label: "Motion" },
  { key: "sonic", label: "Audio" },
  { key: "narrative", label: "Narrative" },
  { key: "saas_params", label: "Parameters" },
] as const;

function ModulesTab() {
  const [stacks, setStacks] = useState<Tables<"context_stacks">[]>([]);
  useEffect(() => {
    supabase.from("context_stacks").select("*").order("sort_order").then(({ data }) => {
      if (data) setStacks(data);
    });
  }, []);

  return (
    <Tabs defaultValue="visual">
      <TabsList className="flex flex-wrap h-auto gap-1">
        {LAYERS.map((l) => (
          <TabsTrigger key={l.key} value={l.key} className="text-xs">{l.label}</TabsTrigger>
        ))}
      </TabsList>
      {LAYERS.map((l) => {
        const layerStacks = stacks.filter((s) => s.layer === l.key);
        const categories = [...new Set(layerStacks.map((s) => s.category))];
        return (
          <TabsContent key={l.key} value={l.key} className="mt-4">
            {layerStacks.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">No modules in this layer yet.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat} className="mb-6">
                  <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">{cat}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {layerStacks.filter((s) => s.category === cat).map((s) => (
                      <div key={s.id} className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
                        <p className="font-display text-sm font-semibold">{s.name}</p>
                        {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
                        {s.positive_keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {s.positive_keywords.slice(0, 5).map((kw, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

// ── Personas Tab (from Personas page) ──
function PersonasTab() {
  const { user } = useAuth();
  const [personas, setPersonas] = useState<Tables<"personas">[]>([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [lockedStacks, setLockedStacks] = useState<string[]>([]);
  const [parentId, setParentId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    supabase.from("personas").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setPersonas(data);
    });
  }, [user]);

  useEffect(load, [load]);

  const resetForm = () => { setName(""); setDesc(""); setLockedStacks([]); setParentId(null); setEditId(null); };

  const save = async () => {
    if (!user || !name.trim()) return;
    if (editId) {
      const { error } = await supabase.from("personas").update({ name, description: desc || null, locked_stacks: lockedStacks }).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Persona updated!");
    } else {
      const { error } = await supabase.from("personas").insert({
        user_id: user.id, name, description: desc || null, locked_stacks: lockedStacks, parent_id: parentId,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Persona created!");
    }
    resetForm(); setOpen(false); load();
  };

  const remove = async (id: string) => {
    await supabase.from("personas").delete().eq("id", id);
    toast.success("Persona deleted"); load();
  };

  const startEdit = (p: Tables<"personas">) => {
    setEditId(p.id); setName(p.name); setDesc(p.description || ""); setLockedStacks(p.locked_stacks as string[]); setOpen(true);
  };

  const topLevel = personas.filter((p) => !p.parent_id);
  const children = (pid: string) => personas.filter((p) => p.parent_id === pid);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 rounded-lg bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> New Persona</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-display">{editId ? "Edit Persona" : "Create Persona"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Persona" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Describe the persona..." /></div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Locked Stacks</Label>
                <p className="text-xs text-muted-foreground">Auto-applied when this persona is active.</p>
                <StackPicker selectedIds={lockedStacks} onChange={setLockedStacks} />
              </div>
              <Button onClick={save} className="w-full rounded-lg bg-primary text-primary-foreground">{editId ? "Save Changes" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {personas.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-muted-foreground">
          <User className="mb-3 h-10 w-10" />
          <p>No personas yet. Create one to save your context presets.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topLevel.map((p) => {
            const kids = children(p.id);
            const stacks = p.locked_stacks as string[];
            return (
              <Collapsible key={p.id}>
                <Card className="border-border shadow-[var(--shadow-card)]">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="flex items-center gap-2">
                      {kids.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight className="h-3.5 w-3.5" /></Button>
                        </CollapsibleTrigger>
                      )}
                      <CardTitle className="font-display text-base">{p.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(p)} className="h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"><Edit2 className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p.id)} className="h-10 w-10 md:h-8 md:w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{p.description || "No description"}</p>
                    {stacks.length > 0 && (
                      <p className="mt-2 text-xs text-accent font-medium flex items-center gap-1"><Lock className="h-3 w-3" /> {stacks.length} locked stacks</p>
                    )}
                  </CardContent>
                </Card>
                {kids.length > 0 && (
                  <CollapsibleContent>
                    <div className="ml-6 mt-2 space-y-2 border-l-2 border-border pl-4">
                      {kids.map((k) => (
                        <Card key={k.id} className="border-border shadow-[var(--shadow-card)]">
                          <CardHeader className="flex flex-row items-start justify-between pb-2">
                            <CardTitle className="font-display text-sm">{k.name}</CardTitle>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => startEdit(k)} className="h-9 w-9 md:h-7 md:w-7 text-muted-foreground hover:text-foreground"><Edit2 className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => remove(k.id)} className="h-9 w-9 md:h-7 md:w-7 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-muted-foreground">{k.description || "No description"}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── My Data Tab ──
type KnowledgeEntry = {
  id: string;
  user_id: string;
  title: string;
  content_type: string;
  content_text: string | null;
  file_path: string | null;
  file_name: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
};

function MyDataTab() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    if (!user) return;
    supabase
      .from("knowledge_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setEntries(data as KnowledgeEntry[]);
      });
  }, [user]);

  useEffect(load, [load]);

  const saveText = async () => {
    if (!user || !title.trim()) return;
    const { error } = await supabase.from("knowledge_entries").insert({
      user_id: user.id,
      title,
      content_type: "text",
      content_text: content,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Knowledge entry added!");
    setTitle(""); setContent(""); setDialogOpen(false); load();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = `knowledge/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("generated-media").upload(path, file);
      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("knowledge_entries").insert({
        user_id: user.id,
        title: file.name,
        content_type: "file",
        file_path: path,
        file_name: file.name,
        metadata: { size: file.size, type: file.type },
      } as any);
      if (insertError) throw insertError;
      toast.success(`"${file.name}" uploaded!`);
      load();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeEntry = async (id: string) => {
    await supabase.from("knowledge_entries").delete().eq("id", id);
    toast.success("Entry removed");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5 rounded-lg bg-primary text-primary-foreground"><Plus className="h-4 w-4" /> Add Text Entry</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">Add Knowledge Entry</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Entry title" /></div>
              <div className="space-y-2"><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste your content here..." rows={6} /></div>
              <Button onClick={saveText} className="w-full rounded-lg bg-primary text-primary-foreground">Save Entry</Button>
            </div>
          </DialogContent>
        </Dialog>
        <label>
          <input type="file" className="hidden" accept=".csv,.txt,.json,.pdf,.md" onChange={handleFileUpload} disabled={uploading} />
          <Button variant="outline" className="gap-1.5" asChild disabled={uploading}>
            <span><Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload File"}</span>
          </Button>
        </label>
      </div>

      {/* Drop zone hint */}
      <div
        className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50"
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary/60"); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary/60"); }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.classList.remove("border-primary/60");
          const file = e.dataTransfer.files?.[0];
          if (file) {
            const dt = new DataTransfer();
            dt.items.add(file);
            const input = document.createElement("input");
            input.type = "file";
            input.files = dt.files;
            handleFileUpload({ target: input } as any);
          }
        }}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Drag & drop files here</p>
        <p className="text-xs text-muted-foreground mt-1">CSV, TXT, JSON, PDF, MD</p>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Database className="mb-3 h-10 w-10" />
          <p>No knowledge entries yet. Add text or upload files to build your personal library.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <Card key={entry.id} className="border-border shadow-[var(--shadow-card)] group">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {entry.content_type === "file" ? <File className="h-4 w-4 shrink-0 text-muted-foreground" /> : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <CardTitle className="font-display text-sm truncate">{entry.title}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeEntry(entry.id)} className="h-9 w-9 md:h-7 md:w-7 text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent>
                <Badge variant="outline" className="text-[10px] capitalize">{entry.content_type}</Badge>
                {entry.content_text && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-3">{entry.content_text}</p>
                )}
                {entry.file_name && (
                  <p className="mt-2 text-xs text-muted-foreground">{entry.file_name}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Knowledge Base Page ──
export default function KnowledgeBase() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">Knowledge Base</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your modules, personas, and personal data — all in one place.</p>
      </div>
      <Tabs defaultValue="modules">
        <TabsList className="h-auto flex-wrap gap-1">
          <TabsTrigger value="modules" className="gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" /> Modules</TabsTrigger>
          <TabsTrigger value="personas" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Personas</TabsTrigger>
          <TabsTrigger value="my-data" className="gap-1.5 text-xs"><Database className="h-3.5 w-3.5" /> My Data</TabsTrigger>
        </TabsList>
        <TabsContent value="modules" className="mt-4"><ModulesTab /></TabsContent>
        <TabsContent value="personas" className="mt-4"><PersonasTab /></TabsContent>
        <TabsContent value="my-data" className="mt-4"><MyDataTab /></TabsContent>
      </Tabs>
    </div>
  );
}
