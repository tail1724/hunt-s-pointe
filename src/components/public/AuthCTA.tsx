import { useState, ReactNode } from "react";
import { AuthDialog } from "@/components/landing/AuthDialog";

export function AuthCTA({ children, className, tab = "signup" }: { children: ReactNode; className?: string; tab?: "login" | "signup" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>{children}</button>
      <AuthDialog open={open} onOpenChange={setOpen} defaultTab={tab} />
    </>
  );
}
