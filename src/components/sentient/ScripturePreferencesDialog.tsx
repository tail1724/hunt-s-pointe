import { useEffect, useState } from "react";
import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogDescription as DialogDescription,
  ResponsiveDialogFooter as DialogFooter,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { listTranslations } from "@/lib/bible";
import type { TranslationMeta } from "@/lib/bible";
import { useScripturePreferences, SCRIPTURE_DEFAULTS } from "@/hooks/useScripturePreferences";

const TRADITIONS = [
  "Catholic",
  "Eastern Orthodox",
  "Anglican",
  "Lutheran",
  "Reformed / Presbyterian",
  "Baptist",
  "Methodist",
  "Pentecostal / Charismatic",
  "Non-denominational Evangelical",
  "Messianic Jewish",
  "Academic / Non-confessional",
];

const STYLES = [
  "Devotional",
  "Expository / Verse-by-verse",
  "Homiletic (sermon)",
  "Academic (with cross-refs)",
  "Conversational",
  "Liturgical",
];

const DENSITIES = ["Sparse", "Balanced", "Dense"];

const TRADITION_SUGGESTED: Record<string, string> = {
  "Catholic": "DRC",
  "Eastern Orthodox": "KJVA",
  "Anglican": "KJV",
  "Lutheran": "KJV",
  "Reformed / Presbyterian": "Geneva1599",
  "Baptist": "KJV",
  "Methodist": "WEB",
  "Pentecostal / Charismatic": "MKJV",
  "Non-denominational Evangelical": "KJV",
  "Messianic Jewish": "JPS",
  "Academic / Non-confessional": "ASV",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ScripturePreferencesDialog({ open, onOpenChange }: Props) {
  const { prefs, save } = useScripturePreferences();
  const [translations, setTranslations] = useState<TranslationMeta[]>([]);
  const [primary, setPrimary] = useState(prefs?.primary_translation ?? SCRIPTURE_DEFAULTS.primary_translation);
  const [secondary, setSecondary] = useState<string>(prefs?.secondary_translation ?? "");
  const [tradition, setTradition] = useState(prefs?.tradition ?? SCRIPTURE_DEFAULTS.tradition);
  const [style, setStyle] = useState(prefs?.prose_style ?? SCRIPTURE_DEFAULTS.prose_style);
  const [readingLevel, setReadingLevel] = useState<number>(prefs?.reading_level ?? SCRIPTURE_DEFAULTS.reading_level);
  const [density, setDensity] = useState(prefs?.citation_density ?? SCRIPTURE_DEFAULTS.citation_density);

  useEffect(() => {
    if (!open) return;
    listTranslations().then(setTranslations).catch(() => setTranslations([]));
  }, [open]);

  useEffect(() => {
    if (prefs) {
      setPrimary(prefs.primary_translation);
      setSecondary(prefs.secondary_translation ?? "");
      setTradition(prefs.tradition);
      setStyle(prefs.prose_style);
      setReadingLevel(prefs.reading_level);
      setDensity(prefs.citation_density);
    }
  }, [prefs]);

  const onTraditionChange = (v: string) => {
    setTradition(v);
    const suggested = TRADITION_SUGGESTED[v];
    if (suggested && translations.some((t) => t.id === suggested)) {
      setPrimary(suggested);
    }
  };

  const handleSave = async () => {
    await save({
      primary_translation: primary,
      secondary_translation: secondary || null,
      tradition,
      prose_style: style,
      reading_level: readingLevel,
      citation_density: density,
    });
    onOpenChange(false);
  };

  const fallbackTranslations: TranslationMeta[] = translations.length
    ? translations
    : [{ id: primary, name: primary, lang: "en", books: [] } as TranslationMeta];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scripture preferences</DialogTitle>
          <DialogDescription>
            How would you like PressRoom to ground answers in Scripture? You can change these any time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Tradition / denomination</Label>
            <Select value={tradition} onValueChange={onTraditionChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TRADITIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Primary translation</Label>
              <Select value={primary} onValueChange={setPrimary}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {fallbackTranslations.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Secondary (optional)</Label>
              <Select value={secondary || "__none"} onValueChange={(v) => setSecondary(v === "__none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="__none">None</SelectItem>
                  {fallbackTranslations.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.id})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Prose style</Label>
            <Select value={style} onValueChange={setStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Reading level: {readingLevel}/5</Label>
            <Slider value={[readingLevel]} min={1} max={5} step={1} onValueChange={(v) => setReadingLevel(v[0])} />
            <p className="text-xs text-muted-foreground">1 = plain language, 5 = scholarly.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Citation density</Label>
            <Select value={density} onValueChange={setDensity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DENSITIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save preferences</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
