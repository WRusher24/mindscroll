import { listLibrary } from "@/lib/feed";
import { apiError, authed, json } from "@/lib/http";

export const GET = authed<{ kind: string }>(async (req, user, ctx) => {
  const { kind } = await ctx.params;
  if (kind !== "saved" && kind !== "read-later") return apiError("Unknown library", 404);
  const offset = Math.max(0, Number(new URL(req.url).searchParams.get("offset") ?? 0) || 0);
  return json(await listLibrary(user.id, kind, { offset }));
});
