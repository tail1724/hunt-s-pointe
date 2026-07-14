import { trackEvent } from "@/lib/track";

export interface LitePromptChip {
  label: string;
  prompt: string;
  bucket: string;
}

export const LITE_PROMPT_CHIPS: LitePromptChip[] = [
  { label: "Wedding sermon", prompt: "Draft a short wedding ceremony homily about covenant love.", bucket: "wedding" },
  { label: "Funeral message", prompt: "Write a comforting memorial message for a grieving family.", bucket: "funeral" },
  { label: "VBS week plan", prompt: "Outline a 5-day Vacation Bible School curriculum for ages 5–11.", bucket: "vbs" },
  { label: "Small-group study", prompt: "Create a small-group Bible study on forgiveness with discussion questions.", bucket: "bible_study" },
  { label: "Morning devotional", prompt: "Write a morning devotional on hope and quiet faithfulness.", bucket: "devotional" },
  { label: "Youth talk", prompt: "Give me a youth group talk about identity and tuning out social media noise.", bucket: "youth" },
];

interface Props {
  onPick: (prompt: string) => void;
}

export function LitePromptChips({ onPick }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {LITE_PROMPT_CHIPS.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => {
            trackEvent("lite_chip_tapped", { bucket: chip.bucket, label: chip.label });
            onPick(chip.prompt);
          }}
          className="rounded-full border border-border bg-card/60 backdrop-blur px-3.5 py-2 text-xs md:text-sm font-medium text-foreground/80 hover:text-foreground hover:border-primary/50 hover:bg-card transition-all min-h-[36px] active:scale-95"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}
