"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Download, Highlighter, Pencil, Search, Trash2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { timeAgo } from "@/lib/client/format";
import { useReader } from "@/lib/client/readerContext";
import { useToast } from "@/lib/client/toast";
import { HIGHLIGHT_SWATCHES, type HighlightDTO, type VaultGroup } from "@/lib/types";

export function VaultView({ initialGroups, query }: { initialGroups: VaultGroup[]; query: string }) {
  const [groups, setGroups] = useState(initialGroups);
  const total = groups.reduce((n, g) => n + g.highlights.length, 0);

  const patchHighlight = (updated: HighlightDTO) =>
    setGroups((gs) => gs.map((g) => (g.article.id === updated.articleId ? { ...g, highlights: g.highlights.map((h) => (h.id === updated.id ? updated : h)) } : g)));
  const dropHighlight = (h: HighlightDTO) =>
    setGroups((gs) => gs.map((g) => (g.article.id === h.articleId ? { ...g, highlights: g.highlights.filter((x) => x.id !== h.id) } : g)).filter((g) => g.highlights.length > 0));

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <form action="/vault" className="relative flex-1">
          <label className="sr-only" htmlFor="vault-search">
            Search highlights and notes
          </label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
          <input
            id="vault-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search highlights, notes and titles"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-[15px] placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none"
          />
        </form>
        {total > 0 && !query && (
          <a href="/api/highlights/export" download className="flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold hover:bg-white/15">
            <Download className="size-4" /> Export Markdown
          </a>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/10 px-6 py-16 text-center">
          <Highlighter className="size-10 text-zinc-600" />
          <h2 className="text-lg font-semibold">{query ? `Nothing matches “${query}”` : "No highlights yet"}</h2>
          <p className="max-w-xs text-sm text-zinc-400">
            {query ? "Try a different search term." : "Open any article and select text to highlight it and attach a note. Everything you collect appears here, organized by article."}
          </p>
          {query ? (
            <Link href="/vault" className="mt-2 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold">
              Clear search
            </Link>
          ) : (
            <Link href="/feed" className="mt-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white">
              Start reading
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Group key={group.article.id} group={group} onChange={patchHighlight} onDelete={dropHighlight} />
          ))}
        </div>
      )}
    </div>
  );
}

function Group({ group, onChange, onDelete }: { group: VaultGroup; onChange: (h: HighlightDTO) => void; onDelete: (h: HighlightDTO) => void }) {
  const reader = useReader();
  const { article } = group;
  return (
    <section data-row-id={article.id} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
      <header className="flex items-start justify-between gap-3 border-b border-white/5 p-4">
        <div className="min-w-0">
          <p className="text-xs font-medium" style={{ color: article.topic.accent }}>
            {article.topic.emoji} {article.topic.name}
          </p>
          <h2 className="mt-0.5 text-[15px] font-semibold leading-snug sm:text-base">{article.title}</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {article.source} · {group.highlights.length} highlight{group.highlights.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={() =>
            reader.open(article.id, { getRect: () => (document.querySelector(`[data-row-id="${article.id}"]`) as HTMLElement | null)?.getBoundingClientRect() ?? null })
          }
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15"
        >
          <BookOpen className="size-4" /> Open
        </button>
      </header>
      <ul className="divide-y divide-white/5">
        {group.highlights.map((h) => (
          <HighlightItem key={h.id} highlight={h} onChange={onChange} onDelete={onDelete} />
        ))}
      </ul>
    </section>
  );
}

function HighlightItem({ highlight, onChange, onDelete }: { highlight: HighlightDTO; onChange: (h: HighlightDTO) => void; onDelete: (h: HighlightDTO) => void }) {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(highlight.note ?? "");
  const [busy, setBusy] = useState(false);

  const saveNote = async () => {
    setBusy(true);
    try {
      const { highlight: updated } = await api<{ highlight: HighlightDTO }>(`/api/highlights/${highlight.id}`, { method: "PATCH", body: { note: note.trim() || null } });
      onChange(updated);
      setEditing(false);
    } catch {
      toast({ message: "Couldn't save the note.", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove this highlight and its note?")) return;
    try {
      await api(`/api/highlights/${highlight.id}`, { method: "DELETE" });
      onDelete(highlight);
    } catch {
      toast({ message: "Couldn't remove the highlight.", tone: "error" });
    }
  };

  return (
    <li className="p-4">
      <blockquote className="border-l-4 pl-3 text-[15px] leading-relaxed text-zinc-100" style={{ borderColor: HIGHLIGHT_SWATCHES[highlight.color].dot }}>
        {highlight.text}
      </blockquote>

      {editing ? (
        <div className="mt-3">
          <textarea
            autoFocus
            value={note}
            maxLength={5000}
            rows={3}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a note…"
            aria-label="Note"
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-[15px] focus:border-indigo-400 focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => {
                setNote(highlight.note ?? "");
                setEditing(false);
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-white/10"
            >
              Cancel
            </button>
            <button disabled={busy} onClick={() => void saveNote()} className="rounded-lg bg-indigo-500 px-3.5 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
              Save note
            </button>
          </div>
        </div>
      ) : (
        highlight.note && <p className="mt-2.5 rounded-xl bg-white/5 px-3 py-2 text-sm leading-relaxed text-zinc-300">📝 {highlight.note}</p>
      )}

      {!editing && (
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
          <span>{timeAgo(highlight.createdAt)}</span>
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-white/10 hover:text-zinc-200">
              <Pencil className="size-3.5" /> {highlight.note ? "Edit note" : "Add note"}
            </button>
            <button onClick={() => void remove()} className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-red-500/10 hover:text-red-400" aria-label="Remove highlight">
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
