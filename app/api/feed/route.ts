import { getFeedPage } from "@/lib/feed";
import { authed, json, parseBody } from "@/lib/http";
import { feedRequestSchema } from "@/lib/validation";

export const POST = authed(async (req, user) => {
  const parsed = await parseBody(req, feedRequestSchema);
  if ("error" in parsed) return parsed.error;
  const items = await getFeedPage(user.id, parsed.data);
  return json({ items });
});
