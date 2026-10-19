"use client";

import { Minus, Plus, RotateCcw, X } from "lucide-react";
import { DEFAULT_READER_PREFS, READER_THEMES, type ReaderPrefsDTO, type ReaderTheme } from "@/lib/types";

type Props = { prefs: ReaderPrefsDTO; theme: ReaderTheme; onChange: (patch: Partial<ReaderPrefsDTO>) => void; onClose: () => void };

/** Moon+ Reader Pro–style appearance sheet: theme swatches, font size, line spacing, typeface. */
export function ReaderSettings({ prefs, theme, onChange, onClose }: Props) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Reading appearance">
      <button aria-label="Close appearance settings" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="pb-safe relative w-full max-w-xl animate-fade-up rounded-t-3xl border-t p-5 shadow-2xl"
        style={{ background: theme.surface, borderColor: theme.border, color: theme.fg }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Appearance</h2>
          <div className="flex items-center gap-1">
            <button
              aria-label="Reset to defaults"
              title="Reset to defaults"
              onClick={() => onChange(DEFAULT_READER_PREFS)}
              className="rounded-full p-2 opacity-70 hover:opacity-100"
            >
              <RotateCcw className="size-4" />
            </button>
            <button aria-label="Close" onClick={onClose} className="rounded-full p-2 opacity-70 hover:opacity-100">
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-5 gap-2" role="radiogroup" aria-label="Theme">
          {READER_THEMES.map((t) => {
            const selected = t.id === prefs.theme;
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ theme: t.id })}
                className="flex flex-col items-center gap-1.5 rounded-2xl p-1.5 transition active:scale-95"
              >
                <span
                  className="flex size-12 items-center justify-center rounded-full text-base font-semibold"
                  style={{ background: t.bg, color: t.fg, boxShadow: selected ? `0 0 0 2.5px ${theme.accent}` : `0 0 0 1px ${theme.border}` }}
                >
                  Aa
                </span>
                <span className="text-[11px] leading-tight" style={{ opacity: selected ? 1 : 0.65 }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <Row label="Text size" value={`${prefs.fontSize}px`}>
          <Step label="Smaller text" onClick={() => onChange({ fontSize: Math.max(14, prefs.fontSize - 1) })}>
            <Minus className="size-4" />
          </Step>
          <input
            type="range"
            className="ms-range min-w-0 flex-1"
            min={14}
            max={30}
            step={1}
            value={prefs.fontSize}
            aria-label="Text size"
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          />
          <Step label="Larger text" onClick={() => onChange({ fontSize: Math.min(30, prefs.fontSize + 1) })}>
            <Plus className="size-4" />
          </Step>
        </Row>

        <Row label="Line spacing" value={prefs.lineHeight.toFixed(1)}>
          <Step label="Tighter line spacing" onClick={() => onChange({ lineHeight: Math.max(1.3, Math.round((prefs.lineHeight - 0.1) * 10) / 10) })}>
            <Minus className="size-4" />
          </Step>
          <input
            type="range"
            className="ms-range min-w-0 flex-1"
            min={1.3}
            max={2.4}
            step={0.1}
            value={prefs.lineHeight}
            aria-label="Line spacing"
            onChange={(e) => onChange({ lineHeight: Number(e.target.value) })}
          />
          <Step label="Looser line spacing" onClick={() => onChange({ lineHeight: Math.min(2.4, Math.round((prefs.lineHeight + 0.1) * 10) / 10) })}>
            <Plus className="size-4" />
          </Step>
        </Row>

        <div className="mt-1 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Typeface">
          {(["serif", "sans"] as const).map((family) => {
            const selected = prefs.fontFamily === family;
            return (
              <button
                key={family}
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ fontFamily: family })}
                className="rounded-xl border py-2.5 text-base transition"
                style={{
                  fontFamily: family === "serif" ? "var(--font-serif)" : "var(--font-sans)",
                  borderColor: selected ? theme.accent : theme.border,
                  background: selected ? `color-mix(in srgb, ${theme.accent} 14%, transparent)` : "transparent",
                }}
              >
                {family === "serif" ? "Serif" : "Sans-serif"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums opacity-60">{value}</span>
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function Step({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} onClick={onClick} className="flex size-9 shrink-0 items-center justify-center rounded-full border opacity-80 transition hover:opacity-100 active:scale-90" style={{ borderColor: "currentColor" }}>
      {children}
    </button>
  );
}
