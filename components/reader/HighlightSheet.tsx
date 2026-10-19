"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import { HIGHLIGHT_SWATCHES, type HighlightColor, type HighlightDTO, type ReaderTheme } from "@/lib/types";

type Props = {
  highlight: HighlightDTO;
  theme: ReaderTheme;
  onSave: (id: string, patch: { note: string | null; color: HighlightColor }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
};

/** Edit a highlight's note and colour, or remove it. */
export function HighlightSheet({ highlight, theme, onSave, onDelete, onClose }: Props) {
  const [note, setNote] = useState(highlight.note ?? "");
  const [color, setColor] = useState<HighlightColor>(highlight.color);
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    area.current?.focus({ preventScroll: true });
  }, []);

  const dirty = note.trim() !== (highlight.note ?? "") || color !== highlight.color;

  const done = async () => {
    if (!dirty) return onClose();
    setBusy(true);
    await onSave(highlight.id, { note: note.trim() || null, color });
    setBusy(false);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Highlight">
      <button aria-label="Close" className="absolute inset-0 bg-black/50" onClick={() => void done()} />
      <div className="pb-safe relative w-full max-w-xl animate-fade-up rounded-t-3xl border-t p-5 shadow-2xl" style={{ background: theme.surface, borderColor: theme.border, color: theme.fg }}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <blockquote className="line-clamp-4 border-l-4 pl-3 text-[15px] italic leading-snug" style={{ borderColor: HIGHLIGHT_SWATCHES[color].dot }}>
            {highlight.text}
          </blockquote>
          <button aria-label="Close" onClick={() => void done()} className="shrink-0 rounded-full p-1.5 opacity-70 hover:opacity-100">
            <X className="size-5" />
          </button>
        </div>

        <label className="block">
          <span className="sr-only">Note</span>
          <textarea
            ref={area}
            value={note}
            maxLength={5000}
            rows={4}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note… why does this matter?"
            className="w-full resize-none rounded-xl border bg-transparent p-3 text-base leading-snug outline-none focus:ring-2"
            style={{ borderColor: theme.border, ["--tw-ring-color" as string]: theme.accent }}
          />
        </label>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1" role="radiogroup" aria-label="Highlight colour">
            {(Object.keys(HIGHLIGHT_SWATCHES) as HighlightColor[]).map((c) => (
              <button key={c} role="radio" aria-checked={c === color} aria-label={c} onClick={() => setColor(c)} className="flex size-10 items-center justify-center rounded-full">
                <span className="size-6 rounded-full transition" style={{ background: HIGHLIGHT_SWATCHES[c].dot, boxShadow: c === color ? `0 0 0 2px ${theme.surface}, 0 0 0 4px ${theme.accent}` : "none" }} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onDelete(highlight.id);
                setBusy(false);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50"
            >
              <Trash2 className="size-4" /> Remove
            </button>
            <button disabled={busy} onClick={() => void done()} className="rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50" style={{ background: theme.accent, color: theme.dark ? "#000" : "#fff" }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
