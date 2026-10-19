"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_READER_PREFS, READER_THEMES, type ReaderPrefsDTO, type ReaderTheme } from "@/lib/types";
import { api } from "./api";
import { storageGet, storageSet } from "./format";

const KEY = "ms:reader-prefs-v1";
const SYNC_DELAY_MS = 700;

function sanitize(input: Partial<ReaderPrefsDTO> | null | undefined): ReaderPrefsDTO {
  const d = DEFAULT_READER_PREFS;
  const theme = READER_THEMES.some((t) => t.id === input?.theme) ? input!.theme! : d.theme;
  const fontSize = Math.round(Math.min(30, Math.max(14, Number(input?.fontSize ?? d.fontSize))));
  const lineHeight = Math.round(Math.min(2.4, Math.max(1.3, Number(input?.lineHeight ?? d.lineHeight))) * 10) / 10;
  const fontFamily = input?.fontFamily === "sans" ? "sans" : input?.fontFamily === "serif" ? "serif" : d.fontFamily;
  return { theme, fontSize: Number.isFinite(fontSize) ? fontSize : d.fontSize, lineHeight: Number.isFinite(lineHeight) ? lineHeight : d.lineHeight, fontFamily };
}

function load(serverPrefs: ReaderPrefsDTO | null): ReaderPrefsDTO {
  const local = storageGet(KEY);
  if (local) {
    try {
      return sanitize(JSON.parse(local));
    } catch {
      /* fall through to the server value */
    }
  }
  return sanitize(serverPrefs);
}

/**
 * Reader appearance preferences. Applied instantly, remembered on this device (localStorage) and
 * synced to the account (debounced) so the same look follows the user across devices.
 */
export function useReaderPrefs(serverPrefs: ReaderPrefsDTO | null): { prefs: ReaderPrefsDTO; theme: ReaderTheme; update: (patch: Partial<ReaderPrefsDTO>) => void } {
  const [prefs, setPrefs] = useState<ReaderPrefsDTO>(() => load(serverPrefs));
  const latest = useRef(prefs);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  const sync = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    api("/api/settings/reader", { method: "PUT", body: latest.current, keepalive: true }).catch(() => {});
  }, []);

  const update = useCallback(
    (patch: Partial<ReaderPrefsDTO>) => {
      const next = sanitize({ ...latest.current, ...patch });
      latest.current = next;
      setPrefs(next);
      storageSet(KEY, JSON.stringify(next));
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(sync, SYNC_DELAY_MS);
    },
    [sync],
  );

  useEffect(() => sync, [sync]); // flush a pending change when the reader closes

  const theme = READER_THEMES.find((t) => t.id === prefs.theme) ?? READER_THEMES[1];
  return { prefs, theme, update };
}
