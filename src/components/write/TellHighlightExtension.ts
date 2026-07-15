import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { findTells } from "@/lib/authenticity/tells";

/**
 * Algorithmic tell highlighting (addendum feature 14) — a zero-cost,
 * client-only decoration pass that flags over-indexed LLM vocabulary
 * directly in the manuscript. Never rewrites anything; the EIC swaps the
 * word by hand if they agree it reads as machine-made.
 */
export const TellHighlight = Extension.create({
  name: "tellHighlight",
  addProseMirrorPlugins() {
    const key = new PluginKey("tellHighlight");
    return [
      new Plugin({
        key,
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              for (const m of findTells(node.text)) {
                const from = pos + m.index;
                const to = from + m.word.length;
                decorations.push(
                  Decoration.inline(from, to, {
                    class: "ai-tell-highlight",
                    title: `Over-indexed AI vocabulary: "${m.word}" — consider a more specific alternative`,
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});
