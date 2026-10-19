"use client";

import { Copy, MessageSquarePlus, X } from "lucide-react";
import { HIGHLIGHT_SWATCHES, type HighlightColor, type ReaderTheme } from "@/lib/types";

type Props = {
  theme: ReaderTheme;
  busy: boolean;
  onHighlight: (color: HighlightColor) => void;
  onNote: () => void;
  onCopy: () => void;
  onDismiss: () => void;
};

/**
 * Docked action bar shown while text is selected. Buttons cancel `pointerdown` so tapping them never
 * collapses the selection before the handler runs (a common mobile-browser pitfall).
 */
export function SelectionBar({ theme, busy, onHighlight, onNote, onCopy, onDismiss }: Props) {
  const keep = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div
        role="toolbar"
        aria-label="Selection actions"
        onPointerDown={keep}
        onMouseDown={keep}
        className="pointer-events-auto flex animate-fade-up items-center gap-1 rounded-full border px-2 py-1.5 shadow-2xl backdrop-blur"
        style={{ background: `color-mix(in srgb, ${theme.surface} 94%, transparent)`, borderColor: theme.border, color: theme.fg }}
      >
        {(Object.keys(HIGHLIGHT_SWATCHES) as HighlightColor[]).map((color) => (
          <button
            key={color}
            disabled={busy}
            aria-label={`Highlight ${color}`}
            title={`Highlight ${color}`}
            onClick={() => onHighlight(color)}
            className="flex size-10 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-50"
          >
            <span className="size-6 rounded-full ring-2 ring-black/10" style={{ background: HIGHLIGHT_SWATCHES[color].dot }} />
          </button>
        ))}
        <span className="mx-1 h-6 w-px opacity-20" style={{ background: "currentColor" }} />
        <button disabled={busy} onClick={onNote} aria-label="Highlight and add note" title="Add note" className="flex size-10 items-center justify-center rounded-full transition hover:opacity-100 active:scale-90 disabled:opacity-50">
          <MessageSquarePlus className="size-5" />
        </button>
        <button onClick={onCopy} aria-label="Copy text" title="Copy" className="flex size-10 items-center justify-center rounded-full transition active:scale-90">
          <Copy className="size-[18px]" />
        </button>
        <button onClick={onDismiss} aria-label="Dismiss" title="Dismiss" className="flex size-10 items-center justify-center rounded-full opacity-70 transition active:scale-90">
          <X className="size-5" />
        </button>
      </div>
    </div>
  );
}
