import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { articles, feeds, highlights, topics, userArticles } from "./db/schema";
import type { ArticleCard, HighlightDTO, ReaderArticle } from "./types";

type CardRow = {
  id: string;
  title: string;
  teaser: string;
  url: string;
  image_url: string | null;
  tags: string[];
  reading_minutes: number;
  published_at: Date | string;
  author: string | null;
  source: string;
  topic_id: string;
  topic_name: string;
  topic_emoji: string;
  topic_accent: string;
};

function toCard(row: CardRow): ArticleCard {
  return {
    id: row.id,
    title: row.title,
    teaser: row.teaser,
    url: row.url,
    imageUrl: row.image_url,
    tags: row.tags,
    readingMinutes: row.reading_minutes,
    publishedAt: new Date(row.published_at).toISOString(),
    author: row.author,
    source: row.source,
    topic: { id: row.topic_id, name: row.topic_name, emoji: row.topic_emoji, accent: row.topic_accent },
    readLater: false,
    saved: false,
  };
}

/**
 * Returns the next page of the user's feed.
 *
 *  - Only topics the user subscribed to are considered.
 *  - Anything the user has ever been shown (a `user_articles` row) is excluded: the dismissal rule.
 *  - Balanced interleaving, in two levels:
 *      1. Inside a topic, articles are ranked round-robin across its sources
 *         (newest of A, newest of B, newest of C, 2nd of A, 2nd of B, …) so no feed can dominate.
 *      2. Topics are then round-robined against each other, so a topic with many sources
 *         does not out-shout a topic with few.
 *    Source and topic order inside a round is a stable per-user shuffle, so every user gets a
 *    different but consistent rhythm.
 *  - `exclude` holds ids the client already has (shown but not yet marked as seen). They are
 *    removed *after* ranking so page boundaries keep the interleaving pattern intact.
 */
export async function getFeedPage(userId: string, opts: { topic?: string | null; exclude?: string[]; limit?: number }): Promise<ArticleCard[]> {
  const { topic = null, exclude = [], limit = 10 } = opts;
  const excludeClause = exclude.length
    ? sql`and t.id not in (${sql.join(exclude.map((id) => sql`${id}::uuid`), sql`, `)})`
    : sql``;

  const rows = await db.execute<CardRow>(sql`
    with eligible as (
      select a.id, a.feed_id, a.topic_id, a.published_at
      from articles a
      join user_topics ut on ut.topic_id = a.topic_id and ut.user_id = ${userId}
      where a.published_at > now() - interval '45 days'
        ${topic ? sql`and a.topic_id = ${topic}` : sql``}
        and not exists (
          select 1 from user_articles ua where ua.user_id = ${userId} and ua.article_id = a.id
        )
    ),
    per_feed as (
      select e.*, row_number() over (partition by e.feed_id order by e.published_at desc) as feed_rank
      from eligible e
    ),
    per_topic as (
      select p.*,
        row_number() over (
          partition by p.topic_id
          order by p.feed_rank, md5(p.feed_id::text || ${userId}::text), p.published_at desc
        ) as topic_rank
      from per_feed p
      where p.feed_rank <= 40
    )
    select t.id, a.title, a.teaser, a.url, a.image_url, a.tags, a.reading_minutes, a.published_at, a.author,
           f.name as source, tp.id as topic_id, tp.name as topic_name, tp.emoji as topic_emoji, tp.accent as topic_accent
    from per_topic t
    join articles a on a.id = t.id
    join feeds f on f.id = t.feed_id
    join topics tp on tp.id = t.topic_id
    where true ${excludeClause}
    order by t.topic_rank, md5(t.topic_id || ${userId}::text), t.feed_rank
    limit ${limit}
  `);
  return rows.map(toCard);
}

/** Records articles as viewed/dismissed so they never return to this user's feed. Idempotent. */
export async function markSeen(userId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await db.execute(sql`
    insert into user_articles (user_id, article_id)
    select ${userId}::uuid, a.id from articles a
    where a.id in (${sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `)})
    on conflict (user_id, article_id) do nothing
  `);
}

export async function setArticleState(userId: string, articleId: string, state: { readLater?: boolean; saved?: boolean; opened?: boolean }): Promise<{ readLater: boolean; saved: boolean } | null> {
  const [exists] = await db.select({ id: articles.id }).from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!exists) return null;
  const now = new Date();
  const insertValues = {
    userId,
    articleId,
    readLater: state.readLater ?? false,
    readLaterAt: state.readLater ? now : null,
    saved: state.saved ?? false,
    savedAt: state.saved ? now : null,
    lastOpenedAt: state.opened ? now : null,
  };
  const updateSet: Partial<typeof userArticles.$inferInsert> = {};
  if (state.readLater !== undefined) Object.assign(updateSet, { readLater: state.readLater, readLaterAt: state.readLater ? now : null });
  if (state.saved !== undefined) Object.assign(updateSet, { saved: state.saved, savedAt: state.saved ? now : null });
  if (state.opened) updateSet.lastOpenedAt = now;

  const [row] = await db
    .insert(userArticles)
    .values(insertValues)
    .onConflictDoUpdate({ target: [userArticles.userId, userArticles.articleId], set: Object.keys(updateSet).length ? updateSet : { seenAt: sql`${userArticles.seenAt}` } })
    .returning({ readLater: userArticles.readLater, saved: userArticles.saved });
  return row;
}

function toHighlight(h: typeof highlights.$inferSelect): HighlightDTO {
  return {
    id: h.id,
    articleId: h.articleId,
    text: h.text,
    note: h.note,
    color: h.color as HighlightDTO["color"],
    startOffset: h.startOffset,
    endOffset: h.endOffset,
    createdAt: h.createdAt.toISOString(),
  };
}

/** Loads one article for the reader together with the caller's own state and highlights. */
export async function getReaderArticle(userId: string, articleId: string): Promise<ReaderArticle | null> {
  const [row] = await db
    .select({ a: articles, source: feeds.name, topic: topics, ua: userArticles })
    .from(articles)
    .innerJoin(feeds, eq(feeds.id, articles.feedId))
    .innerJoin(topics, eq(topics.id, articles.topicId))
    .leftJoin(userArticles, and(eq(userArticles.articleId, articles.id), eq(userArticles.userId, userId)))
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!row) return null;

  const own = await db
    .select()
    .from(highlights)
    .where(and(eq(highlights.userId, userId), eq(highlights.articleId, articleId)))
    .orderBy(highlights.startOffset);

  return {
    id: row.a.id,
    title: row.a.title,
    teaser: row.a.teaser,
    url: row.a.url,
    imageUrl: row.a.imageUrl,
    tags: row.a.tags,
    readingMinutes: row.a.readingMinutes,
    publishedAt: row.a.publishedAt.toISOString(),
    author: row.a.author,
    source: row.source,
    topic: { id: row.topic.id, name: row.topic.name, emoji: row.topic.emoji, accent: row.topic.accent },
    readLater: row.ua?.readLater ?? false,
    saved: row.ua?.saved ?? false,
    contentHtml: row.a.contentHtml,
    extractionFailed: row.a.extractionFailed,
    highlights: own.map(toHighlight),
  };
}

export type LibraryKind = "saved" | "read-later";

export async function listLibrary(userId: string, kind: LibraryKind, opts: { offset?: number; limit?: number } = {}): Promise<{ items: ArticleCard[]; hasMore: boolean }> {
  const { offset = 0, limit = 30 } = opts;
  const flag = kind === "saved" ? userArticles.saved : userArticles.readLater;
  const stamp = kind === "saved" ? userArticles.savedAt : userArticles.readLaterAt;
  const rows = await db
    .select({ a: articles, source: feeds.name, topic: topics, ua: userArticles })
    .from(userArticles)
    .innerJoin(articles, eq(articles.id, userArticles.articleId))
    .innerJoin(feeds, eq(feeds.id, articles.feedId))
    .innerJoin(topics, eq(topics.id, articles.topicId))
    .where(and(eq(userArticles.userId, userId), eq(flag, true)))
    .orderBy(desc(stamp))
    .limit(limit + 1)
    .offset(offset);

  const items = rows.slice(0, limit).map((row): ArticleCard => ({
    id: row.a.id,
    title: row.a.title,
    teaser: row.a.teaser,
    url: row.a.url,
    imageUrl: row.a.imageUrl,
    tags: row.a.tags,
    readingMinutes: row.a.readingMinutes,
    publishedAt: row.a.publishedAt.toISOString(),
    author: row.a.author,
    source: row.source,
    topic: { id: row.topic.id, name: row.topic.name, emoji: row.topic.emoji, accent: row.topic.accent },
    readLater: row.ua.readLater,
    saved: row.ua.saved,
  }));
  return { items, hasMore: rows.length > limit };
}

export async function libraryCounts(userId: string): Promise<{ saved: number; readLater: number; highlights: number }> {
  const [row] = await db.execute<{ saved: number; read_later: number; highlights: number }>(sql`
    select
      (select count(*) from user_articles where user_id = ${userId} and saved) ::int as saved,
      (select count(*) from user_articles where user_id = ${userId} and read_later) ::int as read_later,
      (select count(*) from highlights where user_id = ${userId}) ::int as highlights
  `);
  return { saved: row.saved, readLater: row.read_later, highlights: row.highlights };
}
