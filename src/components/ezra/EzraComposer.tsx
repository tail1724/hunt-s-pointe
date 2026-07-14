import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Square, Plus, BookOpen, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PowerDial } from "@/components/ezra/PowerDial";
import { useNexusVoice } from "@/hooks/useNexusVoice";
import { useVoicePreferences } from "@/hooks/useVoicePreferences";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CollectionPicker } from "@/components/collections/CollectionPicker";
import { VoiceButton } from "@/components/voice/VoiceButton";
import { CountdownRing } from "@/components/voice/CountdownRing";
import { SilenceWatcher } from "@/lib/voice/vad";
import { playCancel, playTick } from "@/lib/voice/ui-sound";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isLoading: boolean;
  placeholder?: string;
  glow?: boolean;
  scriptureMode?: "on" | "off";
  onScriptureToggle?: () => void;
}


export function EzraComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading,
  placeholder = "Ask Ezra anything…",
  glow = false,
  scriptureMode = "off",
  onScriptureToggle,
}: Props) {

  const { user } = useAuth();
  const { prefs, update: updatePrefs } = useVoicePreferences();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [interim, setInterim] = useState("");
  const [countdownActive, setCountdownActive] = useState(false);
  const watcherRef = useRef<SilenceWatcher | null>(null);
  const lastTickRef = useRef<number>(0);

  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      onChange(value ? value.trimEnd() + " " + text : text);
      setInterim("");
    } else {
      setInterim(text);
    }
  }, [onChange, value]);

  const voice = useNexusVoice({
    mode: "presence",
    onTranscript: handleTranscript,
    enabled: !!user,
    sounds: prefs.sounds,
  });
  const { start, stop, isSupported, state, errorKind, amplitude, bands } = voice;

  // VAD silence watcher → arms the countdown when hands-free is on.
  useEffect(() => {
    const listening = state === "listening" || state === "transcribing";
    if (!listening || !prefs.autoSend) {
      setCountdownActive(false);
      watcherRef.current = null;
      return;
    }
    if (!watcherRef.current) {
      watcherRef.current = new SilenceWatcher({ silenceMs: 600 }); // pre-arm window
    }
    const { silentFor } = watcherRef.current.push(amplitude);
    const ready = (value.trim() + " " + interim.trim()).trim().length >= prefs.minTranscriptChars;
    if (ready && silentFor >= 600 && !countdownActive) {
      setCountdownActive(true);
      if (prefs.sounds) playTick();
    } else if (!ready && countdownActive) {
      setCountdownActive(false);
    }
    if (countdownActive && prefs.sounds) {
      const now = performance.now();
      if (now - lastTickRef.current > 320) {
        lastTickRef.current = now;
        playTick();
      }
    }
  }, [amplitude, state, prefs.autoSend, prefs.minTranscriptChars, prefs.sounds, value, interim, countdownActive]);

  const cancelCountdown = useCallback(() => {
    if (!countdownActive) return;
    setCountdownActive(false);
    watcherRef.current?.reset();
    if (prefs.sounds) playCancel();
  }, [countdownActive, prefs.sounds]);

  const handleAutoSend = useCallback(() => {
    setCountdownActive(false);
    const candidate = (value.trim() + (interim ? " " + interim.trim() : "")).trim();
    if (!candidate || candidate.length < prefs.minTranscriptChars) return;
    if (!isLoading) {
      stop();
      setInterim("");
      onSubmit();
    }
  }, [value, interim, prefs.minTranscriptChars, isLoading, stop, onSubmit]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [value]);

  useEffect(() => {
    // Autofocus pops the on-screen keyboard the instant the page loads on
    // mobile — desktop keeps it since there's no keyboard cost there. Reads
    // the viewport directly (this app has no SSR) rather than useIsMobile's
    // state, which is still `false` for one tick after mount and would
    // otherwise focus-then-blur on a phone before it catches up.
    if (typeof window === "undefined" || window.innerWidth >= 768) {
      textareaRef.current?.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) onSubmit();
    }
  };

  return (
    <div
      className={cn("relative w-full", glow && "ezra-composer-glow")}
      onMouseDownCapture={cancelCountdown}
      onKeyDownCapture={cancelCountdown}
    >
      <div className="mb-2 flex items-center gap-2">
        <CollectionPicker surface="mary" compact />
        {voice.isSupported && user && (
          <label
            htmlFor="hands-free-switch"
            className="ml-auto inline-flex items-center gap-2 text-[11px] font-medium text-foreground/70 cursor-pointer select-none"
          >
            Hands-free send
            <Switch
              id="hands-free-switch"
              checked={prefs.autoSend}
              onCheckedChange={(v) => updatePrefs({ autoSend: v })}
              aria-label="Hands-free send"
            />
          </label>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && !isLoading) onSubmit();
        }}
        className={cn(
          "relative flex flex-col gap-2 rounded-[28px] border border-[var(--ezra-composer-border)]",
          "lg:flex-row lg:items-end lg:gap-2",
          "bg-[var(--ezra-composer-bg)] px-3 py-2.5 shadow-[inset_0_1px_0_var(--ezra-border)]",
          "ezra-composer-focus transition-all duration-150",
        )}
      >
        <CountdownRing
          active={countdownActive}
          durationMs={Math.max(400, prefs.silenceThresholdMs - 600)}
          onComplete={handleAutoSend}
          radius={28}
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={isLoading}
          aria-label="Message Ezra"
          className={cn(
            // text-base (16px) below md stops iOS Safari's auto-zoom-on-focus.
            "w-full lg:flex-1 bg-transparent resize-none outline-none border-0 px-1 py-1.5 text-base md:text-sm",
            "text-[var(--ezra-fg)] placeholder:text-[var(--ezra-fg-muted)]/60 max-h-[180px]",
            "min-h-[44px] lg:min-h-[28px]",
            "scrollbar-thin",
          )}
        />

        <div className="flex items-center gap-1 w-full lg:w-auto lg:contents">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-10 w-10 lg:h-8 lg:w-8 rounded-full shrink-0 ezra-tactile text-foreground/70 lg:self-end"
            aria-label="Attach"
            tabIndex={-1}
          >
            <Plus className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 ml-auto lg:contents lg:self-end lg:shrink-0">
          {onScriptureToggle && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={onScriptureToggle}
                  aria-pressed={scriptureMode === "on"}
                  aria-label="Toggle scripture grounding"
                  className={cn(
                    "h-10 w-10 lg:h-8 lg:w-8 rounded-full ezra-tactile",
                    scriptureMode === "on" && "bg-[hsl(40_56%_51%/0.22)] text-[hsl(40_56%_60%)]",
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Scripture grounding: {scriptureMode === "on" ? "On" : "Off"}
              </TooltipContent>
            </Tooltip>
          )}
          <PowerDial />


          {user ? (
            <VoiceButton
              state={state}
              errorKind={errorKind}
              amplitude={amplitude}
              bands={bands}
              isSupported={isSupported}
              onStart={start}
              onStop={stop}
              disabled={isLoading}
            />
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled
                  className="h-10 w-10 lg:h-8 lg:w-8 rounded-full opacity-40"
                  aria-label="Voice unavailable"
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sign in to use voice</TooltipContent>
            </Tooltip>
          )}

          {isLoading ? (
            <Button
              type="button"
              size="icon"
              onClick={onStop}
              aria-label="Stop"
              className="h-10 w-10 lg:h-8 lg:w-8 rounded-full bg-[var(--ezra-accent)] text-[var(--ezra-accent-fg)] hover:opacity-90 ezra-tactile"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={!value.trim()}
              aria-label="Send"
              className={cn(
                "h-10 w-10 lg:h-8 lg:w-8 rounded-full bg-[var(--ezra-accent)] text-[var(--ezra-accent-fg)] hover:opacity-90 ezra-tactile",
                "disabled:bg-[var(--ezra-border)] disabled:text-foreground/40",
                value.trim() && "shadow-[0_0_14px_hsl(40_56%_51%/0.4)] scale-100 transition-shadow",
              )}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          </div>
        </div>
      </form>
      {(interim || state === "error") && (
        <div
          className={cn(
            "mt-1.5 px-4 text-[12px] leading-snug",
            state === "error" ? "text-red-500/90" : "text-foreground/55 italic",
          )}
          aria-live="polite"
        >
          {state === "error" && errorKind ? (
            <>
              {errorKind === "permission-denied" && "Microphone access is blocked — enable it in your browser settings."}
              {errorKind === "no-device" && "No microphone detected."}
              {errorKind === "network" && "Network interrupted — tap the mic to retry."}
              {errorKind === "unsupported" && "Voice input isn't supported in this browser."}
              {errorKind === "unknown" && "Voice input failed — tap the mic to retry."}
            </>
          ) : (
            <span className="ghost-stream">Hearing: {interim}</span>
          )}
        </div>
      )}
    </div>
  );
}
