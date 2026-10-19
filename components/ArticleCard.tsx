"use client";

import { useRef, useState } from "react";
import { Bookmark, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { useArticleFlags } from "@/lib/client/articleStore";
import { readTime, timeAgo } from "@/lib/client/format";
import type { ArticleCard as Card } from "@/lib/types";

const SWIPE_THRESHOLD = 96;

type Props = {
  item: Card;
  index: number;
  isFirst: boolean;
  showSwipeHint: boolean;
  onOpen: (item: Card) => void;
  onReadLater: (item: Card) => Promise<void>;
};

/** One full-height, TikTok-style feed card. Tap = read, swipe left = Read Later. */
export function ArticleCard({ item, index, isFirst, showSwipeHint, onOpen, onReadLater }: Props) {
  const flags = useArticleFlags(item.id, { readLater: item.readLater, saved: item.saved });
  const [imageOk, setImageOk] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startY: 0, dx: 0, moved: false, pointerId: -1 });

  const setOffset = (x: number, animate: boolean) => {
    const el = contentRef.current;
    const reveal = revealRef.current;
    if (!el || !reveal) return;
    el.style.transition = animate ? "transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 220ms" : "none";
    el.style.transform = x ? `translate3d(${x}px,0,0)` : "";
    reveal.style.opacity = String(Math.min(1, Math.abs(x) / SWIPE_THRESHOLD));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, dx: 0, moved: false, pointerId: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        d.active = false; // vertical scroll gesture: let the snap scroller handle it
        return;
      }
      if (Math.abs(dx) < 8) return;
      d.moved = true;
      contentRef.current?.setPointerCapture(d.pointerId);
    }
    // Only left swipes are meaningful; right drags rubber-band.
    d.dx = dx < 0 ? dx : dx * 0.15;
    setOffset(d.dx, false);
  };

  const finishDrag = async (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    if (contentRef.current?.hasPointerCapture(e.pointerId)) contentRef.current.releasePointerCapture(e.pointerId);
    if (!d.moved) return;
    if (d.dx <= -SWIPE_THRESHOLD) {
      setOffset(-window.innerWidth * 0.6, true);
      if (contentRef.current) contentRef.current.style.opacity = "0";
      await onReadLater(item);
      window.setTimeout(() => {
        if (contentRef.current) contentRef.current.style.opacity = "";
        setOffset(0, true);
      }, 260);
    } else {
      setOffset(0, true);
    }
    // Swallow the click that follows a drag gesture.
    window.setTimeout(() => (drag.current.moved = false), 0);
  };

  return (
    <section
      data-card-id={item.id}
      data-index={index}
      className="feed-card relative h-full w-full overflow-hidden"
      style={{ backgroundImage: `radial-gradient(120% 55% at 50% 0%, ${item.topic.accent}2e, transparent 62%), linear-gradient(180deg, #0d0d12 0%, #09090b 100%)` }}
    >
      <div ref={revealRef} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-end bg-linear-to-l from-indigo-600/50 to-transparent pr-8 opacity-0">
        <div className="flex flex-col items-center gap-2 text-white">
          <Clock className="size-9" />
          <span className="text-sm font-semibold">Read Later</span>
        </div>
      </div>

      <div
        ref={contentRef}
        role="article"
        aria-label={item.title}
        className="relative mx-auto flex h-full w-full max-w-[640px] cursor-pointer select-none flex-col px-6 pb-5 pt-[4.5rem] [touch-action:pan-y] md:px-10 md:pt-24"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClick={(e) => {
          if (drag.current.moved || (e.target as HTMLElement).closest("button, a")) return;
          onOpen(item);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target === e.currentTarget) onOpen(item);
        }}
        tabIndex={0}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold" style={{ backgroundColor: `${item.topic.accent}26`, color: item.topic.accent }}>
            <span aria-hidden>{item.topic.emoji}</span>
            {item.topic.name}
          </span>
          <span className="text-zinc-400">
            {item.source} · {timeAgo(item.publishedAt)}
          </span>
        </div>

        <div className="flex min-h-0 flex-1 flex-col justify-center gap-5 py-4">
          {item.imageUrl && imageOk && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              loading={index < 2 ? "eager" : "lazy"}
              decoding="async"
              referrerPolicy="no-referrer"
              draggable={false}
              onError={() => setImageOk(false)}
              className="aspect-video max-h-[26dvh] w-full rounded-2xl object-cover shadow-lg ring-1 ring-white/10"
            />
          )}
          <h2 className="text-balance text-[1.75rem] font-extrabold leading-[1.12] tracking-tight text-white line-clamp-5 sm:text-4xl">{item.title}</h2>
          <p className="text-[1.05rem] leading-relaxed text-zinc-300 line-clamp-6 sm:text-lg">{item.teaser}</p>
          {item.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label="Tags">
              {item.tags.map((tag) => (
                <li key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                  #{tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {isFirst && showSwipeHint && (
          <p className="mb-3 animate-pulse text-center text-xs text-zinc-500">← Swipe left to read later · tap to read · scroll for more ↓</p>
        )}

        <footer className="flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-sm text-zinc-400">⏱️ {readTime(item.readingMinutes)}</span>
          <div className="flex items-center gap-1">
            <IconButton
              label={flags.readLater ? "Remove from Read Later" : "Add to Read Later"}
              active={flags.readLater}
              onClick={() => (flags.readLater ? flags.setReadLater(false) : onReadLater(item))}
            >
              {flags.readLater ? <CheckCircle2 className="size-[22px]" /> : <Clock className="size-[22px]" />}
            </IconButton>
            <IconButton label={flags.saved ? "Remove from Saved" : "Save article"} active={flags.saved} onClick={() => flags.setSaved(!flags.saved)}>
              <Bookmark className={`size-[22px] ${flags.saved ? "fill-current" : ""}`} />
            </IconButton>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open original article"
              className="flex size-11 items-center justify-center rounded-full text-zinc-400 transition hover:bg-white/10 hover:text-white active:scale-90"
            >
              <ExternalLink className="size-[22px]" />
            </a>
          </div>
        </footer>
      </div>
    </section>
  );
}

function IconButton({ label, active, onClick, children }: { label: string; active: boolean; onClick: () => unknown; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      onClick={() => void onClick()}
      className={`flex size-11 items-center justify-center rounded-full transition active:scale-90 ${active ? "bg-indigo-500/20 text-indigo-300" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}
    >
      {children}
    </button>
  );
}
