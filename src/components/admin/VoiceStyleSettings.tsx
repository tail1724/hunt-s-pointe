import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useStyleGuide } from "@/lib/authenticity/useStyleGuide";
import { useVoiceProfile } from "@/lib/authenticity/useVoiceProfile";
import { toast } from "sonner";

const linesToList = (v: string) => v.split("\n").map((s) => s.trim()).filter(Boolean);
const listToLines = (v: string[]) => v.join("\n");

/**
 * The two settings that make the authenticity layer real (addendum Group
 * III): house style rules and the EIC's locked voice traits. Every editing
 * prompt across the app is instructed never to violate these.
 */
export function VoiceStyleSettings() {
  const styleGuide = useStyleGuide();
  const voiceProfile = useVoiceProfile();

  const [bannedPhrases, setBannedPhrases] = useState("");
  const [formattingNotes, setFormattingNotes] = useState("");
  const [houseStance, setHouseStance] = useState("");
  const [lockedTraits, setLockedTraits] = useState("");
  const [savingStyle, setSavingStyle] = useState(false);
  const [savingVoice, setSavingVoice] = useState(false);

  useEffect(() => {
    if (styleGuide.guide) {
      setBannedPhrases(listToLines(styleGuide.guide.banned_phrases));
      setFormattingNotes(styleGuide.guide.formatting_notes ?? "");
      setHouseStance(styleGuide.guide.house_stance ?? "");
    }
  }, [styleGuide.guide]);

  useEffect(() => {
    if (voiceProfile.profile) setLockedTraits(listToLines(voiceProfile.profile.locked_traits));
  }, [voiceProfile.profile]);

  const saveStyle = async () => {
    setSavingStyle(true);
    await styleGuide.save({
      bannedPhrases: linesToList(bannedPhrases),
      formattingNotes: formattingNotes.trim() || null,
      houseStance: houseStance.trim() || null,
    });
    setSavingStyle(false);
    toast.success("House style saved");
  };

  const saveVoice = async () => {
    setSavingVoice(true);
    await voiceProfile.save(linesToList(lockedTraits));
    setSavingVoice(false);
    toast.success("Voice locks saved");
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">House style</CardTitle>
          <CardDescription>
            Enforced in every PressRoom suggestion — banned phrases, formatting rules, and your
            publication's narrative stance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="banned-phrases">Banned phrases (one per line)</Label>
            <Textarea
              id="banned-phrases"
              rows={4}
              value={bannedPhrases}
              onChange={(e) => setBannedPhrases(e.target.value)}
              placeholder={"e.g. \"in today's world\"\nutilize\nat the end of the day"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="house-stance">Narrative stance</Label>
            <Input
              id="house-stance"
              value={houseStance}
              onChange={(e) => setHouseStance(e.target.value)}
              placeholder="e.g. second person, active voice, no editorializing in news copy"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="formatting-notes">Formatting notes</Label>
            <Textarea
              id="formatting-notes"
              rows={2}
              value={formattingNotes}
              onChange={(e) => setFormattingNotes(e.target.value)}
              placeholder="e.g. Oxford comma required; numerals under 10 spelled out"
            />
          </div>
          <Button size="sm" onClick={saveStyle} disabled={savingStyle}>
            {savingStyle ? "Saving…" : "Save house style"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice locks</CardTitle>
          <CardDescription>
            Your protected stylistic fingerprint — PressRoom is instructed never to "correct"
            these away, even under a grammar or tone pass.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="locked-traits">Protected traits (one per line)</Label>
            <Textarea
              id="locked-traits"
              rows={4}
              value={lockedTraits}
              onChange={(e) => setLockedTraits(e.target.value)}
              placeholder={"Heavy use of em dashes\nSentence fragments for emphasis\nParagraphs that open with \"And\" or \"But\""}
            />
          </div>
          <Button size="sm" onClick={saveVoice} disabled={savingVoice}>
            {savingVoice ? "Saving…" : "Save voice locks"}
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
