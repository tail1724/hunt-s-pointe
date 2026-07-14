import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Verse } from "@/lib/bible";
import {
  DEFAULT_PERSONA_ID, getPersona, resolvePersonaVoices, VOICE_PERSONAS,
} from "@/config/voices";

const PERSONA_KEY = "bible.audio.persona.v1";
const SPEED_KEY = "bible.audio.speed.v1";

export type AudioStatus = "idle" | "playing" | "paused";
export type SleepSetting = "off" | "chapter" | "15m" | "30m";

export interface ScriptureAudioChapter {
  /** Unique per rendered chapter (translation + book + chapter). */
  id: string;
  bookName: string;
  chapterNumber: number;
  verses: Verse[];
}

interface Options {
  chapter: ScriptureAudioChapter | null;
  /** Called when the chapter finishes and auto-advance is on. Return false when there is no next chapter. */
  onAdvanceChapter?: () => boolean;
}

/**
 * Chapter read-aloud engine on the browser speech synthesizer.
 *
 * Verses are queued as individual utterances rather than one chapter-long
 * utterance. That gives exact verse boundaries for synced highlighting and
 * seeking, and sidesteps Chromium's silent cutoff on long utterances.
 * Pause is implemented as cancel + remember-verse (SpeechSynthesis.pause is
 * unreliable across engines); resume restarts the current verse.
 */
export function useScriptureAudio({ chapter, onAdvanceChapter }: Options) {
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const [status, setStatus] = useState<AudioStatus>("idle");
  const [verseIndex, setVerseIndex] = useState(0);
  const [personaId, setPersonaIdState] = useState<string>(
    () => localStorage.getItem(PERSONA_KEY) || DEFAULT_PERSONA_ID,
  );
  const [speed, setSpeedState] = useState<number>(() => {
    const s = parseFloat(localStorage.getItem(SPEED_KEY) || "1");
    return Number.isFinite(s) && s >= 0.5 && s <= 2 ? s : 1;
  });
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [sleep, setSleep] = useState<SleepSetting>("off");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Refs mirror the state the async utterance callbacks need.
  const stateRef = useRef({
    verses: [] as Verse[],
    index: 0,
    playing: false,
    personaId,
    speed,
    autoAdvance,
    sleep,
    sleepDeadline: 0,
    autoplayNextChapter: false,
    generation: 0, // bumped on every cancel to orphan stale utterance callbacks
  });
  stateRef.current.personaId = personaId;
  stateRef.current.speed = speed;
  stateRef.current.autoAdvance = autoAdvance;
  stateRef.current.sleep = sleep;
  stateRef.current.verses = chapter?.verses ?? [];

  useEffect(() => {
    if (!supported) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, [supported]);

  const personaVoices = useMemo(() => resolvePersonaVoices(voices), [voices]);

  const cancelEngine = useCallback(() => {
    stateRef.current.generation += 1;
    window.speechSynthesis?.cancel();
  }, []);

  const stop = useCallback(() => {
    cancelEngine();
    stateRef.current.playing = false;
    stateRef.current.autoplayNextChapter = false;
    setStatus("idle");
  }, [cancelEngine]);

  const speakFrom = useCallback((index: number) => {
    const s = stateRef.current;
    const verse = s.verses[index];
    if (!verse) {
      // Chapter finished.
      const sleepAtChapterEnd = s.sleep === "chapter";
      if (!sleepAtChapterEnd && s.autoAdvance && onAdvanceChapter) {
        s.autoplayNextChapter = true;
        const advanced = onAdvanceChapter();
        if (advanced) return; // playback resumes via the chapter-change effect
        s.autoplayNextChapter = false;
      }
      s.playing = false;
      setStatus("idle");
      return;
    }
    if (s.sleepDeadline && Date.now() > s.sleepDeadline) {
      s.playing = false;
      s.sleepDeadline = 0;
      setSleep("off");
      setStatus("idle");
      return;
    }

    const persona = getPersona(s.personaId);
    const voice = personaVoices.get(persona.id) ?? null;
    const u = new SpeechSynthesisUtterance(verse.text);
    if (voice) u.voice = voice;
    u.rate = persona.rate * s.speed;
    u.pitch = persona.pitch;

    const generation = s.generation;
    u.onend = () => {
      if (stateRef.current.generation !== generation || !stateRef.current.playing) return;
      stateRef.current.index = index + 1;
      setVerseIndex(index + 1);
      speakFrom(index + 1);
    };
    u.onerror = () => {
      if (stateRef.current.generation !== generation) return;
      stateRef.current.playing = false;
      setStatus("idle");
    };

    s.index = index;
    setVerseIndex(index);
    window.speechSynthesis.speak(u);
  }, [onAdvanceChapter, personaVoices]);

  const playFrom = useCallback((index: number) => {
    if (!supported || stateRef.current.verses.length === 0) return;
    cancelEngine();
    stateRef.current.playing = true;
    setStatus("playing");
    speakFrom(Math.max(0, Math.min(index, stateRef.current.verses.length - 1)));
  }, [supported, cancelEngine, speakFrom]);

  const play = useCallback(() => playFrom(0), [playFrom]);

  const pause = useCallback(() => {
    cancelEngine();
    stateRef.current.playing = false;
    setStatus("paused");
  }, [cancelEngine]);

  const resume = useCallback(() => {
    playFrom(stateRef.current.index);
  }, [playFrom]);

  const toggle = useCallback(() => {
    if (status === "playing") pause();
    else if (status === "paused") resume();
    else play();
  }, [status, pause, resume, play]);

  const seekVerse = useCallback((index: number) => {
    if (stateRef.current.playing) playFrom(index);
    else {
      stateRef.current.index = index;
      setVerseIndex(index);
    }
  }, [playFrom]);

  const stepVerse = useCallback((dir: 1 | -1) => {
    seekVerse(Math.max(0, Math.min(stateRef.current.index + dir, stateRef.current.verses.length - 1)));
  }, [seekVerse]);

  const setPersonaId = useCallback((id: string) => {
    setPersonaIdState(id);
    localStorage.setItem(PERSONA_KEY, id);
    stateRef.current.personaId = id;
    if (stateRef.current.playing) playFrom(stateRef.current.index);
  }, [playFrom]);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
    localStorage.setItem(SPEED_KEY, String(s));
    stateRef.current.speed = s;
    if (stateRef.current.playing) playFrom(stateRef.current.index);
  }, [playFrom]);

  const setSleepSetting = useCallback((s: SleepSetting) => {
    setSleep(s);
    stateRef.current.sleep = s;
    stateRef.current.sleepDeadline =
      s === "15m" ? Date.now() + 15 * 60_000 :
      s === "30m" ? Date.now() + 30 * 60_000 : 0;
  }, []);

  /** Audition a persona from the picker without disturbing chapter position. */
  const preview = useCallback((id: string) => {
    if (!supported) return;
    const persona = getPersona(id);
    cancelEngine();
    stateRef.current.playing = false;
    setStatus((prev) => (prev === "playing" ? "paused" : prev));
    const u = new SpeechSynthesisUtterance(persona.sampleText);
    const voice = personaVoices.get(persona.id) ?? null;
    if (voice) u.voice = voice;
    u.rate = persona.rate;
    u.pitch = persona.pitch;
    window.speechSynthesis.speak(u);
  }, [supported, cancelEngine, personaVoices]);

  // Chapter change: keep playing into the new chapter when auto-advance
  // requested it, otherwise reset the session.
  const chapterKey = chapter?.id ?? "";
  const prevChapterKey = useRef(chapterKey);
  useEffect(() => {
    if (prevChapterKey.current === chapterKey) return;
    prevChapterKey.current = chapterKey;
    const s = stateRef.current;
    if (chapterKey === "") {
      // Chapter is loading. Silence the engine but keep the auto-advance
      // intent (and the dock) alive so playback continues when verses arrive.
      cancelEngine();
      if (!s.autoplayNextChapter) {
        s.playing = false;
        s.index = 0;
        setVerseIndex(0);
        setStatus("idle");
      }
      return;
    }
    if (s.autoplayNextChapter && chapter && chapter.verses.length > 0) {
      s.autoplayNextChapter = false;
      playFrom(0);
    } else {
      stop();
      s.index = 0;
      setVerseIndex(0);
    }
  }, [chapterKey, chapter, playFrom, stop, cancelEngine]);

  // Never leave the synthesizer running after unmount.
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const active = status !== "idle";
  const speakingVerse = active ? stateRef.current.verses[verseIndex]?.verse ?? null : null;

  return {
    supported,
    status,
    active,
    verseIndex,
    speakingVerse,
    verseCount: chapter?.verses.length ?? 0,
    personaId,
    persona: getPersona(personaId),
    personas: VOICE_PERSONAS,
    personaVoices,
    speed,
    autoAdvance,
    sleep,
    play,
    playFrom,
    pause,
    resume,
    toggle,
    stop,
    seekVerse,
    stepVerse,
    setPersonaId,
    setSpeed,
    setAutoAdvance,
    setSleep: setSleepSetting,
    preview,
  };
}

export type ScriptureAudio = ReturnType<typeof useScriptureAudio>;
