export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Full page navigation (also resets all client state), e.g. after sign-out or session expiry. */
export function hardNavigate(path: string) {
  window.location.assign(new URL(path, window.location.origin).toString());
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; keepalive?: boolean; signal?: AbortSignal } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    keepalive: init.keepalive,
    signal: init.signal,
    credentials: "same-origin",
  });
  if (res.status === 401 && typeof window !== "undefined") {
    hardNavigate("/login");
    throw new ApiError("Your session has expired", 401);
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status);
  return data;
}
