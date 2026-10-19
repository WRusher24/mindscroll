"use client";

import { memo, useEffect, useLayoutEffect, useRef } from "react";
import type { HighlightDTO } from "@/lib/types";
import { applyHighlights } from "./highlightDom";

type Props = {
  html: string;
  highlights: HighlightDTO[];
  onHighlightClick: (id: string) => void;
  bodyRef: React.RefObject<HTMLDivElement | null>;
};

/**
 * Renders sanitized article HTML imperatively. React never re-renders the inner DOM, so highlight
 * <mark> wrappers (added via DOM APIs) survive state changes elsewhere in the reader.
 */
export const ArticleBody = memo(function ArticleBody({ html, highlights, onHighlightClick, bodyRef }: Props) {
  const ready = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.innerHTML = html;
    ready.current = html;
  }, [html, bodyRef]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el && ready.current === html) applyHighlights(el, highlights);
  }, [html, highlights, bodyRef]);

  return (
    <div
      ref={bodyRef}
      className="reader-body"
      onClick={(e) => {
        const mark = (e.target as HTMLElement).closest<HTMLElement>("mark.ms-hl");
        if (mark?.dataset.hid && window.getSelection()?.isCollapsed !== false) {
          e.stopPropagation();
          onHighlightClick(mark.dataset.hid);
        }
      }}
    />
  );
});
