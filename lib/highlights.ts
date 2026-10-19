import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "./db";
import { articles, feeds, highlights, topics } from "./db/schema";
import type { HighlightDTO, VaultGroup } from "./types";

type HighlightRow = typeof highlights.$inferSelect;

const toDto = (h: HighlightRow): HighlightDTO => ({
  id: h.id,
  articleId: h.articleId,
  text: h.text,
  note: h.note,
  color: h.color as HighlightDTO["color"],
  startOffset: h.startOffset,
  endOffset: h.endOffset,
  createdAt: h.createdAt.toISOString(),
});

export type CreateHighlightResult = { ok: true; highlight: HighlightDTO } | { ok: false; reason: "no_article" | "overlap" | "invalid_range" };

export async function createHighlight(
  userId: string,
  input: { articleId: string; text: string; note?: string | null; color: string; startOffset: number; endOffset: number },
): Promise<CreateHighlightResult> {
  if (input.endOffset <= input.startOffset) return { ok: false, reason: "invalid_range" };
  const [article] = await db.select({ id: articles.id }).from(articles).where(eq(articles.id, input.articleId)).limit(1);
  if (!article) return { ok: false, reason: "no_article" };

  const [overlap] = await db
    .select({ id: highlights.id })
    .from(highlights)
    .where(
      and(
        eq(highlights.userId, userId),
        eq(highlights.articleId, input.articleId),
        sql`${highlights.startOffset} < ${input.endOffset} and ${highlights.endOffset} > ${input.startOffset}`,
      ),
    )
    .limit(1);
  if (overlap) return { ok: false, reason: "overlap" };

  const [row] = await db
    .insert(highlights)
    .values({
      userId,
      articleId: input.articleId,
      text: input.text,
      note: input.note || null,
      color: input.color,
      startOffset: input.startOffset,
      endOffset: input.endOffset,
    })
    .returning();
  return { ok: true, highlight: toDto(row) };
}

export async function updateHighlight(userId: string, id: string, patch: { note?: string | null; color?: string }): Promise<HighlightDTO | null> {
  const set: Partial<HighlightRow> = { updatedAt: new Date() };
  if (patch.note !== undefined) set.note = patch.note || null;
  if (patch.color) set.color = patch.color;
  const [row] = await db
    .update(highlights)
    .set(set)
    .where(and(eq(highlights.id, id), eq(highlights.userId, userId)))
    .returning();
  return row ? toDto(row) : null;
}

export async function deleteHighlight(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(highlights)
    .where(and(eq(highlights.id, id), eq(highlights.userId, userId)))
    .returning({ id: highlights.id });
  return rows.length > 0;
}

async function queryVault(userId: string, search?: string) {
  const term = search?.trim();
  const like = term ? `%${term.replace(/[%_\\]/g, "\\$&")}%` : null;
  return db
    .select({ h: highlights, title: articles.title, url: articles.url, minutes: articles.readingMinutes, source: feeds.name, topic: topics })
    .from(highlights)
    .innerJoin(articles, eq(articles.id, highlights.articleId))
    .innerJoin(feeds, eq(feeds.id, articles.feedId))
    .innerJoin(topics, eq(topics.id, articles.topicId))
    .where(and(eq(highlights.userId, userId), like ? or(ilike(highlights.text, like), ilike(highlights.note, like), ilike(articles.title, like)) : undefined))
    .orderBy(desc(highlights.createdAt))
    .limit(1000);
}

/** All of a user's highlights and notes grouped by article, most recently highlighted article first. */
export async function getVault(userId: string, search?: string): Promise<VaultGroup[]> {
  const rows = await queryVault(userId, search);
  const groups = new Map<string, VaultGroup>();
  for (const row of rows) {
    let group = groups.get(row.h.articleId);
    if (!group) {
      group = {
        article: {
          id: row.h.articleId,
          title: row.title,
          source: row.source,
          url: row.url,
          readingMinutes: row.minutes,
          topic: { id: row.topic.id, name: row.topic.name, emoji: row.topic.emoji, accent: row.topic.accent },
        },
        highlights: [],
        lastHighlightedAt: row.h.createdAt.toISOString(),
      };
      groups.set(row.h.articleId, group);
    }
    group.highlights.push(toDto(row.h));
  }
  for (const group of groups.values()) group.highlights.sort((a, b) => a.startOffset - b.startOffset);
  return [...groups.values()];
}

export async function exportVaultMarkdown(userId: string): Promise<string> {
  const groups = await getVault(userId);
  const lines = ["# My MindScroll Highlights", "", `_Exported ${new Date().toISOString().slice(0, 10)}_`, ""];
  for (const group of groups) {
    lines.push(`## ${group.article.title}`, `*${group.article.source}* — ${group.article.url}`, "");
    for (const h of group.highlights) {
      lines.push(`> ${h.text.replace(/\n+/g, " ")}`);
      if (h.note) lines.push("", `**Note:** ${h.note.replace(/\n+/g, " ")}`);
      lines.push("");
    }
  }
  return lines.join("\n");
}
