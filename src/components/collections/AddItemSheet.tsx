import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Image as ImageIcon, Link as LinkIcon, NotebookPen, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  collectionId: string;
  onAdded: () => void;
  trigger?: React.ReactNode;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20MB

export function AddItemSheet({ collectionId, onAdded, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Note form
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  // Link form
  const [linkUrl, setLinkUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const finish = () => {
    setOpen(false);
    setBusy(false);
    setNoteTitle(""); setNoteBody(""); setLinkUrl(""); setLinkTitle("");
    onAdded();
  };

  const addNote = async () => {
    if (!user || !noteBody.trim()) return;
    setBusy(true);
    const text = noteBody.trim();
    const { error } = await supabase.from("collection_items" as any).insert({
      collection_id: collectionId,
      user_id: user.id,
      kind: "text",
      title: noteTitle.trim() || text.slice(0, 60),
      body_text: text,
      char_count: text.length,
      status: "ready",
    } as any);
    if (error) toast.error(error.message); else toast.success("Note added");
    finish();
  };

  const addLink = async () => {
    if (!user || !linkUrl.trim()) return;
    setBusy(true);
    try { new URL(linkUrl); } catch { toast.error("Invalid URL"); setBusy(false); return; }
    const { data, error } = await supabase.from("collection_items" as any).insert({
      collection_id: collectionId,
      user_id: user.id,
      kind: "link",
      title: linkTitle.trim() || linkUrl,
      source_url: linkUrl.trim(),
      status: "pending",
    } as any).select("id").single();
    if (error || !data) { toast.error(error?.message || "Failed"); setBusy(false); return; }
    const { data: sess } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collection-ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` },
      body: JSON.stringify({ kind: "link", item_id: (data as any).id, url: linkUrl.trim() }),
    }).catch(() => {});
    toast.success("Link added — fetching content…");
    finish();
  };

  const handleFiles = async (files: FileList | null, kind: "file" | "image") => {
    if (!user || !files || files.length === 0) return;
    setBusy(true);
    let count = 0;
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) { toast.error(`${f.name} is over 20MB`); continue; }
      // 1. insert pending row to get an id
      const { data: ins, error: insErr } = await supabase.from("collection_items" as any).insert({
        collection_id: collectionId,
        user_id: user.id,
        kind,
        title: f.name,
        mime_type: f.type || null,
        byte_size: f.size,
        status: "pending",
      } as any).select("id").single();
      if (insErr || !ins) { toast.error(insErr?.message || "Failed"); continue; }
      const itemId = (ins as any).id as string;
      const path = `${user.id}/${collectionId}/${itemId}/${f.name}`;
      // 2. upload to storage
      const { error: upErr } = await supabase.storage.from("collections").upload(path, f, {
        cacheControl: "3600", upsert: false, contentType: f.type || undefined,
      });
      if (upErr) {
        await supabase.from("collection_items" as any).update({ status: "error", error_message: upErr.message }).eq("id", itemId);
        toast.error(`${f.name}: ${upErr.message}`);
        continue;
      }
      await supabase.from("collection_items" as any).update({ storage_path: path }).eq("id", itemId);
      // 3. trigger ingest — every upload goes through extraction now: text
      // files are parsed, images are captioned + OCR'd, charts get their data
      // pulled out, and audio/video are transcribed.
      const { data: sess } = await supabase.auth.getSession();
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/collection-ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` },
        body: JSON.stringify({ kind: "file", item_id: itemId }),
      }).catch(() => {});
      count += 1;
    }
    toast.success(`${count} item${count === 1 ? "" : "s"} added`);
    finish();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? <Button>Add to collection</Button>}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display">Add context</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="note" className="mt-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="note"><NotebookPen className="h-3.5 w-3.5 mr-1.5" />Note</TabsTrigger>
            <TabsTrigger value="file"><FileText className="h-3.5 w-3.5 mr-1.5" />Files</TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="h-3.5 w-3.5 mr-1.5" />Image</TabsTrigger>
            <TabsTrigger value="link"><LinkIcon className="h-3.5 w-3.5 mr-1.5" />Link</TabsTrigger>
          </TabsList>

          <TabsContent value="note" className="mt-5 space-y-3">
            <div>
              <Label htmlFor="note-title">Title (optional)</Label>
              <Input id="note-title" value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Quick note about audience…" />
            </div>
            <div>
              <Label htmlFor="note-body">Note</Label>
              <Textarea id="note-body" value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={10} placeholder="Type free-form context Ezra and Write should treat as background…" />
            </div>
            <Button onClick={addNote} disabled={busy || !noteBody.trim()} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note"}
            </Button>
          </TabsContent>

          <TabsContent value="file" className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center transition-colors hover:bg-muted/60 hover:border-primary/50"
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Drop PDF, DOCX, TXT, MD, CSV, JSON — or audio & video</p>
              <p className="text-xs text-muted-foreground">Up to 20MB each · multiple files OK · audio/video are transcribed automatically</p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md,.csv,.json,.xml,.mp3,.wav,.m4a,.ogg,.mp4,.mov,.webm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*,application/json,application/xml,audio/*,video/*"
              onChange={(e) => handleFiles(e.target.files, "file")}
              className="hidden"
            />
          </TabsContent>

          <TabsContent value="image" className="mt-5 space-y-3">
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center transition-colors hover:bg-muted/60 hover:border-primary/50"
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Drop images</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, WEBP · Up to 20MB each</p>
            </button>
            <input
              ref={imageInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => handleFiles(e.target.files, "image")}
              className="hidden"
            />
          </TabsContent>

          <TabsContent value="link" className="mt-5 space-y-3">
            <div>
              <Label htmlFor="link-url">URL</Label>
              <Input id="link-url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="link-title">Title (optional)</Label>
              <Input id="link-title" value={linkTitle} onChange={(e) => setLinkTitle(e.target.value)} placeholder="Article on…" />
            </div>
            <Button onClick={addLink} disabled={busy || !linkUrl.trim()} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save link"}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
