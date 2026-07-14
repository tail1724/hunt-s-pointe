import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, Type, Crop, SlidersHorizontal, Square as FrameIcon, Download, Check,
  Plus, Trash2, RotateCw, FlipHorizontal2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import {
  render, exportBlob, outputSize, ASPECTS, FONTS, TEXT_COLORS, TUNE_PRESETS,
  DEFAULT_STATE, type EditorState, type TextLayer, type FontKey,
} from "./editor-engine";
import "@/styles/photo-editor.css";

type Tool = "text" | "crop" | "tune" | "frame";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  /** Seed a verse text layer when opening (e.g. from the Featured text field). */
  initialText?: string;
  /** Persist the flattened result; receives a PNG blob. */
  onSave?: (blob: Blob) => Promise<void>;
}

let uid = 0;
const nextId = () => `t${++uid}`;

export function PhotoEditor({ open, onOpenChange, imageUrl, initialText, onSave }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [state, setState] = useState<EditorState>(DEFAULT_STATE);
  const [tool, setTool] = useState<Tool>("text");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  // Load the image (CORS-enabled so we can export the canvas).
  useEffect(() => {
    if (!open) return;
    setImg(null);
    setLoadError(false);
    setState(DEFAULT_STATE);
    setSelectedId(null);
    setTool("text");
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      setImg(image);
      if (initialText) {
        const layer: TextLayer = {
          id: nextId(), text: initialText, xN: 0.5, yN: 0.8, sizeN: 0.06,
          font: "verse", color: TEXT_COLORS[0], scrim: true,
        };
        setState((s) => ({ ...s, layers: [layer] }));
        setSelectedId(layer.id);
      }
    };
    image.onerror = () => setLoadError(true);
    image.src = imageUrl;
  }, [open, imageUrl, initialText]);

  // Display size that fits the preview box while honoring the output aspect.
  const display = useMemo(() => {
    if (!img) return { w: 0, h: 0 };
    const targetH = 900;
    const { w, h } = outputSize(img, state, targetH);
    return { w, h };
  }, [img, state]);

  // Re-render the preview canvas whenever the composite changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const { w, h } = outputSize(img, state, 900);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) render(ctx, img, img.naturalWidth, img.naturalHeight, state, w, h);
  }, [img, state]);

  const selected = state.layers.find((l) => l.id === selectedId) ?? null;

  const updateLayer = useCallback((id: string, patch: Partial<TextLayer>) => {
    setState((s) => ({ ...s, layers: s.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) }));
  }, []);

  const addText = () => {
    const layer: TextLayer = {
      id: nextId(), text: "New text", xN: 0.5, yN: 0.5, sizeN: 0.06,
      font: "verse", color: TEXT_COLORS[0], scrim: true,
    };
    setState((s) => ({ ...s, layers: [...s.layers, layer] }));
    setSelectedId(layer.id);
    setTool("text");
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setState((s) => ({ ...s, layers: s.layers.filter((l) => l.id !== selectedId) }));
    setSelectedId(null);
  };

  // Pointer → normalized canvas coords, accounting for display scaling.
  const toNorm = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const r = canvas.getBoundingClientRect();
    return { xN: (clientX - r.left) / r.width, yN: (clientY - r.top) / r.height };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!img || state.layers.length === 0) return;
    const { xN, yN } = toNorm(e.clientX, e.clientY);
    // Select the nearest text layer center, then start dragging it.
    let best: { id: string; d: number } | null = null;
    for (const l of state.layers) {
      const d = Math.hypot(l.xN - xN, l.yN - yN);
      if (!best || d < best.d) best = { id: l.id, d };
    }
    if (best && best.d < 0.25) {
      const layer = state.layers.find((l) => l.id === best!.id)!;
      setSelectedId(layer.id);
      setTool("text");
      dragRef.current = { id: layer.id, dx: layer.xN - xN, dy: layer.yN - yN };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { xN, yN } = toNorm(e.clientX, e.clientY);
    updateLayer(drag.id, {
      xN: Math.min(1, Math.max(0, xN + drag.dx)),
      yN: Math.min(1, Math.max(0, yN + drag.dy)),
    });
  };

  const onPointerUp = () => { dragRef.current = null; };

  const handleDownload = async () => {
    if (!img) return;
    const blob = await exportBlob(img, state);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ezra-image.png";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!img || !onSave) return;
    setSaving(true);
    try {
      const blob = await exportBlob(img, state);
      await onSave(blob);
      haptics.turnComplete();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="photo-editor" role="dialog" aria-modal="true" aria-label="Photo editor">
      <header className="photo-editor__bar">
        <button type="button" className="photo-editor__icon" aria-label="Close editor" onClick={() => onOpenChange(false)}>
          <X className="h-5 w-5" />
        </button>
        <span className="photo-editor__title">Edit image</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="photo-editor__ghost" onClick={handleDownload} disabled={!img}>
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Download</span>
          </button>
          {onSave && (
            <button type="button" className="photo-editor__save" onClick={handleSave} disabled={!img || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              <span className="hidden sm:inline">Save</span>
            </button>
          )}
        </div>
      </header>

      <div className="photo-editor__stage" ref={wrapRef}>
        {loadError ? (
          <p className="text-sm text-white/70">Couldn't load this image for editing.</p>
        ) : !img ? (
          <Loader2 className="h-6 w-6 animate-spin text-white/70" />
        ) : (
          <canvas
            ref={canvasRef}
            className="photo-editor__canvas"
            style={{ aspectRatio: `${display.w} / ${display.h}` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        )}
      </div>

      <div className="photo-editor__panel">
        {tool === "text" && (
          <TextPanel
            selected={selected}
            onAdd={addText}
            onRemove={removeSelected}
            onChange={(patch) => selected && updateLayer(selected.id, patch)}
          />
        )}
        {tool === "crop" && (
          <CropPanel state={state} setState={setState} />
        )}
        {tool === "tune" && (
          <TunePanel state={state} setState={setState} />
        )}
        {tool === "frame" && (
          <FramePanel state={state} setState={setState} />
        )}
      </div>

      <nav className="photo-editor__rail" aria-label="Editor tools">
        <ToolBtn icon={Type} label="Text" active={tool === "text"} onClick={() => setTool("text")} />
        <ToolBtn icon={Crop} label="Crop" active={tool === "crop"} onClick={() => setTool("crop")} />
        <ToolBtn icon={SlidersHorizontal} label="Tune" active={tool === "tune"} onClick={() => setTool("tune")} />
        <ToolBtn icon={FrameIcon} label="Frame" active={tool === "frame"} onClick={() => setTool("frame")} />
      </nav>
    </div>,
    document.body,
  );
}

function ToolBtn({ icon: Icon, label, active, onClick }: { icon: typeof Type; label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={cn("photo-editor__tool", active && "photo-editor__tool--active")} onClick={onClick} aria-pressed={active}>
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </button>
  );
}

function TextPanel({ selected, onAdd, onRemove, onChange }: {
  selected: TextLayer | null;
  onAdd: () => void;
  onRemove: () => void;
  onChange: (patch: Partial<TextLayer>) => void;
}) {
  if (!selected) {
    return (
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/70">Add a verse or reference over your image — crisp, editable, always legible.</p>
        <button type="button" className="photo-editor__save shrink-0" onClick={onAdd}><Plus className="h-4 w-4" /> Add text</button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <textarea
        value={selected.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={2}
        className="w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
        placeholder="Type your text…"
        aria-label="Text content"
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {(Object.keys(FONTS) as FontKey[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onChange({ font: f })}
              className={cn("rounded-md px-2.5 py-1 text-xs", selected.font === f ? "bg-white text-black" : "bg-white/10 text-white/80")}
            >
              {FONTS[f].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ color: c })}
              aria-label={`Color ${c}`}
              className={cn("h-6 w-6 rounded-full border", selected.color === c ? "border-white" : "border-white/25")}
              style={{ background: c }}
            />
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-white/80">
          <input type="checkbox" checked={selected.scrim} onChange={(e) => onChange({ scrim: e.target.checked })} />
          Legibility scrim
        </label>
        <button type="button" onClick={onRemove} className="ml-auto inline-flex items-center gap-1 text-xs text-red-300/90 hover:text-red-300">
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
      <div>
        <div className="mb-1 text-[11px] text-white/60">Size</div>
        <input
          type="range" min={2} max={16} step={0.5}
          value={selected.sizeN * 100}
          onChange={(e) => onChange({ sizeN: Number(e.target.value) / 100 })}
          className="w-full accent-white"
          aria-label="Text size"
        />
      </div>
    </div>
  );
}

function CropPanel({ state, setState }: { state: EditorState; setState: React.Dispatch<React.SetStateAction<EditorState>> }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {ASPECTS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setState((s) => ({ ...s, crop: a.key }))}
            className={cn("rounded-lg px-3 py-1.5 text-xs", state.crop === a.key ? "bg-white text-black" : "bg-white/10 text-white/80")}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setState((s) => ({ ...s, rotation: (s.rotation + 90) % 360 }))} className="photo-editor__ghost">
          <RotateCw className="h-4 w-4" /> Rotate
        </button>
        <button type="button" onClick={() => setState((s) => ({ ...s, flipH: !s.flipH }))} className={cn("photo-editor__ghost", state.flipH && "!text-white")}>
          <FlipHorizontal2 className="h-4 w-4" /> Flip
        </button>
      </div>
    </div>
  );
}

function TunePanel({ state, setState }: { state: EditorState; setState: React.Dispatch<React.SetStateAction<EditorState>> }) {
  const set = (patch: Partial<EditorState["tune"]>) => setState((s) => ({ ...s, tune: { ...s.tune, ...patch } }));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {TUNE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => setState((s) => ({ ...s, tune: p.tune }))}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs",
              JSON.stringify(state.tune) === JSON.stringify(p.tune) ? "bg-white text-black" : "bg-white/10 text-white/80",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <Range label="Light" min={-100} max={100} value={state.tune.light} onChange={(v) => set({ light: v })} />
      <Range label="Warmth" min={-100} max={100} value={state.tune.warmth} onChange={(v) => set({ warmth: v })} />
      <Range label="Fade" min={0} max={100} value={state.tune.fade} onChange={(v) => set({ fade: v })} />
    </div>
  );
}

function FramePanel({ state, setState }: { state: EditorState; setState: React.Dispatch<React.SetStateAction<EditorState>> }) {
  const set = (patch: Partial<EditorState["frame"]>) => setState((s) => ({ ...s, frame: { ...s.frame, ...patch } }));
  return (
    <div className="space-y-3">
      <Range label="Border" min={0} max={8} value={state.frame.border * 100} onChange={(v) => set({ border: v / 100 })} />
      <div className="flex items-center gap-2">
        {["#F4EFE3", "#16222D", "#C79A4B"].map((c) => (
          <button key={c} type="button" onClick={() => set({ color: c })}
            className={cn("h-6 w-6 rounded-full border", state.frame.color === c ? "border-white" : "border-white/25")} style={{ background: c }} aria-label={`Frame ${c}`} />
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-white/80">
          <input type="checkbox" checked={state.frame.cornerMark} onChange={(e) => set({ cornerMark: e.target.checked })} />
          Ezra Research mark
        </label>
      </div>
    </div>
  );
}

function Range({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] text-white/60">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value)}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-white" aria-label={label} />
    </div>
  );
}
