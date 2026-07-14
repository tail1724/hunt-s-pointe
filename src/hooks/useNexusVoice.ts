import { useCallback, useEffect, useRef, useState } from "react";
import { requestMic, subscribeAmplitude, releaseMic } from "@/lib/voice/audio-engine";
import { playActivate, playFinalize } from "@/lib/voice/ui-sound";

type VoiceMode = "presence" | "direct" | "stream";

export type VoiceState = "idle" | "requesting" | "listening" | "transcribing" | "done" | "error";
export type VoiceErrorKind = "permission-denied" | "no-device" | "network" | "unsupported" | "unknown";

interface UseNexusVoiceOptions {
  mode: VoiceMode;
  onTranscript: (text: string, isFinal: boolean) => void;
  onAudioLevel?: (level: number) => void;
  /** Called when an auto-send is requested by VAD (Phase 2 callers wire this). */
  onAutoSendRequested?: () => void;
  enabled?: boolean;
  /** Play activation/finalize sounds. */
  sounds?: boolean;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

export function useNexusVoice({
  mode,
  onTranscript,
  onAudioLevel,
  enabled = true,
  sounds = false,
}: UseNexusVoiceOptions) {
  const [state, setState] = useState<VoiceState>("idle");
  const [errorKind, setErrorKind] = useState<VoiceErrorKind | null>(null);
  const [amplitude, setAmplitude] = useState(0);
  const [bands, setBands] = useState<Uint8Array | null>(null);
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const ampUnsubRef = useRef<(() => void) | null>(null);
  const wantActiveRef = useRef(false);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const isSupported = !!SpeechRecognition;

  const teardownAudio = useCallback(() => {
    ampUnsubRef.current?.();
    ampUnsubRef.current = null;
    setAmplitude(0);
    setBands(null);
    onAudioLevel?.(0);
    // Release mic only if no other consumers — engine handles refcount via subscribers.
    releaseMic();
  }, [onAudioLevel]);

  const stop = useCallback(() => {
    wantActiveRef.current = false;
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    teardownAudio();
    setInterimText("");
    setState((s) => (s === "error" ? s : "idle"));
  }, [teardownAudio]);

  const start = useCallback(async () => {
    if (!enabled) return;
    if (!SpeechRecognition) {
      setState("error"); setErrorKind("unsupported"); return;
    }
    // Synchronous feedback within the same tick — UX guarantee.
    setErrorKind(null);
    setState("requesting");
    wantActiveRef.current = true;

    // Mic + analyser
    try {
      await requestMic();
    } catch (e: any) {
      const kind = (e?.message as VoiceErrorKind) || "unknown";
      setErrorKind(kind === "permission-denied" || kind === "no-device" || kind === "unsupported" ? kind : "unknown");
      setState("error");
      return;
    }

    ampUnsubRef.current?.();
    ampUnsubRef.current = subscribeAmplitude(({ rms, bands }) => {
      setAmplitude(rms);
      setBands(bands);
      onAudioLevel?.(rms);
    });

    // Speech recognition
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = mode === "presence";
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setState("listening");
      if (sounds) playActivate();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        const txt = res[0].transcript;
        if (res.isFinal) final += txt;
        else interim += txt;
      }
      if (interim) {
        setInterimText(interim);
        setState((s) => (s === "listening" ? "transcribing" : s));
        onTranscript(interim, false);
      }
      if (final) {
        setInterimText("");
        onTranscript(final, true);
        if (sounds) playFinalize();
        setState((s) => (s === "error" ? s : "listening"));
      }
    };

    recognition.onend = () => {
      if (mode === "presence" && wantActiveRef.current && recognitionRef.current === recognition) {
        restartTimeoutRef.current = setTimeout(() => {
          if (recognitionRef.current === recognition && wantActiveRef.current) {
            try { recognition.start(); } catch {}
          }
        }, 250);
      } else if (!wantActiveRef.current) {
        // Already stopped externally.
      } else {
        setState("done");
        teardownAudio();
      }
    };

    recognition.onerror = (e: any) => {
      const err = e?.error;
      if (err === "aborted" || err === "no-speech") return;
      if (err === "not-allowed" || err === "service-not-allowed") { setErrorKind("permission-denied"); setState("error"); stop(); return; }
      if (err === "audio-capture") { setErrorKind("no-device"); setState("error"); stop(); return; }
      if (err === "network") { setErrorKind("network"); setState("error"); stop(); return; }
      setErrorKind("unknown"); setState("error"); stop();
    };

    try { recognition.start(); } catch { stop(); }
  }, [SpeechRecognition, mode, onTranscript, onAudioLevel, enabled, sounds, stop, teardownAudio]);

  // Push-to-talk for Direct mode (hold Space)
  useEffect(() => {
    if (mode !== "direct" || !enabled || !isSupported) return;
    const isListening = state === "listening" || state === "transcribing";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body && !isListening) {
        e.preventDefault(); start();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body && isListening) {
        e.preventDefault(); stop();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [mode, enabled, isSupported, state, start, stop]);

  useEffect(() => () => { stop(); }, [stop]);

  const isListening = state === "listening" || state === "transcribing" || state === "requesting";

  return {
    start,
    stop,
    isListening,
    isSupported,
    state,
    errorKind,
    amplitude,
    bands,
    interimText,
  };
}
