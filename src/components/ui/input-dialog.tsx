import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface InputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  /** Rendered between the input and the footer (e.g. an emoji row). */
  children?: React.ReactNode;
  onSubmit: (value: string) => void;
}

/**
 * The app's replacement for window.prompt(): a small designed dialog with a
 * Spectral title, one focused input, and Enter-to-confirm. Anything that used
 * to raise the browser's utility prompt goes through here instead.
 */
export function InputDialog({
  open, onOpenChange, title, description, label, placeholder,
  defaultValue = "", confirmLabel = "Save", children, onSubmit,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (open) setValue(defaultValue);
  }, [open, defaultValue]);

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          aria-label={label}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base outline-none transition-colors focus:border-accent"
        />
        {children}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="tactile rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            className={cn(
              "tactile rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground",
              !value.trim() && "opacity-50",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
