import { supabase } from "@/integrations/supabase/client";
import { CONTEXT_CHAR_CAP, type CollectionItem } from "./types";

export interface BuiltContext {
  contextBlock: string;
  includedItems: CollectionItem[];
  omittedItems: CollectionItem[];
  totalChars: number;
  truncated: boolean;
  collectionName: string;
}

const PRIORITY: Record<CollectionItem["kind"], number> = {
  text: 0,    // user-typed notes — highest
  image: 1,   // visual references (no text usually)
  file: 2,
  link: 3,    // dropped first if needed
};

function renderItem(item: CollectionItem): string {
  const label =
    item.kind === "text" ? "note" :
    item.kind === "file" ? `file: ${item.title ?? "untitled"}` :
    item.kind === "link" ? `link: ${item.source_url ?? ""}` :
    `image: ${item.title ?? "untitled"}`;
  const body = (item.body_text ?? "").trim();
  if (!body) return `[${label}] (no extracted text)`;
  return `[${label}]\n${body}`;
}

export async function buildContextBlock(
  collectionId: string,
  omitItemIds: string[] = [],
): Promise<BuiltContext | null> {
  const [{ data: col }, { data: items }] = await Promise.all([
    supabase.from("collections" as any).select("name").eq("id", collectionId).single(),
    supabase
      .from("collection_items" as any)
      .select("*")
      .eq("collection_id", collectionId)
      .eq("status", "ready")
      .order("created_at", { ascending: true }),
  ]);
  if (!col || !items) return null;

  const omitSet = new Set(omitItemIds);
  const all = (items as unknown as CollectionItem[]).filter((i) => !omitSet.has(i.id));

  // Sort by priority so highest-priority items are kept when truncating.
  const sorted = [...all].sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind]);

  const kept: CollectionItem[] = [];
  const omitted: CollectionItem[] = [];
  let runningChars = 0;
  const name = (col as any).name as string;
  const header = `<collection name="${name}">\n`;
  const footer = `\n</collection>`;
  let budget = CONTEXT_CHAR_CAP - header.length - footer.length;

  for (const it of sorted) {
    const rendered = renderItem(it);
    if (rendered.length + 2 <= budget) {
      kept.push(it);
      budget -= rendered.length + 2;
      runningChars += rendered.length;
    } else if (budget > 200) {
      // Partial fit — slice the item body to fit remaining budget with a marker.
      const overhead = renderItem({ ...it, body_text: "" }).length + 20;
      const sliceLen = Math.max(0, budget - overhead);
      if (sliceLen > 100) {
        const sliced: CollectionItem = {
          ...it,
          body_text: (it.body_text ?? "").slice(0, sliceLen) + "\n…(truncated)",
        };
        kept.push(sliced);
        budget = 0;
        runningChars += sliceLen;
      } else {
        omitted.push(it);
      }
    } else {
      omitted.push(it);
    }
  }

  // Re-render in priority order (notes first → links last) for the prompt.
  const body = kept.map(renderItem).join("\n\n");
  return {
    contextBlock: header + body + footer,
    includedItems: kept,
    omittedItems: omitted,
    totalChars: runningChars,
    truncated: omitted.length > 0,
    collectionName: name,
  };
}
