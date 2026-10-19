import { z } from "zod";
import { getReaderArticle } from "@/lib/feed";
import { apiError, authed, json } from "@/lib/http";
import { extractAndStore } from "@/lib/ingest";

export const maxDuration = 30;

export const GET = authed<{ id: string }>(async (_req, user, ctx) => {
  const { id } = await ctx.params;
  if (!z.uuid().safeParse(id).success) return apiError("Invalid article id", 400);

  let article = await getReaderArticle(user.id, id);
  if (!article) return apiError("Article not found", 404);

  // First reader to open an article pays the extraction cost; everyone after gets the cached text.
  if (!article.contentHtml && !article.extractionFailed) {
    await extractAndStore(id);
    article = (await getReaderArticle(user.id, id)) ?? article;
  }
  return json({ article });
});
