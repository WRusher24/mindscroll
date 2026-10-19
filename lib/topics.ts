import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { feeds, topics, userTopics } from "./db/schema";
import type { TopicChip, TopicWithState } from "./types";

export async function listTopicsForUser(userId: string): Promise<TopicWithState[]> {
  const rows = await db
    .select({
      id: topics.id,
      name: topics.name,
      emoji: topics.emoji,
      accent: topics.accent,
      description: topics.description,
      sourceCount: sql<number>`count(distinct ${feeds.id}) filter (where ${feeds.active})::int`,
      subscribed: sql<boolean>`bool_or(${userTopics.userId} is not null)`,
    })
    .from(topics)
    .leftJoin(feeds, eq(feeds.topicId, topics.id))
    .leftJoin(userTopics, and(eq(userTopics.topicId, topics.id), eq(userTopics.userId, userId)))
    .groupBy(topics.id)
    .orderBy(asc(topics.sortOrder));
  return rows.map((r) => ({ ...r, subscribed: Boolean(r.subscribed), sourceCount: r.sourceCount ?? 0 }));
}

export async function listSubscribedTopics(userId: string): Promise<TopicChip[]> {
  return db
    .select({ id: topics.id, name: topics.name, emoji: topics.emoji, accent: topics.accent })
    .from(userTopics)
    .innerJoin(topics, eq(topics.id, userTopics.topicId))
    .where(eq(userTopics.userId, userId))
    .orderBy(asc(topics.sortOrder));
}

/** Replaces the user's subscriptions with `topicIds` (unknown ids are ignored). Returns the saved ids. */
export async function setUserTopics(userId: string, topicIds: string[]): Promise<string[]> {
  const unique = [...new Set(topicIds)];
  const valid = unique.length ? (await db.select({ id: topics.id }).from(topics).where(inArray(topics.id, unique))).map((t) => t.id) : [];
  await db.transaction(async (tx) => {
    await tx.delete(userTopics).where(eq(userTopics.userId, userId));
    if (valid.length) await tx.insert(userTopics).values(valid.map((topicId) => ({ userId, topicId })));
  });
  return valid;
}
