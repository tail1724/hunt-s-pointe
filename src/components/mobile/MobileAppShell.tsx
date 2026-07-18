import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useKeyboardInset } from "@/hooks/use-keyboard-inset";
import { useMobileNav } from "./mobile-nav-context";
import { MobileHeader } from "./MobileHeader";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { AccountModal } from "./AccountModal";
import "@/styles/mobile-nav.css";

interface Props {
  children: React.ReactNode;
  /** Accepted for call-site compatibility; the header now shows a fixed masthead. */
  routeTitle?: string;
}

export function MobileAppShell({ children }: Props) {
  const location = useLocation();
  const { setOpen } = useMobileNav();
  const { signOut } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  // Mounts the visualViewport listener that other mobile surfaces (e.g. the
  // PressRoom/Write composers) read via the --kb-inset CSS var and
  // [data-keyboard="open"] attribute it sets on <html>.
  useKeyboardInset();

  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [location.pathname, setOpen]);

  return (
    <div className="mobile-app-shell">
      <MobileHeader />
      <main className="mobile-app-shell__main">{children}</main>

      <MobileNavDrawer
        onOpenAccount={() => {
          setOpen(false);
          setAccountOpen(true);
        }}
      />

      <AccountModal
        open={accountOpen}
        onOpenChange={setAccountOpen}
        onRequestLogout={() => setLogoutConfirmOpen(true)}
      />

      <AlertDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>You'll need to sign in again to get back to your studies.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void signOut()}>Log out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
