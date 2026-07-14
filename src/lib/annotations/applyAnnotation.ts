import type { Editor } from "@tiptap/react";
import type { DocumentAnnotation } from "./types";

/**
 * The one place a margin suggestion actually touches the manuscript.
 * Every caller (MarginRail, the mobile assist bar) goes through this so the
 * edit and its attributed version record are always created together —
 * there is no path where an annotation is "applied" without a matching
 * document_versions row.
 */
export async function applyAnnotationToEditor(
  editor: Editor,
  a: DocumentAnnotation,
  resolve: (id: string, status: "applied" | "dismissed") => Promise<void>,
  record: (input: {
    content: unknown;
    contentText: string;
    authorKind: "ai_suggestion";
    changeSummary?: string | null;
    annotationId?: string | null;
  }) => Promise<unknown>,
): Promise<boolean> {
  if (!a.proposed_text) return false;
  const size = editor.state.doc.content.size;
  const from = Math.min(a.span_from ?? size, size);
  const to = Math.min(Math.max(a.span_to ?? from, from), size);
  try {
    if (from === to) {
      editor.chain().focus().insertContentAt(from, "\n" + a.proposed_text).run();
    } else {
      editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, a.proposed_text).run();
    }
    await resolve(a.id, "applied");
    await record({
      content: editor.getJSON(),
      contentText: editor.getText(),
      authorKind: "ai_suggestion",
      changeSummary: a.body.slice(0, 200),
      annotationId: a.id,
    });
    return true;
  } catch {
    return false;
  }
}
