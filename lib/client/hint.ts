"use client";

import { useCallback, useSyncExternalStore } from "react";
import { storageGet, storageSet } from "./format";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

/** One-time onboarding hint backed by localStorage. Hidden during SSR, shown on the client until dismissed. */
export function useFirstRunHint(key: string): [boolean, () => void] {
  const show = useSyncExternalStore(
    subscribe,
    () => storageGet(key) === null,
    () => false,
  );
  const dismiss = useCallback(() => {
    storageSet(key, "1");
    listeners.forEach((cb) => cb());
  }, [key]);
  return [show, dismiss];
}
