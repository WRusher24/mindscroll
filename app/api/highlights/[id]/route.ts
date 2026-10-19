import { z } from "zod";
import { deleteHighlight, updateHighlight } from "@/lib/highlights";
import { apiError, authed, json, parseBody } from "@/lib/http";
import { highlightUpdateSchema } from "@/lib/validation";

export const PATCH = authed<{ id: string }>(async (req, user, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError("Invalid highlight id", 400);
  const parsed = await parseBody(req, highlightUpdateSchema);
  if ("error" in parsed) return parsed.error;
  const highlight = await updateHighlight(user.id, id, parsed.data);
  return highlight ? json({ highlight }) : apiError("Highlight not found", 404);
});

export const DELETE = authed<{ id: string }>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError("Invalid highlight id", 400);
  return (await deleteHighlight(user.id, id)) ? json({ ok: true }) : apiError("Highlight not found", 404);
});
