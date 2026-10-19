"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { api } from "@/lib/client/api";
import { useToast } from "@/lib/client/toast";
import type { TopicWithState } from "@/lib/types";

export function TopicPicker({ topics, welcome }: { topics: TopicWithState[]; welcome: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const initial = topics.filter((t) => t.subscribed).map((t) => t.id);
  const [selected, setSelected] = useState(() => new Set(initial));
  const [saving, setSaving] = useState(false);

  const changed = selected.size !== initial.length || initial.some((id) => !selected.has(id));
  const canSave = selected.size > 0 && (changed || welcome);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/topics", { method: "PUT", body: { topicIds: [...selected] } });
      toast({ message: "Topics updated" });
      router.push("/feed");
      router.refresh();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "";
      toast({ message: `Couldn't save your topics${reason ? ` (${reason})` : ""}. Please try again.`, tone: "error", duration: 9000 });
      setSaving(false);
    }
  };

  return (
    <div className="pb-28">
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {topics.map((topic) => {
          const on = selected.has(topic.id);
          return (
            <li key={topic.id}>
              <button
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(topic.id)}
                className="relative flex h-full w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition active:scale-[0.99]"
                style={{ borderColor: on ? topic.accent : "rgba(255,255,255,0.1)", background: on ? `${topic.accent}1f` : "rgba(24,24,27,0.6)" }}
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: `${topic.accent}26` }} aria-hidden>
                  {topic.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{topic.name}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-zinc-400">{topic.description}</span>
                  <span className="mt-1.5 block text-xs text-zinc-500">{topic.sourceCount} curated sources</span>
                </span>
                <span
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border transition"
                  style={{ borderColor: on ? topic.accent : "rgba(255,255,255,0.2)", background: on ? topic.accent : "transparent" }}
                  aria-hidden
                >
                  {on && <Check className="size-4 text-white" strokeWidth={3} />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="pb-safe fixed inset-x-0 bottom-[3.5rem] z-30 border-t border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">{selected.size === 0 ? "Pick at least one topic" : `${selected.size} topic${selected.size === 1 ? "" : "s"} selected`}</p>
          <button
            disabled={!canSave || saving}
            onClick={() => void save()}
            className="flex h-11 items-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-fuchsia-500 px-6 font-semibold text-white disabled:opacity-40"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            {welcome ? "Start my feed" : "Save topics"}
          </button>
        </div>
      </div>
    </div>
  );
}
