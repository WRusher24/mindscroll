import { createHighlight } from "@/lib/highlights";
import { apiError, authed, json, parseBody } from "@/lib/http";
import { highlightCreateSchema } from "@/lib/validation";

export const POST = authed(async (req, user) => {
  const parsed = await parseBody(req, highlightCreateSchema);
  if ("error" in parsed) return parsed.error;
  const result = await createHighlight(user.id, parsed.data);
  if (!result.ok) {
    if (result.reason === "no_article") return apiError("Article not found", 404);
    if (result.reason === "overlap") return apiError("That passage overlaps an existing highlight. Tap the highlight to edit it.", 409);
    return apiError("Invalid selection", 400);
  }
  return json({ highlight: result.highlight }, { status: 201 });
});
