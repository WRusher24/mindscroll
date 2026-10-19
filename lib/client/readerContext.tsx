"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Reader } from "@/components/reader/Reader";
import type { ArticleCard, ReaderPrefsDTO } from "@/lib/types";

export type OpenOptions = {
  preview?: ArticleCard;
  /** Returns the on-screen rect of the card to expand from / collapse back to. */
  getRect?: () => DOMRect | null;
  /** When false the reader does not touch browser history (used by the /read/[id] route). */
  pushHistory?: boolean;
  onClosed?: () => void;
};

type ReaderState = { id: string; options: OpenOptions; closing: boolean };
type ReaderApi = { open: (id: string, options?: OpenOptions) => void; close: () => void; isOpen: boolean };

const ReaderContext = createContext<ReaderApi | null>(null);
export const useReader = () => {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error("useReader must be used inside <ReaderProvider>");
  return ctx;
};

export function ReaderProvider({ initialPrefs, children }: { initialPrefs: ReaderPrefsDTO | null; children: React.ReactNode }) {
  const [state, setState] = useState<ReaderState | null>(null);
  const stateRef = useRef<ReaderState | null>(null);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const open = useCallback((id: string, options: OpenOptions = {}) => {
    if (stateRef.current) return;
    if (options.pushHistory !== false) window.history.pushState({ msReader: id }, "");
    setState({ id, options, closing: false });
  }, []);

  const close = useCallback(() => {
    const current = stateRef.current;
    if (!current || current.closing) return;
    if (current.options.pushHistory !== false && window.history.state?.msReader) window.history.back();
    else setState({ ...current, closing: true });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setState((s) => (s && !s.closing ? { ...s, closing: true } : s));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const finishClose = useCallback(() => {
    const options = stateRef.current?.options;
    setState(null);
    options?.onClosed?.();
  }, []);

  const api = useMemo(() => ({ open, close, isOpen: state !== null }), [open, close, state]);

  return (
    <ReaderContext.Provider value={api}>
      {/* While the reader is open the page behind it must not be focusable or announced. */}
      <div className="contents" inert={state !== null}>
        {children}
      </div>
      {state && (
        <Reader
          key={state.id}
          articleId={state.id}
          preview={state.options.preview}
          getRect={state.options.getRect}
          closing={state.closing}
          initialPrefs={initialPrefs}
          onRequestClose={close}
          onClosed={finishClose}
        />
      )}
    </ReaderContext.Provider>
  );
}
