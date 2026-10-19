import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { authed, json, parseBody } from "@/lib/http";
import { readerPrefsSchema } from "@/lib/validation";

export const PUT = authed(async (req, user) => {
  const parsed = await parseBody(req, readerPrefsSchema);
  if ("error" in parsed) return parsed.error;
  await db.update(users).set({ readerPrefs: parsed.data }).where(eq(users.id, user.id));
  return json({ ok: true });
});
