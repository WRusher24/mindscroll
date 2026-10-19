"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api } from "./api";
import { useToast } from "./toast";

export type Flags = { readLater: boolean; saved: boolean };
type Patch = Partial<Flags>;

type Store = {
  /** Current flags for an article: optimistic local state wins over the server-rendered value. */
  flagsFor: (id: string, initial: Flags) => Flags;
  update: (id: string, current: Flags, patch: Patch) => Promise<boolean>;
  markOpened: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

/**
 * Single source of truth for per-article Saved / Read Later flags on the client, so the feed card,
 * the reader and the library lists always agree. Updates are optimistic and roll back on failure.
 */
export function ArticleStoreProvider({ children }: { children: React.ReactNode }) {
  const [overrides, setOverrides] = useState<Record<string, Flags>>({});
  const toast = useToast();

  const flagsFor = useCallback((id: string, initial: Flags) => overrides[id] ?? initial, [overrides]);

  const update = useCallback(
    async (id: string, current: Flags, patch: Patch) => {
      const next = { ...current, ...patch };
      setOverrides((o) => ({ ...o, [id]: next }));
      try {
        await api(`/api/articles/${id}/state`, { method: "PUT", body: patch });
        return true;
      } catch {
        setOverrides((o) => ({ ...o, [id]: current }));
        toast({ message: "Couldn't update that article. Check your connection and try again.", tone: "error" });
        return false;
      }
    },
    [toast],
  );

  const markOpened = useCallback((id: string) => {
    api(`/api/articles/${id}/state`, { method: "PUT", body: { opened: true } }).catch(() => {});
  }, []);

  const value = useMemo(() => ({ flagsFor, update, markOpened }), [flagsFor, update, markOpened]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useArticleStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useArticleStore must be used inside <ArticleStoreProvider>");
  return ctx;
}

/** Flags + setters for one article. `toggleReadLater` / `toggleSaved` return the new value. */
export function useArticleFlags(id: string, initial: Flags) {
  const store = useArticleStore();
  const flags = store.flagsFor(id, initial);
  return {
    ...flags,
    setReadLater: (value: boolean) => store.update(id, flags, { readLater: value }),
    setSaved: (value: boolean) => store.update(id, flags, { saved: value }),
    /** Saving moves an article out of Read Later: it graduates into the permanent library. */
    saveAndClearReadLater: () => store.update(id, flags, { saved: true, readLater: false }),
  };
}
