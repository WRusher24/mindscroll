import "server-only";
import bcrypt from "bcryptjs";
import { createHmac, randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { sessions, users, type ReaderPrefs } from "./db/schema";

export const SESSION_COOKIE = "ms_session";
const SESSION_DAYS = 30;
const BCRYPT_COST = 11;
// A real hash of a random value; compared against when the email is unknown so response time doesn't reveal accounts.
let dummyHash: string | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync(randomBytes(16).toString("hex"), BCRYPT_COST));

export type SessionUser = { id: string; email: string; name: string; readerPrefs: ReaderPrefs | null };

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  return value;
}

function hashToken(token: string): string {
  return createHmac("sha256", secret()).update(token).digest("hex");
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, hash: string | null): Promise<boolean> {
  const ok = await bcrypt.compare(password, hash ?? getDummyHash());
  return hash ? ok : false;
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}

/** Resolves the signed-in user for the current request (memoized per request). */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name, readerPrefs: users.readerPrefs })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, email: row.email, name: row.name, readerPrefs: row.readerPrefs };
});

/** For pages and layouts: redirects to /login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Fixed-window rate limiter backed by Postgres (works across serverless instances). Returns true when allowed. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const rows = await db.execute<{ count: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    on conflict (key) do update set
      count = case when rate_limits.reset_at < now() then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at < now() then now() + make_interval(secs => ${windowSeconds}) else rate_limits.reset_at end
    returning count
  `);
  return Number(rows[0]?.count ?? 1) <= max;
}
