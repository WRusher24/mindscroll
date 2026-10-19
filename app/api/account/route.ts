import { eq } from "drizzle-orm";
import { z } from "zod";
import { destroySession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { apiError, authed, json, parseBody } from "@/lib/http";

/** Permanently deletes the account and everything it owns (cascades to topics, libraries, highlights, sessions). */
export const DELETE = authed(async (req, user) => {
  const parsed = await parseBody(req, z.object({ password: z.string().min(1).max(128) }));
  if ("error" in parsed) return parsed.error;
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !(await verifyPassword(parsed.data.password, row.hash))) return apiError("Incorrect password", 403);
  await destroySession();
  await db.delete(users).where(eq(users.id, user.id));
  return json({ ok: true });
});
