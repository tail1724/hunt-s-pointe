import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square } from "lucide-react";
import { LiveMeter } from "./LiveMeter";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { VoiceState, VoiceErrorKind } from "@/hooks/useNexusVoice";

interface Props {
  state: VoiceState;
  errorKind: VoiceErrorKind | null;
  amplitude: number;
  bands: Uint8Array | null;
  isSupported: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

const ERROR_COPY: Record<VoiceErrorKind, string> = {
  "permission-denied": "Microphone access is blocked — enable it in your browser settings.",
  "no-device": "No microphone detected.",
  "network": "Network interrupted — tap to retry.",
  "unsupported": "Voice input isn't supported in this browser.",
  "unknown": "Voice input failed — tap to retry.",
};

export function VoiceButton({
  state, errorKind, amplitude, bands, isSupported,
  onStart, onStop, disabled,
}: Props) {
  const expanded = state === "listening" || state === "transcribing" || state === "requesting";
  const isError = state === "error";
  const tooltip = isError && errorKind ? ERROR_COPY[errorKind] : "Voice";

  if (!isSupported) {
    // A disabled, tooltip-only mic is a dead end on touch — there's no
    // hover to reveal *why* it's disabled, and it can't ever become usable
    // (iOS Safari has no SpeechRecognition at all). Drop it from the
    // layout rather than show a control that can never work.
    return null;
  }

  const handleClick = () => {
    if (disabled) return;
    if (expanded || isError) onStop();
    if (!expanded) onStart();
  };

  // Glow intensity from amplitude
  const glow = expanded ? 6 + amplitude * 20 : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          type="button"
          onClick={handleClick}
          disabled={disabled}
          aria-label={expanded ? "Stop voice" : "Start voice"}
          aria-pressed={expanded}
          layout
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className={cn(
            "relative inline-flex items-center justify-center self-end shrink-0",
            "rounded-full overflow-hidden",
            "border transition-colors",
            isError
              ? "border-red-500/60 text-red-500 bg-red-500/10"
              : expanded
                ? "border-[hsl(40_56%_51%/0.5)] bg-[hsl(40_56%_51%/0.14)] text-[hsl(40_56%_60%)]"
                : "border-transparent text-foreground/70 hover:bg-foreground/5",
          )}
          style={{
            height: 32,
            paddingLeft: expanded ? 10 : 0,
            paddingRight: expanded ? 8 : 0,
            boxShadow: glow ? `0 0 ${glow}px hsl(40 56% 55% / 0.45)` : undefined,
          }}
        >
          <AnimatePresence initial={false} mode="wait">
            {!expanded && !isError && (
              <motion.span
                key="mic"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.12 }}
                className="inline-flex h-8 w-8 items-center justify-center"
              >
                <Mic className="h-4 w-4" />
              </motion.span>
            )}
            {isError && (
              <motion.span
                key="err"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="inline-flex h-8 w-8 items-center justify-center"
              >
                <MicOff className="h-4 w-4" />
              </motion.span>
            )}
            {expanded && (
              <motion.span
                key="meter"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="inline-flex items-center gap-2"
              >
                {state === "requesting" ? (
                  <span className="inline-block h-2 w-2 rounded-full bg-current animate-pulse" />
                ) : (
                  <LiveMeter
                    amplitude={amplitude}
                    bands={bands}
                    active={expanded}
                    width={92}
                    height={20}
                  />
                )}
                <Square className="h-3 w-3 fill-current" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
