import { z } from "zod";
import { setArticleState } from "@/lib/feed";
import { apiError, authed, json, parseBody } from "@/lib/http";

const schema = z.object({ readLater: z.boolean().optional(), saved: z.boolean().optional(), opened: z.boolean().optional() });

/** Sets the caller's own flags (saved / read later / opened) for an article. */
export const PUT = authed<{ id: string }>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError("Invalid article id", 400);
  const parsed = await parseBody(req, schema);
  if ("error" in parsed) return parsed.error;
  const state = await setArticleState(user.id, id, parsed.data);
  if (!state) return apiError("Article not found", 404);
  return json(state);
});
