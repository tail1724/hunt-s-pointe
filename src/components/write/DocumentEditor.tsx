import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import { useEffect, useRef } from "react";
import { AIBubbleMenu } from "./AIBubbleMenu";
import { SlashMenu } from "./SlashMenu";
import { TellHighlight } from "./TellHighlightExtension";
import type { ProposeAnnotationFn } from "@/lib/annotations/types";

export interface DocumentEditorProps {
  /** TipTap JSON document. Pass undefined for blank. */
  initialContent?: any;
  /** Called with the editor's JSON whenever it changes. */
  onChange?: (json: any, text: string) => void;
  /** Compact mode = smaller padding, used inline inside PressRoom. */
  compact?: boolean;
  /** Read-only viewer. */
  readOnly?: boolean;
  /** Placeholder text. */
  placeholder?: string;
  /** Expose the editor instance to parents. */
  onReady?: (editor: Editor) => void;
  /**
   * Required unless readOnly: every in-editor AI surface (bubble menu, slash
   * menu) routes suggestions through this instead of editing in place.
   */
  onPropose?: ProposeAnnotationFn;
  /** Passed through to the bubble/slash menus' AI requests. */
  voiceLocks?: string[];
  styleRules?: string[];
}

export function DocumentEditor({
  initialContent,
  onChange,
  compact = false,
  readOnly = false,
  placeholder = "Begin writing… highlight any text for AI suggestions, or type / for commands.",
  onReady,
  onPropose,
  voiceLocks,
  styleRules,
}: DocumentEditorProps) {
  const lastJsonRef = useRef<string>("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder }),
      Typography,
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-primary underline underline-offset-2" } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TellHighlight,
    ],
    content: initialContent && Object.keys(initialContent).length > 0 ? initialContent : undefined,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: [
          "tiptap-doc focus:outline-none",
          compact
            ? "min-h-[160px] px-4 py-3 text-[15px]"
            : "min-h-[60vh] px-4 pt-4 pb-20 md:px-20 md:pb-24 text-[18px] leading-[1.78]",
        ].join(" "),
      },
    },
    onUpdate({ editor }) {
      if (!onChange) return;
      const json = editor.getJSON();
      const stringified = JSON.stringify(json);
      if (stringified === lastJsonRef.current) return;
      lastJsonRef.current = stringified;
      onChange(json, editor.getText());
    },
  });

  useEffect(() => {
    if (editor && onReady) onReady(editor);
  }, [editor, onReady]);

  // Allow swapping initialContent (e.g., when document loads async).
  useEffect(() => {
    if (!editor || !initialContent) return;
    const incoming = JSON.stringify(initialContent);
    if (incoming === lastJsonRef.current) return;
    if (incoming === JSON.stringify(editor.getJSON())) return;
    lastJsonRef.current = incoming;
    editor.commands.setContent(initialContent, { emitUpdate: false });
  }, [editor, initialContent]);

  if (!editor) return null;

  return (
    <div className="relative">
      <EditorContent editor={editor} />
      {!readOnly && onPropose && <AIBubbleMenu editor={editor} onPropose={onPropose} voiceLocks={voiceLocks} styleRules={styleRules} />}
      {!readOnly && onPropose && <SlashMenu editor={editor} onPropose={onPropose} voiceLocks={voiceLocks} styleRules={styleRules} />}
    </div>
  );
}
