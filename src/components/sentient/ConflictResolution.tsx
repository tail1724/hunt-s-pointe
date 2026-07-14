import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, X } from "lucide-react";

interface ConflictResolutionProps {
  voiceTranscript: string;
  uiAction: string;
  onResolve: (choice: "voice" | "ui", note?: string) => void;
  onDismiss: () => void;
}

const squishSpring = { type: "spring" as const, stiffness: 300, damping: 20 };

export function ConflictResolution({
  voiceTranscript,
  uiAction,
  onResolve,
  onDismiss,
}: ConflictResolutionProps) {
  const [expanded, setExpanded] = useState<"voice" | "ui" | null>(null);
  const [note, setNote] = useState("");

  const handleChoose = (choice: "voice" | "ui") => {
    if (expanded === choice) {
      onResolve(choice, note || undefined);
    } else {
      setExpanded(choice);
      setNote("");
    }
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 100, opacity: 0, scale: 0.9 }}
      transition={squishSpring}
      className="fixed bottom-20 right-4 z-50 w-80 rounded-xl bg-card p-4"
      style={{
        border: "1px solid hsl(40 100% 50% / 0.5)",
        boxShadow: "0 0 24px 4px hsl(40 100% 50% / 0.15)",
      }}
    >
      <div className="flex items-start gap-2 mb-3">
        <motion.div
          animate={{ rotate: [0, -8, 8, -4, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        </motion.div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-foreground">Tissue Conflict Detected</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Voice and UI signals overlap. Choose which pathway to execute.
          </p>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-2">
        {(["voice", "ui"] as const).map((choice) => (
          <motion.div key={choice} layout transition={squishSpring}>
            <Button
              variant={expanded === choice ? "default" : "outline"}
              size="sm"
              className="w-full justify-start text-xs gap-2"
              onClick={() => handleChoose(choice)}
            >
              {choice === "voice" ? `🎙 Voice: "${voiceTranscript.slice(0, 40)}"` : `🖱 UI: "${uiAction.slice(0, 40)}"`}
            </Button>
            <AnimatePresence>
              {expanded === choice && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={squishSpring}
                  className="overflow-hidden"
                >
                  <div className="mt-1.5 flex gap-1.5">
                    <Input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add context (optional)…"
                      className="text-xs h-7"
                      onKeyDown={(e) => e.key === "Enter" && handleChoose(choice)}
                    />
                    <Button size="sm" className="h-7 text-xs px-2" onClick={() => handleChoose(choice)}>
                      Go
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
