import Parser from "rss-parser";
import { and, asc, eq, inArray, isNull, lt, notExists, or, sql } from "drizzle-orm";
import { db } from "./db";
import { articles, feeds, highlights, sessions, rateLimits, userArticles, type Feed } from "./db/schema";
import { extractArticle, prepareContent } from "./extract";
import { safeFetchText } from "./net";
import { cleanTags, hashUrl, makeTeaser, normalizeUrl, readingMinutes, stripHtml } from "./text";

type CustomItem = {
  contentEncoded?: string;
  mediaContent?: { $?: { url?: string; medium?: string; type?: string } }[];
  mediaThumbnail?: { $?: { url?: string } }[];
};

const parser: Parser<Record<string, unknown>, CustomItem> = new Parser({
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
    ],
  },
});

const MAX_ITEMS_PER_FEED = 30;
const MAX_AGE_DAYS = 90;
const FULL_CONTENT_MIN_WORDS = 250;
const DEFAULT_READING_MINUTES = 4;
const MAX_CONSECUTIVE_FAILURES = 5;

export type FeedResult = { feed: string; inserted: number; error?: string };

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>, shouldStop?: () => boolean): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      if (shouldStop?.()) return;
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results.filter((r) => r !== undefined);
}

function pickImage(item: Parser.Item & CustomItem, contentHtml: string): string | null {
  const candidates: (string | undefined)[] = [
    item.enclosure?.type?.startsWith("image") ? item.enclosure.url : undefined,
    ...(item.mediaContent ?? []).filter((m) => !m.$?.medium || m.$.medium === "image").map((m) => m.$?.url),
    ...(item.mediaThumbnail ?? []).map((m) => m.$?.url),
    /<img[^>]+src=["']([^"']+)["']/i.exec(contentHtml)?.[1],
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate, item.link);
      if ((url.protocol === "https:" || url.protocol === "http:") && !/\.(svg|gif)(\?|$)/i.test(url.pathname) && !/(pixel|spacer|1x1|tracking)/i.test(url.pathname)) {
        return url.toString();
      }
    } catch {
      continue;
    }
  }
  return null;
}

/** Fetches one feed and stores any previously unseen articles. */
export async function ingestFeed(feed: Feed): Promise<FeedResult> {
  try {
    const { text } = await safeFetchText(feed.url, { timeoutMs: 12000, accept: "application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.5" });
    const parsed = await parser.parseString(text);
    const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
    const rows: (typeof articles.$inferInsert)[] = [];

    for (const item of parsed.items.slice(0, MAX_ITEMS_PER_FEED)) {
      const url = normalizeUrl(item.link ?? (item.guid?.startsWith("http") ? item.guid : ""));
      const title = stripHtml(item.title ?? "");
      if (!url || title.length < 5) continue;

      const published = new Date(item.isoDate ?? item.pubDate ?? Date.now());
      const publishedAt = Number.isNaN(published.getTime()) ? new Date() : new Date(Math.min(published.getTime(), Date.now()));
      if (publishedAt.getTime() < cutoff) continue;

      const rawContent = item.contentEncoded ?? item.content ?? "";
      const rawSummary = item.summary ?? item.contentSnippet ?? (item as { description?: string }).description ?? "";
      const summaryTeaser = makeTeaser(rawSummary);
      const teaser = summaryTeaser.length >= 40 ? summaryTeaser : makeTeaser(rawContent) || summaryTeaser;
      if (!teaser) continue;

      const prepared = rawContent ? prepareContent(rawContent, url, title) : null;
      const full = prepared && prepared.wordCount >= FULL_CONTENT_MIN_WORDS ? prepared : null;

      rows.push({
        feedId: feed.id,
        topicId: feed.topicId,
        urlHash: hashUrl(url),
        url,
        title: title.slice(0, 300),
        teaser,
        author: (item.creator ?? (item as { author?: string }).author ?? null)?.toString().slice(0, 120) || null,
        imageUrl: pickImage(item, rawContent),
        tags: cleanTags(item.categories ?? []),
        readingMinutes: full ? readingMinutes(full.wordCount) : DEFAULT_READING_MINUTES,
        contentHtml: full?.html ?? null,
        contentExtractedAt: full ? new Date() : null,
        publishedAt,
      });
    }

    let inserted = 0;
    if (rows.length) {
      const result = await db.insert(articles).values(rows).onConflictDoNothing({ target: articles.urlHash }).returning({ id: articles.id });
      inserted = result.length;
    }
    await db.update(feeds).set({ lastFetchedAt: new Date(), lastSuccessAt: new Date(), consecutiveFailures: 0, lastError: null }).where(eq(feeds.id, feed.id));
    return { feed: feed.name, inserted };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(feeds)
      .set({ lastFetchedAt: new Date(), consecutiveFailures: sql`${feeds.consecutiveFailures} + 1`, lastError: message.slice(0, 300) })
      .where(eq(feeds.id, feed.id));
    return { feed: feed.name, inserted: 0, error: message };
  }
}

/**
 * Extracts full readable text for articles that only arrived with an excerpt, and corrects their
 * reading-time estimate. Used by the cron run and by the reader (on demand).
 */
export async function extractAndStore(articleId: string): Promise<boolean> {
  const [row] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  if (!row) return false;
  if (row.contentHtml) return true;
  try {
    const extracted = await extractArticle(row.url, row.title);
    if (!extracted) throw new Error("No readable content");
    await db
      .update(articles)
      .set({
        contentHtml: extracted.html,
        contentExtractedAt: new Date(),
        extractionFailed: false,
        readingMinutes: readingMinutes(extracted.wordCount),
        imageUrl: row.imageUrl ?? extracted.image,
        teaser: row.teaser.length < 60 ? makeTeaser(extracted.text) || row.teaser : row.teaser,
      })
      .where(eq(articles.id, articleId));
    return true;
  } catch {
    await db.update(articles).set({ extractionFailed: true, contentExtractedAt: new Date() }).where(eq(articles.id, articleId));
    return false;
  }
}

export async function enrichPending(limit: number, deadline: number): Promise<number> {
  const pending = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(isNull(articles.contentHtml), eq(articles.extractionFailed, false), sql`${articles.createdAt} > now() - interval '7 days'`))
    .orderBy(sql`${articles.createdAt} desc`)
    .limit(limit);
  let done = 0;
  await mapLimit(
    pending,
    4,
    async (a) => {
      if (await extractAndStore(a.id)) done++;
    },
    () => Date.now() > deadline,
  );
  return done;
}

export type IngestSummary = { feedsProcessed: number; inserted: number; enriched: number; failures: number; results: FeedResult[] };

export async function ingestAll(opts: { budgetMs?: number; topicId?: string; force?: boolean; minIntervalMinutes?: number; enrichLimit?: number } = {}): Promise<IngestSummary> {
  const { budgetMs = 50_000, topicId, force = false, minIntervalMinutes = 25, enrichLimit = 40 } = opts;
  const deadline = Date.now() + budgetMs;

  const due = await db
    .select()
    .from(feeds)
    .where(
      and(
        eq(feeds.active, true),
        topicId ? eq(feeds.topicId, topicId) : undefined,
        force ? undefined : or(isNull(feeds.lastFetchedAt), lt(feeds.lastFetchedAt, sql`now() - make_interval(mins => ${minIntervalMinutes})`)),
        // Back off from broken feeds: after repeated failures retry only once a day.
        or(lt(feeds.consecutiveFailures, MAX_CONSECUTIVE_FAILURES), isNull(feeds.lastFetchedAt), lt(feeds.lastFetchedAt, sql`now() - interval '1 day'`)),
      ),
    )
    .orderBy(sql`${feeds.lastFetchedAt} asc nulls first`, asc(feeds.name));

  const results = await mapLimit(due, 6, (feed) => ingestFeed(feed), () => Date.now() > deadline);
  const enriched = Date.now() < deadline ? await enrichPending(enrichLimit, deadline) : 0;

  return {
    feedsProcessed: results.length,
    inserted: results.reduce((sum, r) => sum + r.inserted, 0),
    enriched,
    failures: results.filter((r) => r.error).length,
    results,
  };
}

/** Housekeeping: drops stale catalog rows nobody kept, plus expired sessions and rate-limit counters. */
export async function pruneStaleData() {
  const stale = await db
    .delete(articles)
    .where(
      and(
        sql`${articles.createdAt} < now() - interval '120 days'`,
        notExists(db.select({ x: sql`1` }).from(userArticles).where(and(eq(userArticles.articleId, articles.id), or(eq(userArticles.saved, true), eq(userArticles.readLater, true))))),
        notExists(db.select({ x: sql`1` }).from(highlights).where(eq(highlights.articleId, articles.id))),
      ),
    )
    .returning({ id: articles.id });
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date()));
  return { prunedArticles: stale.length };
}

export async function ingestTopicsIfEmpty(topicIds: string[]) {
  if (!topicIds.length) return;
  const counts = await db
    .select({ topicId: articles.topicId })
    .from(articles)
    .where(inArray(articles.topicId, topicIds))
    .groupBy(articles.topicId);
  const have = new Set(counts.map((c) => c.topicId));
  for (const id of topicIds) {
    if (!have.has(id)) await ingestAll({ topicId: id, budgetMs: 40_000, force: true, enrichLimit: 12 });
  }
}
