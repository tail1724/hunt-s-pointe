import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

/**
 * One modal surface for the whole app: a centered Dialog on desktop, a
 * native bottom Drawer on mobile. Every current Dialog call site should
 * migrate here rather than branching on `useIsMobile()` itself — keyboard
 * safe-area handling, max-height, and internal scroll all live in this one
 * place instead of being re-solved (or missed) at each of the ~11 call
 * sites.
 *
 * useIsMobile() returns `undefined`→`false` on the very first render before
 * its effect runs; that's fine here because modals only open in response to
 * user interaction, never during initial hydration.
 */
export function ResponsiveDialog(props: React.ComponentProps<typeof Dialog>) {
  const isMobile = useIsMobile();
  return isMobile ? <Drawer {...props} /> : <Dialog {...props} />;
}

export function ResponsiveDialogTrigger(props: React.ComponentProps<typeof DialogTrigger>) {
  const isMobile = useIsMobile();
  return isMobile ? <DrawerTrigger {...props} /> : <DialogTrigger {...props} />;
}

export function ResponsiveDialogClose(props: React.ComponentProps<typeof DialogClose>) {
  const isMobile = useIsMobile();
  return isMobile ? <DrawerClose {...props} /> : <DialogClose {...props} />;
}

export function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <DrawerContent
        // vaul's DrawerContent has no horizontal padding, so modal bodies sat
        // flush against the screen edges on mobile. Pad here once (and add a
        // little bottom breathing room above the safe area) for every call site.
        className={cn("max-h-[85dvh] overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))]", className)}
        {...props}
      >
        {children}
      </DrawerContent>
    );
  }
  return (
    <DialogContent className={className} {...props}>
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();
  // The mobile container (DrawerContent) now owns horizontal padding, so drop
  // the header's own px-4 to keep it aligned with the body.
  return isMobile
    ? <DrawerHeader className={cn("px-0", className)} {...props} />
    : <DialogHeader className={className} {...props} />;
}

export function ResponsiveDialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerFooter className={cn("px-0", className)} {...props} />
  ) : (
    <DialogFooter className={className} {...props} />
  );
}

export function ResponsiveDialogTitle(props: React.ComponentProps<typeof DialogTitle>) {
  const isMobile = useIsMobile();
  return isMobile ? <DrawerTitle {...props} /> : <DialogTitle {...props} />;
}

export function ResponsiveDialogDescription(props: React.ComponentProps<typeof DialogDescription>) {
  const isMobile = useIsMobile();
  return isMobile ? <DrawerDescription {...props} /> : <DialogDescription {...props} />;
}
