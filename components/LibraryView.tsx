"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Clock, Inbox, Loader2, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useArticleFlags, useArticleStore } from "@/lib/client/articleStore";
import { readTime, timeAgo } from "@/lib/client/format";
import { useReader } from "@/lib/client/readerContext";
import { useToast } from "@/lib/client/toast";
import type { ArticleCard } from "@/lib/types";

type Kind = "saved" | "read-later";
type Props = { kind: Kind; initialItems: ArticleCard[]; initialHasMore: boolean };

const COPY: Record<Kind, { empty: string; emptyBody: string }> = {
  saved: { empty: "Nothing saved yet", emptyBody: "Tap the bookmark on any article to keep it here permanently." },
  "read-later": { empty: "Your Read Later queue is empty", emptyBody: "Swipe a feed card to the left to park it here for when you have time." },
};

export function LibraryView({ kind, initialItems, initialHasMore }: Props) {
  const store = useArticleStore();
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [fetched, setFetched] = useState(initialItems.length);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const inLibrary = (item: ArticleCard) => {
    const flags = store.flagsFor(item.id, { readLater: item.readLater, saved: item.saved });
    return kind === "saved" ? flags.saved : flags.readLater;
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => inLibrary(i) && (!q || `${i.title} ${i.source} ${i.tags.join(" ")} ${i.topic.name}`.toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, store]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const page = await api<{ items: ArticleCard[]; hasMore: boolean }>(`/api/library/${kind}?offset=${fetched}`);
      setItems((current) => [...current, ...page.items.filter((n) => !current.some((c) => c.id === n.id))]);
      setFetched((n) => n + page.items.length);
      setHasMore(page.hasMore);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 || (visible.length === 0 && !query)) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
        <Inbox className="size-10 text-zinc-600" />
        <h2 className="text-lg font-semibold">{COPY[kind].empty}</h2>
        <p className="max-w-xs text-sm text-zinc-400">{COPY[kind].emptyBody}</p>
        <Link href="/feed" className="mt-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white">
          Go to feed
        </Link>
      </div>
    );
  }

  return (
    <div>
      <label className="relative mb-4 block">
        <span className="sr-only">Filter articles</span>
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by title, source or topic"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-[15px] placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
        />
      </label>

      <ul className="space-y-3">
        {visible.map((item) => (
          <LibraryRow key={item.id} item={item} kind={kind} />
        ))}
      </ul>
      {visible.length === 0 && <p className="py-10 text-center text-sm text-zinc-500">No articles match “{query}”.</p>}

      {hasMore && (
        <button onClick={() => void loadMore()} disabled={loading} className="mx-auto mt-6 flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold disabled:opacity-60">
          {loading && <Loader2 className="size-4 animate-spin" />} Load more
        </button>
      )}
    </div>
  );
}

function LibraryRow({ item, kind }: { item: ArticleCard; kind: Kind }) {
  const reader = useReader();
  const toast = useToast();
  const flags = useArticleFlags(item.id, { readLater: item.readLater, saved: item.saved });
  const [imageOk, setImageOk] = useState(true);

  const open = () =>
    reader.open(item.id, {
      preview: item,
      getRect: () => (document.querySelector(`[data-row-id="${item.id}"]`) as HTMLElement | null)?.getBoundingClientRect() ?? null,
    });

  const remove = async () => {
    const ok = await (kind === "saved" ? flags.setSaved(false) : flags.setReadLater(false));
    if (!ok) return;
    toast({
      message: kind === "saved" ? "Removed from Saved" : "Removed from Read Later",
      actionLabel: "Undo",
      onAction: () => void (kind === "saved" ? flags.setSaved(true) : flags.setReadLater(true)),
    });
  };

  return (
    <li data-row-id={item.id} className="group flex gap-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-3 transition hover:border-white/20 sm:gap-4 sm:p-4">
      <button onClick={open} className="flex min-w-0 flex-1 gap-3 text-left sm:gap-4" aria-label={`Read ${item.title}`}>
        {item.imageUrl && imageOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setImageOk(false)} className="size-20 shrink-0 rounded-xl object-cover sm:size-24" />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-xl text-3xl sm:size-24" style={{ background: `${item.topic.accent}22` }} aria-hidden>
            {item.topic.emoji}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium" style={{ color: item.topic.accent }}>
            {item.topic.name}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug sm:text-base">{item.title}</h3>
          <p className="mt-1 truncate text-xs text-zinc-400">
            {item.source} · ⏱️ {readTime(item.readingMinutes)} · {timeAgo(item.publishedAt)}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 flex-col justify-between">
        {kind === "read-later" ? (
          <button
            aria-label="Move to Saved"
            title="Move to Saved"
            onClick={async () => {
              if (await flags.saveAndClearReadLater()) toast({ message: "Moved to Saved" });
            }}
            className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-indigo-300"
          >
            {flags.saved ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
          </button>
        ) : (
          <button aria-label="Move to Read Later" title="Move to Read Later" onClick={() => void flags.setReadLater(!flags.readLater)} className={`rounded-full p-2 hover:bg-white/10 ${flags.readLater ? "text-indigo-300" : "text-zinc-400 hover:text-indigo-300"}`}>
            <Clock className="size-5" />
          </button>
        )}
        <button aria-label="Remove" title="Remove" onClick={() => void remove()} className="rounded-full p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400">
          <Trash2 className="size-5" />
        </button>
      </div>
    </li>
  );
}
