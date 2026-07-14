import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, ListChecks,
  Quote, Code, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InputDialog } from "@/components/ui/input-dialog";
import { useEffect, useRef, useState } from "react";

interface Props {
  editor: Editor | null;
  focusMode?: boolean;
}

function ToolBtn({
  active, onClick, label, children, disabled,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-10 w-10 md:h-8 md:w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70",
        "transition-all duration-150 active:scale-[0.94]",
        active && "bg-muted text-foreground shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.35)]"
      )}
    >
      {children}
    </Button>
  );
}

function Divider() {
  return <span aria-hidden className="w-px h-5 bg-border/70 mx-1" />;
}

export function EditorToolbar({ editor, focusMode = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!editor) {
    return <div className="h-12 print:hidden" />;
  }

  const blockValue =
    editor.isActive("heading", { level: 1 }) ? "h1"
    : editor.isActive("heading", { level: 2 }) ? "h2"
    : editor.isActive("heading", { level: 3 }) ? "h3"
    : editor.isActive("blockquote") ? "quote"
    : "body";

  const setBlock = (v: string) => {
    const chain = editor.chain().focus();
    if (v === "body") chain.setParagraph().run();
    else if (v === "h1") chain.toggleHeading({ level: 1 }).run();
    else if (v === "h2") chain.toggleHeading({ level: 2 }).run();
    else if (v === "h3") chain.toggleHeading({ level: 3 }).run();
    else if (v === "quote") chain.toggleBlockquote().run();
  };

  const addLink = () => {
    // Editing an existing link? Offer removal straight away; otherwise open
    // the designed URL dialog (no window.prompt).
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    setLinkOpen(true);
  };
  const applyLink = (url: string) => {
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  // Focus mode: collapsed trigger that expands on hover/click
  if (focusMode && !expanded) {
    return (
      <div className="sticky top-12 z-20 flex justify-center pointer-events-none print:hidden">
        <button
          type="button"
          onMouseEnter={() => setExpanded(true)}
          onClick={() => setExpanded(true)}
          className="pointer-events-auto mt-3 inline-flex items-center justify-center h-8 w-8 rounded-full bg-card/90 backdrop-blur-md border border-border/60 shadow-md text-muted-foreground hover:text-foreground transition-all hover:scale-105"
          aria-label="Show formatting toolbar"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="sticky top-[4.5rem] z-20 flex justify-center pointer-events-none print:hidden px-2"
      onMouseLeave={() => focusMode && setExpanded(false)}
    >
      <div
        ref={scrollerRef}
        className="pointer-events-auto mt-3 flex items-center gap-0.5 px-2 py-1.5 rounded-full bg-card/90 backdrop-blur-md border border-border/60 shadow-[0_8px_24px_-8px_hsl(222_50%_8%/0.25),0_1px_2px_hsl(222_50%_8%/0.08)] animate-in fade-in slide-in-from-top-1 duration-200 max-w-[calc(100vw-1rem)] overflow-x-auto overflow-y-hidden flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        // Edge fade only kicks in once the pill actually overflows its
        // max-width — a static mask would clip the outer icons even when
        // every tool already fits, which is the common desktop case.
        style={
          overflowing
            ? {
                maskImage:
                  "linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)",
                WebkitMaskImage:
                  "linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)",
              }
            : undefined
        }
      >

        <ToolBtn label="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="h-3.5 w-3.5" />
        </ToolBtn>

        <Divider />

        <Select value={blockValue} onValueChange={setBlock}>
          <SelectTrigger className="h-8 w-[112px] text-xs rounded-md border-0 bg-transparent hover:bg-muted/70 focus:ring-0 focus:ring-offset-0 shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="body" className="text-sm">Body</SelectItem>
            <SelectItem value="h1" className="text-base font-bold">Heading 1</SelectItem>
            <SelectItem value="h2" className="text-sm font-semibold">Heading 2</SelectItem>
            <SelectItem value="h3" className="text-sm font-semibold">Heading 3</SelectItem>
            <SelectItem value="quote" className="text-sm italic">Quote</SelectItem>
          </SelectContent>
        </Select>

        <Divider />

        <ToolBtn label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Underline" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Strikethrough" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>

        <Divider />

        <ToolBtn label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Task list" active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()}>
          <ListChecks className="h-3.5 w-3.5" />
        </ToolBtn>

        <Divider />

        <ToolBtn label="Blockquote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Link" active={editor.isActive("link")} onClick={addLink}>
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolBtn>

        <Divider />

        <ToolBtn label="Align left" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Align center" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn label="Align right" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>

      <InputDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        title="Add link"
        label="Link URL"
        placeholder="https://…"
        defaultValue="https://"
        confirmLabel="Add link"
        onSubmit={applyLink}
      />
    </div>
  );
}
