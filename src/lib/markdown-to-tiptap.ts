import { generateJSON } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export const tiptapExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Typography,
  Underline,
  Link.configure({ openOnClick: false }),
  TaskList,
  TaskItem.configure({ nested: true }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
];

/** Convert a markdown string into TipTap JSON suitable for the DocumentEditor. */
export function markdownToTiptapJSON(md: string): any {
  const html = marked.parse(md || "", { async: false }) as string;
  try {
    return generateJSON(html, tiptapExtensions as any);
  } catch {
    return {
      type: "doc",
      content: (md || "").split(/\n\n+/).map((p) => ({
        type: "paragraph",
        content: p.trim() ? [{ type: "text", text: p }] : [],
      })),
    };
  }
}

/** Strip markdown to plain text (for previews / search). */
export function markdownToPlainText(md: string): string {
  return (md || "")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#+\s+/gm, "")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .trim();
}
