import "server-only";
import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getSessionUser, type SessionUser } from "./auth";

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export function apiError(message: string, status = 400) {
  return json({ error: message }, { status });
}

/**
 * CSRF defence for cookie-authenticated mutations: browsers always send Origin on cross-site
 * POST/PATCH/PUT/DELETE, so a mismatch means the request was not initiated by our own pages.
 */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl, cron) cannot carry a victim's cookies
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  // Behind a proxy the public host may arrive as Host or X-Forwarded-Host; on Vercel the same deployment
  // is also reachable through its stable aliases, which are exposed to the app as environment variables.
  const allowed = [
    req.headers.get("host"),
    req.headers.get("x-forwarded-host"),
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter(Boolean);
  return allowed.some((host) => host === originHost);
}

type Ctx<P> = { params: Promise<P> };

/** Wraps an API handler with authentication, same-origin enforcement for mutations and uniform error handling. */
export function authed<P = Record<string, never>>(handler: (req: Request, user: SessionUser, ctx: Ctx<P>) => Promise<Response>) {
  return async (req: Request, ctx: Ctx<P>) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return apiError("Cross-origin request blocked", 403);
      const user = await getSessionUser();
      if (!user) return apiError("Not signed in", 401);
      return await handler(req, user, ctx);
    } catch (error) {
      console.error("API error", error);
      return apiError("Something went wrong", 500);
    }
  };
}

export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<{ data: T } | { error: Response }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: apiError("Invalid JSON body") };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return { error: apiError(parsed.error.issues[0]?.message ?? "Invalid request") };
  return { data: parsed.data };
}
