import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db, getClient } from "@/lib/db";
import { highlights, topics, users } from "@/lib/db/schema";
import { getFeedPage, getReaderArticle, listLibrary, markSeen, setArticleState } from "@/lib/feed";
import { createHighlight, deleteHighlight, getVault, updateHighlight } from "@/lib/highlights";
import { createTopic, createUser, hasDb, subscribe } from "./helpers";

const created = { users: [] as string[], topics: [] as string[] };
afterAll(async () => {
  if (!hasDb) return;
  for (const id of created.users) await db.delete(users).where(eq(users.id, id));
  for (const id of created.topics) await db.delete(topics).where(eq(topics.id, id));
  await getClient().end();
});

describe.skipIf(!hasDb)("balanced feed engine", () => {
  it("interleaves sources round-robin so no feed dominates", async () => {
    const user = await createUser();
    created.users.push(user.id);
    // Source A is prolific (10 articles); B and C have only 3 each.
    const topic = await createTopic([10, 3, 3]);
    created.topics.push(topic.topicId);
    await subscribe(user.id, topic.topicId);

    const page = await getFeedPage(user.id, { limit: 9 });
    const sources = page.map((c) => c.source);

    // First round: one article from each distinct source.
    expect(new Set(sources.slice(0, 3)).size).toBe(3);
    // Second and third rounds as well.
    expect(new Set(sources.slice(3, 6)).size).toBe(3);
    expect(new Set(sources.slice(6, 9)).size).toBe(3);
    // Within a source, the newest article comes first.
    const titles = page.map((c) => c.title);
    for (const letter of ["A", "B", "C"]) {
      const own = titles.filter((t) => t.startsWith(letter));
      expect(own).toEqual([...own].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))));
    }
  });

  it("keeps the pattern across pages when the client passes held ids as `exclude`", async () => {
    const user = await createUser();
    created.users.push(user.id);
    const topic = await createTopic([6, 6, 6]);
    created.topics.push(topic.topicId);
    await subscribe(user.id, topic.topicId);

    const first = await getFeedPage(user.id, { limit: 6 });
    const second = await getFeedPage(user.id, { limit: 6, exclude: first.map((c) => c.id) });
    const all = [...first, ...second];
    expect(new Set(all.map((c) => c.id)).size).toBe(12);
    for (let i = 0; i < 12; i += 3) expect(new Set(all.slice(i, i + 3).map((c) => c.source)).size).toBe(3);
  });

  it("round-robins between topics too", async () => {
    const user = await createUser();
    created.users.push(user.id);
    const big = await createTopic([5, 5, 5, 5]);
    const small = await createTopic([5]);
    created.topics.push(big.topicId, small.topicId);
    await subscribe(user.id, big.topicId);
    await subscribe(user.id, small.topicId);

    const page = await getFeedPage(user.id, { limit: 6 });
    const smallCount = page.filter((c) => c.topic.id === small.topicId).length;
    expect(smallCount).toBe(3); // alternating topic by topic, not proportional to source count
  });

  it("never shows an article again once it was viewed/dismissed", async () => {
    const user = await createUser();
    created.users.push(user.id);
    const topic = await createTopic([4, 4]);
    created.topics.push(topic.topicId);
    await subscribe(user.id, topic.topicId);

    const first = await getFeedPage(user.id, { limit: 4 });
    await markSeen(user.id, first.map((c) => c.id));
    await markSeen(user.id, first.map((c) => c.id)); // idempotent
    const next = await getFeedPage(user.id, { limit: 20 });
    expect(next).toHaveLength(4);
    expect(next.some((c) => first.some((f) => f.id === c.id))).toBe(false);

    await markSeen(user.id, next.map((c) => c.id));
    expect(await getFeedPage(user.id, { limit: 20 })).toHaveLength(0);
  });

  it("does not hide articles from other users and only serves subscribed topics", async () => {
    const [alice, bob] = [await createUser("alice"), await createUser("bob")];
    created.users.push(alice.id, bob.id);
    const a = await createTopic([3, 3]);
    const b = await createTopic([3, 3]);
    created.topics.push(a.topicId, b.topicId);
    await subscribe(alice.id, a.topicId);
    await subscribe(bob.id, a.topicId);
    await subscribe(bob.id, b.topicId);

    const aliceFeed = await getFeedPage(alice.id, { limit: 20 });
    expect(aliceFeed.every((c) => c.topic.id === a.topicId)).toBe(true);
    await markSeen(alice.id, aliceFeed.map((c) => c.id));

    const bobFeed = await getFeedPage(bob.id, { limit: 20 });
    expect(bobFeed).toHaveLength(12);
    expect(await getFeedPage(bob.id, { limit: 20, topic: b.topicId })).toHaveLength(6);
  });
});

describe.skipIf(!hasDb)("libraries and highlights are isolated per user", () => {
  it("keeps saved / read-later / highlights private", async () => {
    const [alice, bob] = [await createUser("alice"), await createUser("bob")];
    created.users.push(alice.id, bob.id);
    const topic = await createTopic([3]);
    created.topics.push(topic.topicId);
    const [a1, a2, a3] = topic.articleIds[0];

    await setArticleState(alice.id, a1, { readLater: true });
    await setArticleState(alice.id, a2, { saved: true });
    await setArticleState(alice.id, a3, { saved: true, readLater: true });
    await setArticleState(alice.id, a3, { readLater: false });

    const later = await listLibrary(alice.id, "read-later");
    const saved = await listLibrary(alice.id, "saved");
    expect(later.items.map((i) => i.id)).toEqual([a1]);
    expect(saved.items.map((i) => i.id).sort()).toEqual([a2, a3].sort());
    expect((await listLibrary(bob.id, "saved")).items).toHaveLength(0);
    expect((await listLibrary(bob.id, "read-later")).items).toHaveLength(0);

    // Saved articles that were swiped into libraries are also excluded from the feed.
    await subscribe(alice.id, topic.topicId);
    expect(await getFeedPage(alice.id, { limit: 10 })).toHaveLength(0);

    const made = await createHighlight(alice.id, { articleId: a1, text: "hello", note: "my note", color: "yellow", startOffset: 0, endOffset: 5 });
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    expect((await createHighlight(alice.id, { articleId: a1, text: "ell", color: "green", startOffset: 1, endOffset: 4 })).ok).toBe(false);

    // Highlights live independently from the saved library: a1 is only in read-later.
    expect((await getVault(alice.id)).map((g) => g.article.id)).toEqual([a1]);
    expect(await getVault(bob.id)).toHaveLength(0);
    expect((await getReaderArticle(bob.id, a1))?.highlights).toHaveLength(0);
    expect((await getReaderArticle(alice.id, a1))?.highlights).toHaveLength(1);

    // Bob cannot edit or delete Alice's highlight.
    expect(await updateHighlight(bob.id, made.highlight.id, { note: "pwned" })).toBeNull();
    expect(await deleteHighlight(bob.id, made.highlight.id)).toBe(false);
    expect((await updateHighlight(alice.id, made.highlight.id, { note: "edited", color: "blue" }))?.note).toBe("edited");

    // Searching the vault
    expect(await getVault(alice.id, "edited")).toHaveLength(1);
    expect(await getVault(alice.id, "zzz-nothing")).toHaveLength(0);
    expect(await deleteHighlight(alice.id, made.highlight.id)).toBe(true);
    expect(await db.select().from(highlights).where(eq(highlights.userId, alice.id))).toHaveLength(0);
  });
});
