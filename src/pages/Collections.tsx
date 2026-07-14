import { useMemo, useState } from "react";
import { useCollections } from "@/lib/collections/useCollections";
import { useActiveCollection } from "@/lib/collections/useActiveCollection";
import { COLLECTION_COLORS } from "@/lib/collections/types";
import { CollectionCard } from "@/components/collections/CollectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogTrigger as DialogTrigger,
  ResponsiveDialogFooter as DialogFooter,
} from "@/components/ui/responsive-dialog";
import { Plus, Sparkles, Search, FolderOpen, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Stat { items: number; artifacts: number }

export default function Collections() {
  const { user } = useAuth();
  const { collections, loading, create, refresh } = useCollections();
  const ezraActive = useActiveCollection("mary");
  const writeActive = useActiveCollection("write");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState("indigo");
  const [creating, setCreating] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ["collection-stats", user?.id, collections.map((c) => c.id).join(",")],
    enabled: !!user && collections.length > 0,
    queryFn: async () => {
      const ids = collections.map((c) => c.id);
      const [{ data: items }, { data: arts }] = await Promise.all([
        supabase.from("collection_items" as any).select("collection_id").in("collection_id", ids),
        supabase.from("collection_artifacts" as any).select("collection_id").in("collection_id", ids),
      ]);
      const map: Record<string, Stat> = {};
      for (const id of ids) map[id] = { items: 0, artifacts: 0 };
      for (const r of (items ?? []) as any[]) if (map[r.collection_id]) map[r.collection_id].items += 1;
      for (const r of (arts ?? []) as any[]) if (map[r.collection_id]) map[r.collection_id].artifacts += 1;
      return map;
    },
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q),
    );
  }, [collections, query]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const c = await create(newName.trim(), newDesc.trim() || undefined, newColor);
    setCreating(false);
    if (c) {
      toast.success("Collection created");
      setOpen(false);
      setNewName(""); setNewDesc(""); setNewColor("indigo");
      await refresh();
    } else {
      toast.error("Could not create collection");
    }
  };

  return (
    <div className="relative">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-card/70 backdrop-blur px-3 py-1 text-xs text-muted-foreground border border-border">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Context that follows you into Ezra & Write
            </div>
            <h1 className="mt-3 font-display text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
              Collections
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Curate notes, files, links and images once. Activate a collection inside Ezra or Write
              and every artifact you create flows back into it automatically.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="rounded-full px-5 shadow-lg">
                <Plus className="h-4 w-4 mr-2" /> New collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">New collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="c-name">Name</Label>
                  <Input id="c-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Easter sermon series" />
                </div>
                <div>
                  <Label htmlFor="c-desc">Description (optional)</Label>
                  <Textarea id="c-desc" rows={3} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="What is this collection for?" />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COLLECTION_COLORS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => setNewColor(c.key)}
                        className={`flex h-11 w-11 items-center justify-center rounded-full ring-offset-2 ring-offset-background tactile transition-all ${newColor === c.key ? "ring-2 ring-foreground scale-110" : "hover:scale-105"}`}
                        style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                        aria-label={c.key}
                        aria-pressed={newColor === c.key}
                      >
                        {newColor === c.key && <Check className="h-4 w-4 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
                  {creating ? "Creating…" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </motion.div>

        {/* Search */}
        <div className="relative mt-8 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search collections…"
            className="pl-9 bg-card/70 backdrop-blur"
          />
        </div>

        {/* Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/40" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border bg-card/50 p-12 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 font-display text-xl font-semibold text-foreground">
                {query ? "No matches" : "Your first collection awaits"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {query ? "Try a different search term." : "Group notes, files and links so Ezra writes with your voice."}
              </p>
              {!query && (
                <Button onClick={() => setOpen(true)} className="mt-5 rounded-full">
                  <Plus className="h-4 w-4 mr-2" /> Create a collection
                </Button>
              )}
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((c, i) => (
                <div key={c.id} className="rise-in" style={{ "--stagger-i": Math.min(i, 8) } as React.CSSProperties}>
                  <CollectionCard
                    collection={c}
                    itemCount={stats?.[c.id]?.items ?? 0}
                    artifactCount={stats?.[c.id]?.artifacts ?? 0}
                    activeInEzra={ezraActive.activeId === c.id}
                    activeInWrite={writeActive.activeId === c.id}
                  />
                </div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
