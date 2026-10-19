"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Bookmark, CheckCircle2, Clock, ExternalLink, Moon, Sun, Type } from "lucide-react";
import { api } from "@/lib/client/api";
import { useArticleFlags, useArticleStore } from "@/lib/client/articleStore";
import { hostname, readTime, storageGet, storageSet, timeAgo } from "@/lib/client/format";
import { useReaderPrefs } from "@/lib/client/readerPrefs";
import { useToast } from "@/lib/client/toast";
import { READER_THEMES, type ArticleCard, type HighlightColor, type HighlightDTO, type ReaderArticle, type ReaderPrefsDTO } from "@/lib/types";
import { ArticleBody } from "./ArticleBody";
import { HighlightSheet } from "./HighlightSheet";
import { offsetsFromRange, type SelectionOffsets } from "./highlightDom";
import { ReaderSettings } from "./ReaderSettings";
import { SelectionBar } from "./SelectionBar";

const EASE = "cubic-bezier(0.2, 0.8, 0.2, 1)";

type Props = {
  articleId: string;
  preview?: ArticleCard;
  getRect?: () => DOMRect | null;
  closing: boolean;
  initialPrefs: ReaderPrefsDTO | null;
  onRequestClose: () => void;
  onClosed: () => void;
};

const clipFor = (rect: DOMRect, radius = 24) =>
  `inset(${Math.max(rect.top, 0)}px ${Math.max(window.innerWidth - rect.right, 0)}px ${Math.max(window.innerHeight - rect.bottom, 0)}px ${Math.max(rect.left, 0)}px round ${radius}px)`;

const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function Reader({ articleId, preview, getRect, closing, initialPrefs, onRequestClose, onClosed }: Props) {
  const toast = useToast();
  const store = useArticleStore();
  const { prefs, theme, update } = useReaderPrefs(initialPrefs);

  const [article, setArticle] = useState<ReaderArticle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<HighlightDTO[]>([]);
  const [selection, setSelection] = useState<SelectionOffsets | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const lastScroll = useRef(0);
  const callbacks = useRef({ onRequestClose, onClosed, getRect });
  useEffect(() => {
    callbacks.current = { onRequestClose, onClosed, getRect };
  });

  const source = article ?? preview ?? null;
  const flags = useArticleFlags(articleId, { readLater: source?.readLater ?? false, saved: source?.saved ?? false });

  /* ------------------------------- Open / close ------------------------------- */

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || prefersReducedMotion()) return;
    const rect = callbacks.current.getRect?.();
    const animation = rect
      ? el.animate([{ clipPath: clipFor(rect), opacity: 0.5 }, { clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 1 }], { duration: 380, easing: EASE, fill: "backwards" })
      : el.animate([{ opacity: 0, transform: "translateY(28px)" }, { opacity: 1, transform: "none" }], { duration: 280, easing: EASE, fill: "backwards" });
    return () => animation.cancel();
  }, []);

  useEffect(() => {
    if (!closing) return;
    const el = rootRef.current;
    if (!el || prefersReducedMotion()) {
      callbacks.current.onClosed();
      return;
    }
    const rect = callbacks.current.getRect?.();
    const animation = rect
      ? el.animate([{ clipPath: "inset(0px 0px 0px 0px round 0px)", opacity: 1 }, { clipPath: clipFor(rect), opacity: 0.3 }], { duration: 320, easing: EASE, fill: "forwards" })
      : el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(28px)" }], { duration: 220, easing: EASE, fill: "forwards" });
    animation.onfinish = () => callbacks.current.onClosed();
    return () => animation.cancel();
  }, [closing]);

  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previous = meta?.content;
    return () => {
      if (meta && previous) meta.content = previous;
    };
  }, []);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = theme.bg;
  }, [theme.bg]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editingId) setEditingId(null);
      else if (settingsOpen) setSettingsOpen(false);
      else callbacks.current.onRequestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, settingsOpen]);

  /* --------------------------------- Loading --------------------------------- */

  useEffect(() => {
    const controller = new AbortController();
    store.markOpened(articleId);
    api<{ article: ReaderArticle }>(`/api/articles/${articleId}`, { signal: controller.signal })
      .then(({ article: loaded }) => {
        setArticle(loaded);
        setHighlights(loaded.highlights);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message || "Couldn't load this article.");
      });
    return () => controller.abort();
  }, [articleId, store]);

  const hasBody = Boolean(article?.contentHtml);
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!hasBody || !scroller) return;
    const saved = Number(storageGet(`ms:pos:${articleId}`));
    if (saved > 0.02 && saved < 0.97) scroller.scrollTop = saved * (scroller.scrollHeight - scroller.clientHeight);
  }, [hasBody, articleId]);

  /* ------------------------------ Scroll behaviour ------------------------------ */

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const fraction = max > 0 ? el.scrollTop / max : 0;
    setProgress(fraction);
    const delta = el.scrollTop - lastScroll.current;
    if (Math.abs(delta) > 8) {
      setChromeVisible(delta < 0 || el.scrollTop < 80);
      lastScroll.current = el.scrollTop;
    }
    if (hasBody) storageSet(`ms:pos:${articleId}`, fraction.toFixed(3));
  }, [articleId, hasBody]);

  /* -------------------------------- Selection -------------------------------- */

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const sel = window.getSelection();
        const body = bodyRef.current;
        if (!sel || !body || sel.isCollapsed || sel.rangeCount === 0) return setSelection(null);
        const offsets = offsetsFromRange(body, sel.getRangeAt(0));
        setSelection(offsets && offsets.text.length <= 5000 ? offsets : null);
      }, 120);
    };
    document.addEventListener("selectionchange", onChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
    };
  }, []);

  const createHighlight = async (color: HighlightColor, thenEditNote = false) => {
    if (!selection || !article || busy) return;
    setBusy(true);
    try {
      const { highlight } = await api<{ highlight: HighlightDTO }>("/api/highlights", {
        method: "POST",
        body: { articleId: article.id, text: selection.text, color, startOffset: selection.start, endOffset: selection.end },
      });
      setHighlights((list) => [...list, highlight]);
      window.getSelection()?.removeAllRanges();
      setSelection(null);
      if (thenEditNote) setEditingId(highlight.id);
    } catch (e) {
      toast({ message: e instanceof Error ? e.message : "Couldn't save the highlight.", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const saveHighlight = async (id: string, patch: { note: string | null; color: HighlightColor }) => {
    try {
      const { highlight } = await api<{ highlight: HighlightDTO }>(`/api/highlights/${id}`, { method: "PATCH", body: patch });
      setHighlights((list) => list.map((h) => (h.id === id ? highlight : h)));
    } catch {
      toast({ message: "Couldn't save your changes.", tone: "error" });
    }
  };

  const removeHighlight = async (id: string) => {
    try {
      await api(`/api/highlights/${id}`, { method: "DELETE" });
      setHighlights((list) => list.filter((h) => h.id !== id));
    } catch {
      toast({ message: "Couldn't remove the highlight.", tone: "error" });
    }
  };

  const copySelection = async () => {
    if (!selection) return;
    try {
      await navigator.clipboard.writeText(selection.text);
      toast({ message: "Copied to clipboard" });
    } catch {
      toast({ message: "Couldn't copy — press and hold the selection instead.", tone: "error" });
    }
  };

  /* ---------------------------------- Actions --------------------------------- */

  const cycleTheme = () => {
    const index = READER_THEMES.findIndex((t) => t.id === theme.id);
    update({ theme: READER_THEMES[(index + 1) % READER_THEMES.length].id });
  };

  const toggleReadLater = async () => {
    const next = !flags.readLater;
    if (await flags.setReadLater(next)) toast({ message: next ? "Added to Read Later" : "Removed from Read Later" });
  };

  const toggleSaved = async () => {
    const next = !flags.saved;
    if (await flags.setSaved(next)) toast({ message: next ? "Saved to your library" : "Removed from Saved" });
  };

  const editing = highlights.find((h) => h.id === editingId) ?? null;
  const view = source;
  const rootStyle = {
    background: theme.bg,
    color: theme.fg,
    "--r-bg": theme.bg,
    "--r-fg": theme.fg,
    "--r-muted": theme.muted,
    "--r-accent": theme.accent,
    "--r-surface": theme.surface,
    "--r-border": theme.border,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={view?.title ?? "Article"}
      tabIndex={-1}
      data-dark={theme.dark}
      className="reader-root fixed inset-0 z-50 flex flex-col overflow-hidden outline-none"
      style={rootStyle}
    >
      <div className="absolute inset-x-0 top-0 z-20 h-[3px]" aria-hidden>
        <div className="h-full origin-left" style={{ background: theme.accent, transform: `scaleX(${progress})`, transition: "transform 80ms linear" }} />
      </div>

      <header
        className="pt-safe absolute inset-x-0 top-0 z-10 transition-transform duration-300"
        style={{
          transform: chromeVisible ? "none" : "translateY(-110%)",
          background: `color-mix(in srgb, ${theme.bg} 92%, transparent)`,
          borderBottom: `1px solid ${theme.border}`,
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
          <ToolbarButton label="Back to feed" onClick={onRequestClose}>
            <ArrowLeft className="size-5" />
          </ToolbarButton>
          <p className="min-w-0 flex-1 truncate px-2 text-sm font-medium" style={{ color: theme.muted }}>
            {view?.source}
          </p>
          <ToolbarButton label="Appearance: theme, text size, spacing" onClick={() => setSettingsOpen(true)}>
            <Type className="size-5" />
          </ToolbarButton>
          <ToolbarButton label={`Switch theme (current: ${theme.label})`} onClick={cycleTheme}>
            {theme.dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </ToolbarButton>
          <ToolbarButton label={flags.readLater ? "Remove from Read Later" : "Add to Read Later"} pressed={flags.readLater} accent={theme.accent} onClick={() => void toggleReadLater()}>
            {flags.readLater ? <CheckCircle2 className="size-5" /> : <Clock className="size-5" />}
          </ToolbarButton>
          <ToolbarButton label={flags.saved ? "Remove from Saved" : "Save article"} pressed={flags.saved} accent={theme.accent} onClick={() => void toggleSaved()}>
            <Bookmark className={`size-5 ${flags.saved ? "fill-current" : ""}`} />
          </ToolbarButton>
        </div>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth">
        <article
          className="mx-auto w-full max-w-[44rem] px-5 pb-48 pt-24 md:px-8"
          style={{ fontSize: prefs.fontSize, lineHeight: prefs.lineHeight, fontFamily: prefs.fontFamily === "serif" ? "var(--font-serif)" : "var(--font-sans)" }}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a, button") || window.getSelection()?.isCollapsed === false) return;
            setChromeVisible((v) => !v);
          }}
        >
          {view && (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[0.72em]" style={{ color: theme.muted }}>
                <span className="font-semibold" style={{ color: theme.accent }}>
                  {view.topic.emoji} {view.topic.name}
                </span>
                <span>⏱️ {readTime(view.readingMinutes)}</span>
                <span>{timeAgo(view.publishedAt)}</span>
              </div>
              <h1 className="mb-3 text-balance font-sans text-[1.7em] font-extrabold leading-[1.15] tracking-tight" style={{ color: theme.fg }}>
                {view.title}
              </h1>
              <p className="mb-8 font-sans text-[0.78em]" style={{ color: theme.muted }}>
                {view.author ? `By ${view.author} · ` : ""}
                {view.source}
              </p>
            </>
          )}

          {article?.contentHtml ? (
            <ArticleBody html={article.contentHtml} highlights={highlights} bodyRef={bodyRef} onHighlightClick={setEditingId} />
          ) : article ? (
            <div>
              <p className="mb-6">{article.teaser}</p>
              <div className="rounded-2xl border p-4 font-sans text-[0.85em]" style={{ borderColor: theme.border, background: theme.surface }}>
                We couldn&apos;t extract a clean version of this article — the publisher may block readers or require a subscription. You can still read it on the original site.
              </div>
            </div>
          ) : error ? (
            <div className="rounded-2xl border p-4 font-sans text-[0.9em]" style={{ borderColor: theme.border, background: theme.surface }}>
              {error}
            </div>
          ) : (
            <BodySkeleton color={theme.border} teaser={view?.teaser} />
          )}

          {article && (
            <footer className="mt-12 flex flex-col gap-3 border-t pt-8 font-sans text-base" style={{ borderColor: theme.border }}>
              <p className="text-center text-[0.85em]" style={{ color: theme.muted }}>
                {article.contentHtml ? "End of article" : "Continue on the publisher's site"} · {hostname(article.url)}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => void toggleSaved()}
                  className="flex items-center justify-center gap-2 rounded-xl border py-3 font-semibold transition active:scale-[0.98]"
                  style={{ borderColor: flags.saved ? theme.accent : theme.border, color: flags.saved ? theme.accent : theme.fg }}
                >
                  <Bookmark className={`size-4 ${flags.saved ? "fill-current" : ""}`} /> {flags.saved ? "Saved" : "Save"}
                </button>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl py-3 font-semibold transition active:scale-[0.98]"
                  style={{ background: theme.accent, color: theme.dark ? "#000" : "#fff" }}
                >
                  <ExternalLink className="size-4" /> Original
                </a>
              </div>
            </footer>
          )}
        </article>
      </div>

      {selection && !editing && !settingsOpen && (
        <SelectionBar
          theme={theme}
          busy={busy}
          onHighlight={(color) => void createHighlight(color)}
          onNote={() => void createHighlight("yellow", true)}
          onCopy={() => void copySelection()}
          onDismiss={() => {
            window.getSelection()?.removeAllRanges();
            setSelection(null);
          }}
        />
      )}
      {settingsOpen && <ReaderSettings prefs={prefs} theme={theme} onChange={update} onClose={() => setSettingsOpen(false)} />}
      {editing && <HighlightSheet key={editing.id} highlight={editing} theme={theme} onSave={saveHighlight} onDelete={removeHighlight} onClose={() => setEditingId(null)} />}
    </div>
  );
}

function ToolbarButton({ label, onClick, pressed, accent, children }: { label: string; onClick: () => void; pressed?: boolean; accent?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
      className="flex size-10 shrink-0 items-center justify-center rounded-full transition active:scale-90 hover:bg-black/10"
      style={pressed ? { color: accent } : undefined}
    >
      {children}
    </button>
  );
}

function BodySkeleton({ color, teaser }: { color: string; teaser?: string }) {
  return (
    <div aria-busy="true" aria-label="Loading article">
      {teaser && <p className="mb-6 opacity-80">{teaser}</p>}
      <div className="animate-pulse space-y-3">
        {[96, 100, 92, 100, 70, 0, 100, 94, 100, 88, 52].map((w, i) =>
          w === 0 ? <div key={i} className="h-3" /> : <div key={i} className="h-3.5 rounded-full" style={{ width: `${w}%`, background: color }} />,
        )}
      </div>
    </div>
  );
}
