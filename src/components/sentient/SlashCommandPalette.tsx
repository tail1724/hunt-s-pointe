import { useEffect, useRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowRight, BookmarkPlus, Search, User as UserIcon, Trash2, Maximize2, Share2 } from "lucide-react";

export type SlashAction =
  | "build" | "save" | "research" | "persona" | "clear" | "focus" | "share";

const ITEMS: { id: SlashAction; label: string; hint: string; Icon: any }[] = [
  { id: "build", label: "/build", hint: "Send last response to Build", Icon: ArrowRight },
  { id: "save", label: "/save", hint: "Save last response as template", Icon: BookmarkPlus },
  { id: "research", label: "/research", hint: "Open research panel", Icon: Search },
  { id: "persona", label: "/persona", hint: "Apply a persona", Icon: UserIcon },
  { id: "share", label: "/share", hint: "Share this session", Icon: Share2 },
  { id: "focus", label: "/focus", hint: "Toggle focus mode (⌘+.)", Icon: Maximize2 },
  { id: "clear", label: "/clear", hint: "Clear conversation", Icon: Trash2 },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (a: SlashAction) => void;
  anchor?: React.ReactNode;
}

export function SlashCommandPalette({ open, onOpenChange, onSelect, anchor }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span>{anchor}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput ref={inputRef} placeholder="Type a command…" />
          <CommandList>
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup heading="Slash commands">
              {ITEMS.map(({ id, label, hint, Icon }) => (
                <CommandItem key={id} onSelect={() => { onSelect(id); onOpenChange(false); }}>
                  <Icon className="mr-2 h-3.5 w-3.5" />
                  <div className="flex flex-col">
                    <span className="text-sm">{label}</span>
                    <span className="text-[10px] text-muted-foreground">{hint}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
