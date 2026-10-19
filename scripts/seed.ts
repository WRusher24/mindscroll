import "./env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { connectionConfig } from "../lib/db/connection";
import { CATALOG } from "../lib/catalog";
import { feeds, topics } from "../lib/db/schema";

/** Idempotent: safe to run on every deploy. Never re-activates a feed an admin disabled. */
async function main() {
  const [url, options] = connectionConfig(process.env.DATABASE_URL, { max: 1 });
  const client = postgres(url, options);
  const db = drizzle(client);

  let feedCount = 0;
  for (const [index, topic] of CATALOG.entries()) {
    await db
      .insert(topics)
      .values({ id: topic.id, name: topic.name, description: topic.description, emoji: topic.emoji, accent: topic.accent, sortOrder: index })
      .onConflictDoUpdate({
        target: topics.id,
        set: { name: topic.name, description: topic.description, emoji: topic.emoji, accent: topic.accent, sortOrder: index },
      });

    for (const feed of topic.feeds) {
      await db
        .insert(feeds)
        .values({ topicId: topic.id, name: feed.name, url: feed.url, siteUrl: feed.siteUrl })
        .onConflictDoUpdate({
          target: feeds.url,
          set: { topicId: topic.id, name: feed.name, siteUrl: feed.siteUrl },
        });
      feedCount++;
    }
  }
  await client.end();
  console.log(`✔ Seeded ${CATALOG.length} topics and ${feedCount} feeds`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
