import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import { Settings, Sun, Moon, LifeBuoy, LogOut } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRequestLogout: () => void;
}

export function AccountModal({ open, onOpenChange, onRequestLogout }: Props) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" aria-label="Account menu" className="mobile-account-modal rounded-t-2xl gap-0 p-0">
        <SheetTitle className="sr-only">Account menu</SheetTitle>
        <SheetDescription className="sr-only">Settings, appearance, help, and log out</SheetDescription>

        <div className="mobile-account-modal__email">{user?.email}</div>

        <div className="mobile-account-modal__list">
          <button
            type="button"
            className="mobile-account-modal__row"
            onClick={() => {
              onOpenChange(false);
              navigate("/app/admin");
            }}
          >
            <Settings className="h-[18px] w-[18px]" strokeWidth={1.8} />
            Settings
          </button>
          <button
            type="button"
            className="mobile-account-modal__row"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.8} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </button>
          <button
            type="button"
            className="mobile-account-modal__row"
            onClick={() => {
              onOpenChange(false);
              navigate("/app/help");
            }}
          >
            <LifeBuoy className="h-[18px] w-[18px]" strokeWidth={1.8} />
            Get help
          </button>
        </div>

        <div className="mobile-account-modal__divider" />

        <div className="mobile-account-modal__list">
          <button
            type="button"
            className="mobile-account-modal__row mobile-account-modal__row--destructive"
            onClick={() => {
              onOpenChange(false);
              onRequestLogout();
            }}
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.8} />
            Log out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
