import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCollection } from "@/lib/collections/useCollections";
import { useActiveCollection } from "@/lib/collections/useActiveCollection";
import { colorTokens, CONTEXT_CHAR_CAP } from "@/lib/collections/types";
import { AddItemSheet } from "@/components/collections/AddItemSheet";
import { ItemRow } from "@/components/collections/ItemRow";
import { ArtifactRow } from "@/components/collections/ArtifactRow";
import { ContextBudgetMeter } from "@/components/collections/ContextBudgetMeter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Sparkles, Trash2, Calendar, Users, FileText } from "lucide-react";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";

type PackageStatus = "open" | "drafting" | "ready" | "shipped";
const PACKAGE_STATUSES: { value: PackageStatus; label: string; className: string }[] = [
  { value: "open",     label: "Open",     className: "bg-muted text-muted-foreground border-border" },
  { value: "drafting", label: "Drafting", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  { value: "ready",    label: "Ready",    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  { value: "shipped",  label: "Shipped",  className: "bg-primary/10 text-primary border-primary/30" },
];

interface DraftRow { id: string; title: string; dek: string | null; status: string | null; updated_at: string; }

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { collection, items, artifacts, loading, refresh } = useCollection(id ?? null);
  const pressroom = useActiveCollection("mary");
  const write = useActiveCollection("write");
  const [tab, setTab] = useState<"brief" | "research" | "drafts" | "artifacts">("brief");

  // Editable brief state — hydrated from the collection row.
  const c0: any = collection ?? {};
  const [brief, setBrief] = useState({
    angle: "",
    deadline: "" as string,
    assigned_to: [] as string[],
    status: "open" as PackageStatus,
  });
  const [assignedEntry, setAssignedEntry] = useState("");
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [savingBrief, setSavingBrief] = useState(false);

  useEffect(() => {
    if (!collection) return;
    const c: any = collection;
    setBrief({
      angle: c.angle ?? "",
      deadline: c.deadline ?? "",
      assigned_to: c.assigned_to ?? [],
      status: (c.status ?? "open") as PackageStatus,
    });
  }, [collection]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("documents" as any)
        .select("id, title, dek, status, updated_at")
        .eq("story_package_id", id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .order("updated_at", { ascending: false });
      setDrafts(((data as any[]) ?? []) as DraftRow[]);
    })();
  }, [id, tab]);

  const saveBrief = async (patch: Partial<typeof brief>) => {
    if (!collection) return;
    const next = { ...brief, ...patch };
    setBrief(next);
    setSavingBrief(true);
    const payload: any = {
      angle: next.angle || null,
      deadline: next.deadline || null,
      assigned_to: next.assigned_to,
      status: next.status,
    };
    const { error } = await supabase.from("collections" as any).update(payload).eq("id", collection.id);
    setSavingBrief(false);
    if (error) toast.error(error.message);
  };

  const totalChars = useMemo(
    () => items.filter((i) => i.status === "ready").reduce((s, i) => s + (i.char_count || 0), 0),
    [items],
  );

  if (!id) return null;
  if (loading && !collection) {
    return <div className="mx-auto max-w-5xl px-4 py-10"><div className="h-40 animate-pulse rounded-2xl bg-muted/40" /></div>;
  }
  if (!collection) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Collection not found.</p>
        <Button asChild variant="ghost" className="mt-4"><Link to="/app/knowledge"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>
      </div>
    );
  }

  const c = colorTokens(collection.color);
  const isActivePressRoom = pressroom.activeId === collection.id;
  const isActiveWrite = write.activeId === collection.id;

  const deleteItem = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (item?.storage_path) {
      await supabase.storage.from("collections").remove([item.storage_path]).catch(() => {});
    }
    const { error } = await supabase.from("collection_items" as any).delete().eq("id", itemId);
    if (error) toast.error(error.message); else { toast.success("Removed"); refresh(); }
  };

  const deleteCollection = async () => {
    await supabase.from("collections" as any).delete().eq("id", collection.id);
    toast.success("Collection deleted");
    navigate("/app/knowledge");
  };

  return (
    <div className="relative">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10">
        <Link to="/app/knowledge" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All collections
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="flex items-start gap-4">
            <div
              className="h-14 w-14 shrink-0 rounded-2xl shadow-lg"
              style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
            />
            <div>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                {collection.name}
              </h1>
              {collection.description && (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{collection.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal">{items.length} items</Badge>
                <Badge variant="outline" className="font-normal">{artifacts.length} artifacts</Badge>
                {isActivePressRoom && <Badge className="bg-primary/15 text-primary border-primary/30">Active in PressRoom</Badge>}
                {isActiveWrite && <Badge className="bg-accent/15 text-accent border-accent/30">Active in Write</Badge>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isActivePressRoom ? "default" : "outline"}
              size="sm"
              onClick={() => pressroom.setActive(isActivePressRoom ? null : collection.id)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {isActivePressRoom ? "Active in PressRoom" : "Use in PressRoom"}
            </Button>
            <Button
              variant={isActiveWrite ? "default" : "outline"}
              size="sm"
              onClick={() => write.setActive(isActiveWrite ? null : collection.id)}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              {isActiveWrite ? "Active in Write" : "Use in Write"}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Delete collection">
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All items in this collection will be removed. Tagged artifacts (PressRoom threads, documents,
                    images) will be untagged but not deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteCollection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>

        <div className="mt-8">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList>
                <TabsTrigger value="brief">Brief</TabsTrigger>
                <TabsTrigger value="research">Research ({items.length})</TabsTrigger>
                <TabsTrigger value="drafts">Drafts ({drafts.length})</TabsTrigger>
                <TabsTrigger value="artifacts">Artifacts ({artifacts.length})</TabsTrigger>
              </TabsList>
              {tab === "research" && (
                <AddItemSheet
                  collectionId={collection.id}
                  onAdded={refresh}
                  trigger={<Button size="sm" className="rounded-full"><Plus className="h-4 w-4 mr-1.5" />Add</Button>}
                />
              )}
              {tab === "drafts" && (
                <Button size="sm" className="rounded-full" asChild>
                  <Link to={`/app/write?package=${collection.id}`}><Plus className="h-4 w-4 mr-1.5" />New draft</Link>
                </Button>
              )}
            </div>

            <TabsContent value="brief" className="mt-5 space-y-5">
              <div className="rounded-2xl border border-border bg-card/60 p-5 space-y-5">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Angle</label>
                  <Textarea
                    value={brief.angle}
                    onChange={(e) => setBrief({ ...brief, angle: e.target.value })}
                    onBlur={() => saveBrief({})}
                    placeholder="One sentence: what's the story, and why now?"
                    className="mt-1.5 min-h-[72px] resize-none bg-background"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" /> Deadline
                    </label>
                    <Input
                      type="date"
                      value={brief.deadline ? brief.deadline.slice(0, 10) : ""}
                      onChange={(e) => saveBrief({ deadline: e.target.value })}
                      className="mt-1.5 bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {PACKAGE_STATUSES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => saveBrief({ status: s.value })}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            brief.status === s.value ? s.className : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Assigned to
                  </label>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {brief.assigned_to.map((name) => (
                      <Badge key={name} variant="secondary" className="gap-1">
                        {name}
                        <button
                          type="button"
                          onClick={() => saveBrief({ assigned_to: brief.assigned_to.filter((n) => n !== name) })}
                          className="ml-0.5 text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${name}`}
                        >×</button>
                      </Badge>
                    ))}
                    <Input
                      value={assignedEntry}
                      onChange={(e) => setAssignedEntry(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && assignedEntry.trim()) {
                          e.preventDefault();
                          const name = assignedEntry.trim();
                          if (!brief.assigned_to.includes(name)) {
                            saveBrief({ assigned_to: [...brief.assigned_to, name] });
                          }
                          setAssignedEntry("");
                        }
                      }}
                      placeholder="Add reporter, press Enter"
                      className="h-8 w-48 bg-background text-sm"
                    />
                  </div>
                </div>

                {savingBrief && <p className="text-[11px] text-muted-foreground">Saving…</p>}
              </div>
            </TabsContent>

            <TabsContent value="research" className="mt-5 space-y-4">
              <ContextBudgetMeter totalChars={totalChars} />
              {items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                  <div
                    aria-hidden
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl shadow-md"
                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
                  >
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-foreground">Load the research once</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Notes, source docs, and links you add here ride along every time this package is active in the assistant or Write.
                  </p>
                  <AddItemSheet
                    collectionId={collection.id}
                    onAdded={refresh}
                    trigger={<Button size="sm" className="mt-5 rounded-full"><Plus className="h-4 w-4 mr-1.5" />Add your first source</Button>}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((it) => <ItemRow key={it.id} item={it} onDelete={deleteItem} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="drafts" className="mt-5">
              {drafts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <h3 className="mt-3 font-display text-base font-semibold text-foreground">No drafts yet</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Start a draft from this package and it appears here with its live status.
                  </p>
                  <Button size="sm" className="mt-5 rounded-full" asChild>
                    <Link to={`/app/write?package=${collection.id}`}><Plus className="h-4 w-4 mr-1.5" />Start a draft</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {drafts.map((d) => (
                    <Link
                      key={d.id}
                      to={`/app/write/${d.id}`}
                      className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-semibold">{d.title || "Untitled article"}</p>
                        {d.dek && <p className="mt-0.5 truncate text-xs text-muted-foreground">{d.dek}</p>}
                      </div>
                      <Badge variant="outline" className="capitalize">{(d.status ?? "draft").replace("_", " ")}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="artifacts" className="mt-5">
              {artifacts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <h3 className="mt-3 font-display text-base font-semibold text-foreground">Nothing collected yet</h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                    Activate this package in the assistant or Write and every thread, draft, and image you create flows back here automatically.
                  </p>
                  <div className="mt-5 flex justify-center gap-2">
                    <Button size="sm" variant={isActivePressRoom ? "default" : "outline"} onClick={() => pressroom.setActive(collection.id)}>
                      Use in assistant
                    </Button>
                    <Button size="sm" variant={isActiveWrite ? "default" : "outline"} onClick={() => write.setActive(collection.id)}>
                      Use in Write
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {artifacts.map((a, i) => (
                    <div key={a.id} className="rise-in" style={{ "--stagger-i": Math.min(i, 8) } as React.CSSProperties}>
                      <ArtifactRow artifact={a} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
