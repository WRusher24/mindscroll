import { markSeen } from "@/lib/feed";
import { authed, json, parseBody } from "@/lib/http";
import { seenSchema } from "@/lib/validation";

/** Marks articles the user scrolled past as dismissed so they never return to the feed. */
export const POST = authed(async (req, user) => {
  const parsed = await parseBody(req, seenSchema);
  if ("error" in parsed) return parsed.error;
  await markSeen(user.id, parsed.data.ids);
  return json({ ok: true });
});
