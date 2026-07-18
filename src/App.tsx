import { useRef, useEffect, useLayoutEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ImageLightboxProvider } from "@/contexts/ImageLightboxContext";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppTopBar } from "@/components/AppTopBar";
import { useNavPlacement } from "@/hooks/useNavPlacement";
import { useLocation } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { EntryTransitionOverlay } from "@/components/transitions/EntryTransitionOverlay";
import { cancelEntryTransition, markWorkspaceReady, playEntryTransition, shouldRunEntryTransition, useEntryTransition } from "@/lib/entry-transition";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import { MobileNavProvider } from "@/components/mobile/mobile-nav-context";

const ROUTE_TITLES: Record<string, string> = {
  "/app/pressroom": "PressRoom",
  "/app/bible": "Bible",
  "/app/organize": "Organize",
  "/app/knowledge": "Story Packages",
  "/app/file-cabinet": "Newsroom",
  "/app/analytics": "Analytics",
  "/app/integrations": "Integrations",
  "/app/admin": "Profile & Settings",
  "/app/write": "Write",
  "/app/generate": "Generate",
  "/app/library": "Library",
  "/app/personas": "Personas",
  "/app/settings": "Settings",
  "/app/account": "Account",
  "/app/help": "Help",
};


import { PublicLayout } from "./components/landing/PublicLayout";
// Landing stays eager: it's the first paint. NotFound stays eager: it's the
// fallback when a chunk route doesn't match. Everything else is code-split so
// the workspace (and each public page) loads only what it renders.
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const Create = lazy(() => import("./pages/Create"));
const Write = lazy(() => import("./pages/Write"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Contact = lazy(() => import("./pages/Contact"));
const UseCases = lazy(() => import("./pages/UseCases"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const AISafetyPolicy = lazy(() => import("./pages/AISafetyPolicy"));
const Security = lazy(() => import("./pages/Security"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/Customers").then((m) => ({ default: m.CustomerDetail })));
const Changelog = lazy(() => import("./pages/Changelog"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/Blog").then((m) => ({ default: m.BlogPost })));
const IntegrationsPublic = lazy(() => import("./pages/IntegrationsPublic"));
const Learning = lazy(() => import("./pages/Learning"));
const PressRoom = lazy(() => import("./pages/PressRoom"));
const Bible = lazy(() => import("./pages/Bible"));
const PromptCentralLite = lazy(() => import("./pages/PromptCentralLite"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const Collections = lazy(() => import("./pages/Collections"));
const CollectionDetail = lazy(() => import("./pages/CollectionDetail"));
const FileCabinet = lazy(() => import("./pages/FileCabinet"));
const Admin = lazy(() => import("./pages/Admin"));
const Integrations = lazy(() => import("./pages/Integrations"));
const SharedSession = lazy(() => import("./pages/SharedSession"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Help = lazy(() => import("./pages/Help"));
const Organize = lazy(() => import("./pages/Organize"));

const queryClient = new QueryClient();

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  const pageTitle = ROUTE_TITLES[location.pathname] || "";
  const mainRef = useRef<HTMLElement>(null);
  const { placement } = useNavPlacement();
  const entryPhase = useEntryTransition();
  const isMobile = useIsMobile();

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!loading && session) {
      requestAnimationFrame(() => requestAnimationFrame(() => markWorkspaceReady()));
    }
  }, [loading, session]);

  useLayoutEffect(() => {
    if (!loading && session && shouldRunEntryTransition()) {
      playEntryTransition();
    }
  }, [loading, session, entryPhase]);

  if (loading) return <div className="flex min-h-dvh items-center justify-center"><div className="shimmer h-1 w-32 rounded-full" /></div>;
  if (!session) return <Navigate to="/" replace />;

  if (entryPhase !== "idle" || shouldRunEntryTransition()) {
    return <div className="min-h-dvh bg-background" aria-hidden />;
  }

  const topPinned = placement === "top";

  if (isMobile) {
    return (
      <MobileNavProvider>
        <MobileAppShell routeTitle={pageTitle}>
          {children}
        </MobileAppShell>
      </MobileNavProvider>
    );
  }

  return (
    <SidebarProvider>
      {/* h-dvh (not min-h) locks the shell to the viewport: the nav, sidebar,
          and page chrome never move — each surface scrolls inside <main>. */}
      <div className={`h-dvh flex w-full workspace-vignette ${topPinned ? "md:flex-col" : ""}`}>
        {/* Left sidebar: hidden on desktop when pinned to top */}
        <div className={topPinned ? "md:hidden contents" : "contents"}>
          <AppSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0 min-h-0 p-2 md:p-3">
          {topPinned && <AppTopBar />}
          <div className={`flex-1 min-h-0 workspace-canvas flex flex-col ${topPinned ? "md:mt-2" : ""}`}>
            <main ref={mainRef} className="flex-1 min-h-0 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

function EntryTransitionRouter() {
  const { session, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Covers the OAuth-return case: the request flag was set in sessionStorage
  // before redirecting away, so it survives the full-page reload and is
  // already true on this very first render — start the branded transition
  // immediately instead of letting the stale logged-out page flash first.
  useLayoutEffect(() => {
    if (shouldRunEntryTransition()) {
      playEntryTransition();
    }
  }, []);

  useLayoutEffect(() => {
    if (!loading && session && shouldRunEntryTransition()) {
      playEntryTransition();
    }
  }, [loading, session, location.pathname]);

  useLayoutEffect(() => {
    if (!loading && session && shouldRunEntryTransition() && !location.pathname.startsWith("/app")) {
      // Editor as home (Phase 2): land in the Newsroom, not the research
      // chat — the manuscript is the product's center of gravity now.
      navigate("/app/file-cabinet", { replace: true });
    }
  }, [loading, session, location.pathname, navigate]);

  // If auth resolves without a session (OAuth cancelled/failed) while the
  // transition is showing, don't leave the user stuck on the branded screen.
  useEffect(() => {
    if (!loading && !session && shouldRunEntryTransition()) {
      cancelEntryTransition();
    }
  }, [loading, session]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" storageKey="app-theme">
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <EntryTransitionOverlay />
          <EntryTransitionRouter />
          <ImageLightboxProvider>
            <Suspense fallback={<div className="flex min-h-dvh items-center justify-center bg-background"><div className="shimmer h-1 w-32 rounded-full" /></div>}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/features-pricing" element={<Navigate to="/pricing" replace />} />
                <Route path="/about" element={<About />} />
                <Route path="/news" element={<Navigate to="/blog" replace />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/use-cases" element={<UseCases />} />
                <Route path="/security" element={<Security />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:slug" element={<CustomerDetail />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/integrations" element={<IntegrationsPublic />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/ai-safety" element={<AISafetyPolicy />} />
                <Route path="/learning" element={<Learning />} />
                <Route path="/learning/:slug" element={<Learning />} />
                <Route path="/help" element={<Navigate to="/learning" replace />} />
              </Route>
              <Route path="/prompt-central-lite" element={<PromptCentralLite />} />
              <Route path="/sentient-lite" element={<PromptCentralLite />} />
              <Route path="/s/:slug" element={<SharedSession />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth" element={<Navigate to="/" replace />} />
              {/* Primary routes */}
              <Route path="/app/pressroom" element={<ProtectedLayout><PressRoom /></ProtectedLayout>} />
              {/* Legacy path — see docs/hunts-pointe-pressroom-addendum.md §A. */}
              <Route path="/app/pressroom" element={<Navigate to="/app/pressroom" replace />} />
              {/* Bible reader: kept behind a direct link for flagged/legacy users, dropped
                  from the primary nav per the writing-suite pivot (addendum §2.3). */}
              <Route path="/app/bible" element={<ProtectedLayout><Bible /></ProtectedLayout>} />
              <Route path="/app/organize" element={<ProtectedLayout><Organize /></ProtectedLayout>} />
              <Route path="/app/organize/board/:boardId" element={<ProtectedLayout><Organize /></ProtectedLayout>} />
              <Route path="/app/sentient" element={<Navigate to="/app/pressroom" replace />} />
              <Route path="/app/mary" element={<Navigate to="/app/pressroom" replace />} />
              <Route path="/app/prompt-central" element={<Navigate to="/app/pressroom" replace />} />
              <Route path="/app" element={<Navigate to="/app/file-cabinet" replace />} />
              <Route path="/app/history" element={<Navigate to="/app/analytics?tab=history" replace />} />
              <Route path="/app/knowledge" element={<ProtectedLayout><Collections /></ProtectedLayout>} />
              <Route path="/app/knowledge/:id" element={<ProtectedLayout><CollectionDetail /></ProtectedLayout>} />
              <Route path="/app/knowledge-legacy" element={<ProtectedLayout><KnowledgeBase /></ProtectedLayout>} />
              <Route path="/app/collections" element={<Navigate to="/app/knowledge" replace />} />
              <Route path="/app/collections/:id" element={<Navigate to="/app/knowledge/:id" replace />} />
              <Route path="/app/file-cabinet" element={<ProtectedLayout><FileCabinet /></ProtectedLayout>} />
              <Route path="/app/export" element={<Navigate to="/app/file-cabinet" replace />} />

              <Route path="/app/analytics" element={<ProtectedLayout><Analytics /></ProtectedLayout>} />
              <Route path="/app/integrations" element={<ProtectedLayout><Integrations /></ProtectedLayout>} />
              <Route path="/app/help" element={<ProtectedLayout><Help /></ProtectedLayout>} />
              <Route path="/app/help/:slug" element={<ProtectedLayout><Help /></ProtectedLayout>} />
              <Route path="/app/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
              {/* Write — TipTap document editor */}
              <Route path="/app/write" element={<ProtectedLayout><Write /></ProtectedLayout>} />
              <Route path="/app/write/:documentId" element={<ProtectedLayout><Write /></ProtectedLayout>} />
              {/* Hidden routes (kept accessible) */}
              <Route path="/app/create" element={<Navigate to="/app/write" replace />} />
              <Route path="/app/generate" element={<ProtectedLayout><Create /></ProtectedLayout>} />
              <Route path="/app/creations" element={<Navigate to="/app/file-cabinet" replace />} />
              <Route path="/app/campaigns" element={<Navigate to="/app/file-cabinet" replace />} />
              <Route path="/app/campaigns/:id" element={<Navigate to="/app/file-cabinet" replace />} />
              <Route path="/app/library" element={<Navigate to="/app/knowledge" replace />} />
              <Route path="/app/personas" element={<Navigate to="/app/knowledge" replace />} />
              <Route path="/app/settings" element={<Navigate to="/app/admin" replace />} />
              <Route path="/app/account" element={<Navigate to="/app/admin" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </ImageLightboxProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
