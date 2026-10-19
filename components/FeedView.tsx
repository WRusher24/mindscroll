"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Compass, Inbox, Loader2, PartyPopper, RefreshCw } from "lucide-react";
import { api } from "@/lib/client/api";
import { useArticleStore } from "@/lib/client/articleStore";
import { useFirstRunHint } from "@/lib/client/hint";
import { useReader } from "@/lib/client/readerContext";
import { useToast } from "@/lib/client/toast";
import type { ArticleCard as Card, TopicChip } from "@/lib/types";
import { ArticleCard } from "./ArticleCard";

const PAGE_SIZE = 10;
const PREFETCH_AHEAD = 4;
const SEEN_FLUSH_MS = 1200;
const HINT_KEY = "ms:hint-swipe-v1";

type Props = { initialItems: Card[]; topics: TopicChip[]; activeTopic: string | null };

export function FeedView({ initialItems, topics, activeTopic }: Props) {
  const router = useRouter();
  const toast = useToast();
  const reader = useReader();
  const store = useArticleStore();

  const [items, setItems] = useState<Card[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [exhausted, setExhausted] = useState(initialItems.length < PAGE_SIZE);
  const [loadError, setLoadError] = useState(false);
  const [active, setActive] = useState(0);
  const [showHint, dismissHint] = useFirstRunHint(HINT_KEY);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  const loadingRef = useRef(false);
  const queuedSeen = useRef(new Set<string>()); // ids waiting to be sent
  const sentSeen = useRef(new Set<string>()); // ids the server has acknowledged
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<(keepalive?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  /* ---------------------- "Scrolled past = never again" --------------------- */

  const flushSeen = useCallback(async (keepalive = false) => {
    if (flushTimer.current) clearTimeout(flushTimer.current);
    flushTimer.current = null;
    const ids = [...queuedSeen.current].slice(0, 100);
    if (!ids.length) return;
    ids.forEach((id) => queuedSeen.current.delete(id));
    try {
      await api("/api/feed/seen", { method: "POST", body: { ids }, keepalive });
      ids.forEach((id) => sentSeen.current.add(id));
    } catch {
      ids.forEach((id) => queuedSeen.current.add(id)); // retry on the next flush
    }
    if (queuedSeen.current.size) flushTimer.current = setTimeout(() => void flushRef.current(), SEEN_FLUSH_MS * 3);
  }, []);

  useEffect(() => {
    flushRef.current = flushSeen;
  }, [flushSeen]);

  const queueSeen = useCallback(
    (ids: string[]) => {
      let added = false;
      for (const id of ids) {
        if (!sentSeen.current.has(id) && !queuedSeen.current.has(id)) {
          queuedSeen.current.add(id);
          added = true;
        }
      }
      if (added && !flushTimer.current) flushTimer.current = setTimeout(() => void flushSeen(), SEEN_FLUSH_MS);
    },
    [flushSeen],
  );

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushSeen(true);
    };
    const onPageHide = () => void flushSeen(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      void flushSeen(true);
    };
  }, [flushSeen]);

  /* ------------------------------ Infinite loading ------------------------------ */

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError(false);
    try {
      const exclude = itemsRef.current.filter((i) => !sentSeen.current.has(i.id)).map((i) => i.id).slice(-300);
      const { items: next } = await api<{ items: Card[] }>("/api/feed", { method: "POST", body: { topic: activeTopic, exclude, limit: PAGE_SIZE } });
      setItems((current) => {
        const known = new Set(current.map((i) => i.id));
        return [...current, ...next.filter((i) => !known.has(i.id))];
      });
      if (next.length < PAGE_SIZE) setExhausted(true);
    } catch {
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [activeTopic]);

  /* --------------------------- Active card tracking --------------------------- */

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.index));
        }
      },
      { root: scroller, threshold: 0.6 },
    );
    scroller.querySelectorAll("[data-index]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items.length, exhausted]);

  useEffect(() => {
    // Everything before the active card has been scrolled past (even if a fast fling skipped its "active" moment).
    queueSeen(itemsRef.current.slice(0, active).map((i) => i.id));
    if (active > 0 && showHint) dismissHint();
    if (!exhausted && !loadError && active >= itemsRef.current.length - PREFETCH_AHEAD) void loadMore();
  }, [active, dismissHint, exhausted, loadError, loadMore, queueSeen, showHint]);

  /* --------------------------------- Actions --------------------------------- */

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollerRef.current?.querySelector(`[data-index="${index}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const openReader = useCallback(
    (item: Card) => {
      queueSeen([item.id]);
      reader.open(item.id, {
        preview: item,
        getRect: () => (scrollerRef.current?.querySelector(`[data-card-id="${item.id}"]`) as HTMLElement | null)?.getBoundingClientRect() ?? null,
      });
    },
    [queueSeen, reader],
  );

  const addToReadLater = useCallback(
    async (item: Card) => {
      const current = store.flagsFor(item.id, { readLater: item.readLater, saved: item.saved });
      queueSeen([item.id]);
      if (current.readLater) {
        toast({ message: "Already in Read Later" });
        return;
      }
      const ok = await store.update(item.id, current, { readLater: true });
      if (!ok) return;
      toast({
        message: "Added to Read Later",
        actionLabel: "Undo",
        onAction: () => void store.update(item.id, { ...current, readLater: true }, { readLater: false }),
      });
      const index = itemsRef.current.findIndex((i) => i.id === item.id);
      window.setTimeout(() => scrollToIndex(index + 1), 320);
    },
    [queueSeen, scrollToIndex, store, toast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (reader.isOpen || e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      const current = itemsRef.current[active];
      switch (e.key) {
        case "ArrowDown":
        case "j":
          e.preventDefault();
          scrollToIndex(Math.min(active + 1, itemsRef.current.length));
          break;
        case "ArrowUp":
        case "k":
          e.preventDefault();
          scrollToIndex(Math.max(active - 1, 0));
          break;
        case "Enter":
        case "o":
          if (current && target.tagName !== "A" && target.tagName !== "BUTTON") openReader(current);
          break;
        case "l":
          if (current) void addToReadLater(current);
          break;
        case "s":
          if (current) {
            const flags = store.flagsFor(current.id, { readLater: current.readLater, saved: current.saved });
            void store.update(current.id, flags, { saved: !flags.saved });
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, addToReadLater, openReader, reader.isOpen, scrollToIndex, store]);

  const selectTopic = async (id: string | null) => {
    if (id === activeTopic) return;
    await flushSeen();
    router.replace(id ? `/feed?topic=${encodeURIComponent(id)}` : "/feed");
  };

  /* ---------------------------------- View ---------------------------------- */

  const noTopics = topics.length === 0;

  return (
    <div className="relative h-full">
      {!noTopics && (
        <div className="pt-safe pointer-events-none absolute inset-x-0 top-0 z-20 bg-linear-to-b from-zinc-950/90 via-zinc-950/60 to-transparent pb-6">
          <div className="pointer-events-auto mx-auto flex max-w-[720px] gap-2 overflow-x-auto px-4 pb-1 pt-3 no-scrollbar" role="tablist" aria-label="Filter by topic">
            <Chip selected={activeTopic === null} onClick={() => void selectTopic(null)}>
              ✨ For you
            </Chip>
            {topics.map((t) => (
              <Chip key={t.id} selected={activeTopic === t.id} onClick={() => void selectTopic(t.id)}>
                {t.emoji} {t.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollerRef} className="feed-scroller h-full overflow-y-auto no-scrollbar" tabIndex={-1}>
        {noTopics ? (
          <EmptyState icon={<Compass className="size-10 text-indigo-300" />} title="Choose what to learn" body="Pick a few topics and MindScroll will build a balanced feed from the best sources for each.">
            <Link href="/topics" className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold text-white">
              Browse topics
            </Link>
          </EmptyState>
        ) : items.length === 0 && !loading ? (
          <EmptyState
            icon={exhausted && !loadError ? <PartyPopper className="size-10 text-indigo-300" /> : <Inbox className="size-10 text-indigo-300" />}
            title="You're all caught up"
            body="You've seen everything we have for these topics right now. New articles are fetched throughout the day — or add more topics for extra variety."
          >
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => router.refresh()} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold">
                <RefreshCw className="size-4" /> Check again
              </button>
              <Link href="/topics" className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold text-white">
                Add topics
              </Link>
            </div>
          </EmptyState>
        ) : (
          <>
            {items.map((item, index) => (
              <ArticleCard key={item.id} item={item} index={index} isFirst={index === 0} showSwipeHint={showHint} onOpen={openReader} onReadLater={addToReadLater} />
            ))}
            {exhausted ? (
              <section data-index={items.length} className="feed-card h-full">
                <EmptyState icon={<PartyPopper className="size-10 text-indigo-300" />} title="You're all caught up" body="That's everything new for now. Check your Read Later queue, or come back soon for fresh articles.">
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link href="/read-later" className="rounded-xl bg-white/10 px-5 py-3 font-semibold">
                      Open Read Later
                    </Link>
                    <Link href="/topics" className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold text-white">
                      Add topics
                    </Link>
                  </div>
                </EmptyState>
              </section>
            ) : (
              <section data-index={items.length} className="feed-card flex h-full items-center justify-center">
                {loadError ? (
                  <button onClick={() => void loadMore()} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold">
                    <RefreshCw className="size-4" /> Couldn&apos;t load more — retry
                  </button>
                ) : (
                  <Loader2 className="size-8 animate-spin text-zinc-500" aria-label="Loading more articles" />
                )}
              </section>
            )}
          </>
        )}
      </div>

      {items.length > 0 && (
        <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
          <NavButton label="Previous article" onClick={() => scrollToIndex(Math.max(active - 1, 0))} disabled={active === 0}>
            <ChevronUp className="size-5" />
          </NavButton>
          <NavButton label="Next article" onClick={() => scrollToIndex(active + 1)} disabled={active >= items.length}>
            <ChevronDown className="size-5" />
          </NavButton>
        </div>
      )}
    </div>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold backdrop-blur transition ${
        selected ? "border-white bg-white text-zinc-950" : "border-white/15 bg-zinc-900/60 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function NavButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button aria-label={label} onClick={onClick} disabled={disabled} className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 text-zinc-300 backdrop-blur transition hover:bg-zinc-800 disabled:opacity-30">
      {children}
    </button>
  );
}

function EmptyState({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10">{icon}</div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="max-w-sm text-zinc-400">{body}</p>
      {children}
    </div>
  );
}
