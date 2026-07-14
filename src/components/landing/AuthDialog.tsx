import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { playEntryTransition, requestEntryTransition, resetEntryTransition } from "@/lib/entry-transition";
import { loginSchema, signupSchema, emailSchema, firstError } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
  ResponsiveDialogDescription as DialogDescription,
} from "@/components/ui/responsive-dialog";
import { toast } from "sonner";
import { BookOpen, ImageIcon, MailCheck, Sparkles, Zap } from "lucide-react";

function GoogleButton({ disabled }: { disabled?: boolean }) {
  const handleGoogle = async () => {
    requestEntryTransition();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if ("error" in result && result.error) {
      resetEntryTransition();
      toast.error(result.error.message);
    }
  };
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-lg h-11 text-base font-medium"
      onClick={handleGoogle}
      disabled={disabled}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.6 14.6 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1-.2-1.5H12z"/>
      </svg>
      Continue with Google
    </Button>
  );
}

function OrDivider() {
  return (
    <div className="relative my-2">
      <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">or</span>
      </div>
    </div>
  );
}

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: "login" | "signup";
}

export function AuthDialog({ open, onOpenChange, defaultTab = "login" }: AuthDialogProps) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState(defaultTab);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    setTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (session && open) {
      onOpenChange(false);
      playEntryTransition();
      navigate("/app/pressroom");
    }
  }, [session, open, navigate, onOpenChange]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) { toast.error(firstError(parsed)!); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (error) toast.error(error.message);
    else requestEntryTransition();
    setSubmitting(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({ email, password, displayName });
    if (!parsed.success) { toast.error(firstError(parsed)!); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: parsed.data.displayName },
        emailRedirectTo: window.location.origin + "/app/pressroom",
      },
    });
    if (error) toast.error(error.message);
    else {
      setSignupEmail(parsed.data.email);
      setSignupSuccess(true);
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) { toast.error(parsedEmail.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) toast.error(error.message);
    else setForgotSent(true);
    setSubmitting(false);
  };

  const handleResendConfirmation = async () => {
    setSubmitting(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: signupEmail });
    if (error) toast.error(error.message);
    else toast.success("Confirmation email resent!");
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setForgotMode(false); setForgotSent(false); setSignupSuccess(false); } }}>
      <DialogContent className="sm:max-w-md border-border">
        <DialogHeader className="text-center items-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <DialogTitle className="font-display text-xl font-extrabold tracking-tight">{APP_NAME}</DialogTitle>
          <DialogDescription>
            {tab === "signup" && !signupSuccess ? "Your first draft starts in about a minute" : "Your voice, protected"}
          </DialogDescription>
        </DialogHeader>

        {signupSuccess ? (
          <div className="text-center space-y-4 py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <MailCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-lg font-bold">One click to go{displayName ? `, ${displayName.split(" ")[0]}` : ""}</h3>
            <p className="text-sm text-muted-foreground">We sent a confirmation link to <span className="font-medium text-foreground">{signupEmail}</span>. Open it and you'll land straight in PressRoom, ready to work.</p>
            <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-left text-xs text-muted-foreground">
              <span className="font-medium text-foreground">While you wait:</span> think of the story or draft you're working on — that's a great first thing to ask PressRoom.
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" size="sm" onClick={handleResendConfirmation} disabled={submitting}>
                {submitting ? "Resending..." : "Resend confirmation email"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setSignupSuccess(false); setTab("login"); }}>
                Back to login
              </Button>
            </div>
          </div>
        ) : forgotMode ? (
          <div className="space-y-4 py-4">
            {forgotSent ? (
              <div className="text-center space-y-4">
                <h3 className="font-display text-lg font-bold">Reset link sent</h3>
                <p className="text-sm text-muted-foreground">Check your email for a password reset link.</p>
                <Button variant="ghost" size="sm" onClick={() => { setForgotMode(false); setForgotSent(false); }}>
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <h3 className="font-display text-base font-bold">Forgot password?</h3>
                <p className="text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input id="forgot-email" type="email" inputMode="email" autoComplete="email" className="h-11 text-base" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full rounded-lg h-11" disabled={submitting}>
                  {submitting ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setForgotMode(false)}>
                  Back to login
                </Button>
              </form>
            )}
          </div>
        ) : (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
            <TabsList className="w-full">
              <TabsTrigger value="login" className="flex-1">Log In</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <div className="space-y-3 pt-4">
                <GoogleButton disabled={submitting} />
                <OrDivider />
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialog-login-email">Email</Label>
                    <Input id="dialog-login-email" type="email" inputMode="email" autoComplete="email" className="h-11 text-base" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dialog-login-pass">Password</Label>
                    <Input id="dialog-login-pass" type="password" autoComplete="current-password" className="h-11 text-base" value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                  <Button type="submit" className="w-full rounded-lg h-11 text-base" disabled={submitting}>
                    {submitting ? "Signing in..." : "Sign In"}
                  </Button>
                  <button type="button" className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-2" onClick={() => setForgotMode(true)}>
                    Forgot password?
                  </button>
                </form>
              </div>
            </TabsContent>
            <TabsContent value="signup">
              <div className="space-y-3 pt-4">
                {/* What you get — value first, form second */}
                <ul className="grid gap-1.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
                    PressRoom — a research partner for stories, sourcing, and structure
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 shrink-0 text-accent" />
                    A margin-only editor that never overwrites your manuscript
                  </li>
                  <li className="flex items-center gap-2">
                    <ImageIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
                    An image studio for article art and social cards
                  </li>
                </ul>
                <GoogleButton disabled={submitting} />
                <OrDivider />
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="dialog-signup-name">Display Name</Label>
                    <Input id="dialog-signup-name" autoComplete="name" className="h-11 text-base" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dialog-signup-email">Email</Label>
                    <Input id="dialog-signup-email" type="email" inputMode="email" autoComplete="email" className="h-11 text-base" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dialog-signup-pass">Password</Label>
                    <Input id="dialog-signup-pass" type="password" autoComplete="new-password" className="h-11 text-base" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
                    <p className="text-xs text-muted-foreground">At least 8 characters. Checked against known breached passwords.</p>
                  </div>
                  <Button type="submit" className="w-full rounded-lg h-11 text-base" disabled={submitting}>
                    {submitting ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {!signupSuccess && !forgotMode && (
          <div className="pt-2 mt-1 border-t border-border/60">
            <div className="flex items-center justify-center gap-2 pt-3 text-xs text-muted-foreground">
              <div className="flex -space-x-1.5">
                <span className="h-5 w-5 rounded-full bg-primary/80 border border-background" />
                <span className="h-5 w-5 rounded-full bg-secondary/80 border border-background" />
                <span className="h-5 w-5 rounded-full bg-accent/80 border border-background" />
              </div>
              <span>Join <span className="font-semibold text-foreground">12,000+</span> pastors, teachers &amp; Bible students</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
