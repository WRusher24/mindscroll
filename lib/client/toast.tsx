"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type Toast = { id: number; message: string; actionLabel?: string; onAction?: () => void; tone?: "default" | "error" };
type ToastInput = Omit<Toast, "id"> & { duration?: number };

const ToastContext = createContext<(t: ToastInput) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    ({ duration = 4200, ...toast }: ToastInput) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { ...toast, id }]);
      timers.current.set(id, setTimeout(() => dismiss(id), duration));
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => active.forEach(clearTimeout);
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(4.25rem+env(safe-area-inset-top))] z-[100] flex flex-col items-center gap-2 px-4 md:inset-x-auto md:bottom-6 md:right-6 md:top-auto md:items-end"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex max-w-md animate-fade-up items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
              t.tone === "error" ? "border-red-500/30 bg-red-950/90 text-red-100" : "border-white/10 bg-zinc-800/95 text-zinc-100"
            }`}
          >
            <span>{t.message}</span>
            {t.actionLabel && (
              <button
                className="shrink-0 font-semibold text-indigo-300 hover:text-indigo-200"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
