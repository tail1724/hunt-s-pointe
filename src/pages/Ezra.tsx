import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BookOpen, Cross, Bookmark, CalendarDays, Languages } from "lucide-react";
import { EzraRail } from "@/components/ezra/EzraRail";
import { EzraMobileHeader } from "@/components/ezra/EzraMobileHeader";
import { EzraSessionsDrawer } from "@/components/ezra/EzraSessionsDrawer";
import { EzraComposer } from "@/components/ezra/EzraComposer";
import { EzraThread } from "@/components/ezra/EzraThread";
import { useEzraChat } from "@/components/ezra/useEzraChat";
import { useScripturePreferences } from "@/hooks/useScripturePreferences";
import { ScripturePreferencesDialog } from "@/components/sentient/ScripturePreferencesDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { GettingStartedCard } from "@/components/onboarding/GettingStartedCard";


// Starter studies — each sends a complete, well-formed prompt on click so the
// first response demonstrates what Ezra can do instead of making the user type.
const STARTERS = [
  {
    icon: BookOpen,
    title: "Study a passage",
    sub: "Context, structure, key themes",
    prompt: "Walk me through this week's passage — historical context, literary structure, and the key themes I should draw out.",
  },
  {
    icon: Cross,
    title: "Outline a sermon",
    sub: "From text to three movements",
    prompt: "Help me outline a sermon on grace: a guiding big idea, three movements, and one closing image.",
  },
  {
    icon: Bookmark,
    title: "Find cross-references",
    sub: "Trace a verse across Scripture",
    prompt: "Find the strongest cross-references for a verse I give you, and explain how each one deepens the reading.",
  },
  {
    icon: Languages,
    title: "Compare translations",
    sub: "Where the wording diverges",
    prompt: "Compare major translations of a verse I give you and flag where the wording meaningfully diverges — including the original language behind it.",
  },
];

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Grace for the late hour";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function sundayNote(): string {
  const day = new Date().getDay();
  if (day === 0) return "It's Sunday — go preach it";
  const days = 7 - day;
  return days === 1 ? "1 day to Sunday" : `${days} days to Sunday`;
}

const HISTORY_OPEN_KEY = "ezra.history.open";
const SCRIPTURE_MODE_KEY = "ezra.scripture.mode";
// Legacy keys preserved for one-time migration from prior "ezra.*" namespace.
const LEGACY_HISTORY_OPEN_KEY = "ezra.history.open";
const LEGACY_SCRIPTURE_MODE_KEY = "ezra.scripture.mode";

function readLegacyMigration(key: string, legacyKey: string): string | null {
  if (typeof window === "undefined") return null;
  const current = localStorage.getItem(key);
  if (current !== null) return current;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy !== null) {
    localStorage.setItem(key, legacy);
    localStorage.removeItem(legacyKey);
    return legacy;
  }
  return null;
}

export default function Ezra() {
  const [railOpen, setRailOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = readLegacyMigration(HISTORY_OPEN_KEY, LEGACY_HISTORY_OPEN_KEY);
    if (stored !== null) return stored === "1";
    // First run: keep the Chats rail collapsed to its icon strip so a newly
    // authenticated user lands on one calm surface, not multiple panels.
    return false;
  });
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [input, setInput] = useState("");
  const [scriptureMode, setScriptureMode] = useState<"on" | "off">(() => {
    if (typeof window === "undefined") return "off";
    return (readLegacyMigration(SCRIPTURE_MODE_KEY, LEGACY_SCRIPTURE_MODE_KEY) as "on" | "off") || "off";
  });
  const [scriptureDialogOpen, setScriptureDialogOpen] = useState(false);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);

  const { prefs: scripturePrefs, loaded: prefsLoaded } = useScripturePreferences();

  useEffect(() => {
    localStorage.setItem(HISTORY_OPEN_KEY, railOpen ? "1" : "0");
  }, [railOpen]);

  useEffect(() => {
    localStorage.setItem(SCRIPTURE_MODE_KEY, scriptureMode);
  }, [scriptureMode]);

  const handleScriptureToggle = useCallback(() => {
    if (scriptureMode === "off") {
      // Turning on — if user hasn't set prefs yet, open dialog first.
      if (prefsLoaded && !scripturePrefs) {
        setScriptureDialogOpen(true);
        return;
      }
      setScriptureMode("on");
    } else {
      setScriptureMode("off");
    }
  }, [scriptureMode, prefsLoaded, scripturePrefs]);

  const { messages, isLoading, isHydrating, pipeline, send, stop, regenerate, editAndResend, reset } = useEzraChat({
    sessionId: activeSessionId,
    onSessionCreated: (id) => {
      setActiveSessionId(id);
      setRefreshKey((k) => k + 1);
    },
    scriptureMode,
    scripturePrefs,
  });

  const handleNewSession = useCallback(() => {
    setActiveSessionId(null);
    reset();
    setInput("");
  }, [reset]);

  const handleSelectSession = useCallback((id: string | null) => {
    setActiveSessionId(id);
    setInput("");
  }, []);

  const handleSubmit = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    send(text);
  }, [input, send]);

  const isEmpty = messages.length === 0;
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Cross-service entry points, consumed once on mount:

  // · ?session=<id> deep-links from Collections artifacts and Analytics
  //   history straight into the originating thread
  // · location.state.prefill carries a seed — it loads into the composer
  //   (alongside the session when both are present) so the user decides
  //   whether to run it again.
  useEffect(() => {
    const sid = searchParams.get("session");
    const prefill = (location.state as { prefill?: string } | null)?.prefill;
    if (typeof prefill === "string" && prefill.trim()) {
      setInput(prefill);
      toast("Picked up from your history", {
        description: "Review the prompt below — press Enter to run it again.",
      });
    }
    if (sid) {
      setActiveSessionId(sid);
      setSearchParams({}, { replace: true });
    } else if (prefill) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return (
    <div className="ezra-surface h-full w-full flex overflow-hidden">
      {!isMobile && (
        <EzraRail
          open={railOpen}
          onToggle={() => setRailOpen((o) => !o)}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          refreshKey={refreshKey}
        />
      )}

      <main className="flex-1 min-w-0 flex flex-col relative">
        {isMobile && (
          <EzraMobileHeader
            sessionId={activeSessionId}
            onOpenHistory={() => setHistoryDrawerOpen(true)}
            onNewSession={handleNewSession}
          />
        )}
        {isHydrating ? (
          // Switching into an existing session — hold this instead of the
          // empty/starter state so reopening an old chat never flashes
          // "what are we studying?" before the real messages land.
          <div className="flex-1 min-h-0 overflow-hidden px-4 py-8">
            <div className="mx-auto w-full max-w-3xl space-y-6">
              <div className="flex justify-end">
                <div className="h-9 w-2/5 animate-pulse rounded-2xl bg-[var(--ezra-hover-bg)]" />
              </div>
              <div className="space-y-2.5">
                <div className="h-4 w-4/5 animate-pulse rounded bg-[var(--ezra-hover-bg)]" />
                <div className="h-4 w-3/5 animate-pulse rounded bg-[var(--ezra-hover-bg)]" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--ezra-hover-bg)]" />
              </div>
              <div className="flex justify-end">
                <div className="h-9 w-1/3 animate-pulse rounded-2xl bg-[var(--ezra-hover-bg)]" />
              </div>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 relative overflow-y-auto">
            <div className="pointer-events-none absolute inset-0 ezra-radial" aria-hidden />
            <div className="relative w-full max-w-2xl text-center mb-7 ezra-msg-enter">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ezra-border)] bg-[var(--ezra-panel)]/80 px-3 py-1 text-[11px] text-[var(--ezra-fg-muted)]">
                <CalendarDays className="h-3 w-3 text-[var(--ezra-accent)]" />
                {new Date().toLocaleDateString(undefined, { weekday: "long" })} · {sundayNote()}
              </div>
              <h1 className="mt-4 font-display text-[clamp(1.625rem,5vw,2.25rem)] md:text-4xl font-semibold tracking-tight text-foreground text-balance">
                {timeGreeting()} — what are we studying?
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Ezra is your research partner. Ask a question, pick a passage, or paste an outline.
              </p>
            </div>
            <div className="relative w-full max-w-2xl">
              <EzraComposer
                value={input}
                onChange={setInput}
                onSubmit={handleSubmit}
                onStop={stop}
                isLoading={isLoading}
                scriptureMode={scriptureMode}
                onScriptureToggle={handleScriptureToggle}
                glow
              />
              <p className="mt-2 text-center text-[11px] text-[var(--ezra-fg-muted)]/70">
                Enter to send · Shift+Enter for a new line
              </p>
              <div className="mt-5 hidden gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-4 px-4 ezra-scroll-hidden sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0">
                {STARTERS.map((s, i) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => send(s.prompt)}
                    disabled={isLoading}
                    style={{ "--stagger-i": i + 2 } as React.CSSProperties}
                    className="group flex shrink-0 basis-[78%] snap-start items-center gap-3 rounded-2xl border border-[var(--ezra-border)] bg-[var(--ezra-panel)]/70 px-4 py-3 text-left ezra-tactile rise-in hover:border-[var(--ezra-accent)]/50 hover:bg-[var(--ezra-hover-bg)] disabled:opacity-50 sm:basis-auto"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--ezra-active-bg)] text-[var(--ezra-accent)] transition-transform duration-200 group-hover:scale-110">
                      <s.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-[var(--ezra-fg)]">{s.title}</span>
                      <span className="block truncate text-xs text-[var(--ezra-fg-muted)]">{s.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
              <GettingStartedCard />
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0">
              <EzraThread
                messages={messages}
                isLoading={isLoading}
                pipeline={pipeline}
                sessionId={activeSessionId}
                onRegenerate={regenerate}
                onEditAndResend={editAndResend}
              />
            </div>
            {/* Composer floats over a soft fade instead of a hard-bordered
                panel, so the conversation and the input read as one surface. */}
            <div className="relative px-4 pb-4 pt-1">
              <div
                className="pointer-events-none absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-[var(--ezra-bg)] to-transparent"
                aria-hidden
              />
              <div className="max-w-3xl mx-auto">
                <EzraComposer
                  value={input}
                  onChange={setInput}
                  onSubmit={handleSubmit}
                  onStop={stop}
                  isLoading={isLoading}
                  scriptureMode={scriptureMode}
                  onScriptureToggle={handleScriptureToggle}
                  placeholder="Ask a follow-up…"
                />
                <p className="mt-1.5 text-center text-[10px] text-[var(--ezra-fg-muted)]/60 select-none">
                  Ezra can make mistakes — check Scripture references before you preach them.
                </p>
              </div>
            </div>
          </>
        )}
      </main>

      <ScripturePreferencesDialog
        open={scriptureDialogOpen}
        onOpenChange={(o) => {
          setScriptureDialogOpen(o);
          // If closing and prefs now exist, turn scripture on.
          if (!o && scripturePrefs) setScriptureMode("on");
        }}
      />

      {isMobile && (
        <EzraSessionsDrawer
          open={historyDrawerOpen}
          onOpenChange={setHistoryDrawerOpen}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          refreshKey={refreshKey}
        />
      )}
    </div>
  );
}
