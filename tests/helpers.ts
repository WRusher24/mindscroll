import "../scripts/env";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { articles, feeds, topics, users, userTopics } from "@/lib/db/schema";

export const hasDb = Boolean(process.env.DATABASE_URL);

export async function createUser(label = "u") {
  const [user] = await db
    .insert(users)
    .values({ email: `${label}-${randomUUID()}@test.dev`, name: label, passwordHash: "x" })
    .returning();
  return user;
}

/** Creates an isolated topic with `feedSizes[i]` articles in feed i, newest first. */
export async function createTopic(feedSizes: number[]) {
  const topicId = `t-${randomUUID().slice(0, 8)}`;
  await db.insert(topics).values({ id: topicId, name: topicId, description: "test", emoji: "🧪" });
  const feedIds: string[] = [];
  const articleIds: string[][] = [];
  for (const [i, size] of feedSizes.entries()) {
    const [feed] = await db.insert(feeds).values({ topicId, name: `Source ${String.fromCharCode(65 + i)}`, url: `https://example.test/${randomUUID()}` }).returning();
    feedIds.push(feed.id);
    const rows = Array.from({ length: size }, (_, n) => ({
      feedId: feed.id,
      topicId,
      urlHash: randomUUID(),
      url: `https://example.test/a/${randomUUID()}`,
      title: `${String.fromCharCode(65 + i)}${n + 1}`,
      teaser: "Teaser text.",
      publishedAt: new Date(Date.now() - (n * 3600_000 + i * 60_000)),
    }));
    const inserted = await db.insert(articles).values(rows).returning({ id: articles.id, title: articles.title });
    articleIds.push(inserted.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true })).map((r) => r.id));
  }
  return { topicId, feedIds, articleIds };
}

export async function subscribe(userId: string, topicId: string) {
  await db.insert(userTopics).values({ userId, topicId });
}
