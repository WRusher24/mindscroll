import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db, getClient } from "@/lib/db";
import { articles, feeds, topics } from "@/lib/db/schema";
import { extractArticle } from "@/lib/extract";
import { extractAndStore, ingestFeed } from "@/lib/ingest";
import { hasDb } from "./helpers";

const fetchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/net", async (orig) => ({ ...(await orig<typeof import("@/lib/net")>()), safeFetchText: fetchMock }));

const longParagraph = "Spaced repetition and retrieval practice help knowledge stick far longer than rereading, which is why deliberate recall beats passive review. ";
const articleHtml = (words: number) => `<p>${longParagraph.repeat(Math.ceil(words / 20))}</p>`;
const pageHtml = `<!doctype html><html><head><title>T</title><meta property="og:image" content="/hero.jpg"></head><body>
  <nav><a href="/">Home</a><a href="/ads">Advertisement</a></nav>
  <article><h1>Deep Learning for Humans</h1>${Array.from({ length: 8 }, (_, i) => `<p>Paragraph ${i}. ${longParagraph.repeat(3)}</p>`).join("")}
  <img src="/inline.jpg" alt="inline"></article>
  <div class="ad"><script>track()</script>Buy now!</div><footer>Copyright junk</footer></body></html>`;

const rss = (items: string) => `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Test</title>${items}</channel></rss>`;
const recent = new Date(Date.now() - 3600_000).toUTCString();
const ancient = new Date(Date.now() - 400 * 86_400_000).toUTCString();

describe("extraction (mocked network)", () => {
  it("pulls the readable article out of a cluttered page and drops chrome", async () => {
    fetchMock.mockResolvedValueOnce({ text: pageHtml, finalUrl: "https://site.test/post", contentType: "text/html" });
    const result = await extractArticle("https://site.test/post", "Deep Learning for Humans");
    expect(result).not.toBeNull();
    expect(result!.wordCount).toBeGreaterThan(120);
    expect(result!.html).toContain("Paragraph 3");
    expect(result!.html).not.toMatch(/Buy now|Copyright junk|track\(\)|<h2>Deep Learning for Humans/);
    expect(result!.html).toContain("https://site.test/inline.jpg");
    expect(result!.image).toBe("https://site.test/hero.jpg");
  });

  it("returns null for thin pages (paywalls, redirects)", async () => {
    fetchMock.mockResolvedValueOnce({ text: "<html><body><p>Subscribe to read.</p></body></html>", finalUrl: "https://site.test/x", contentType: "text/html" });
    expect(await extractArticle("https://site.test/x", "X")).toBeNull();
  });
});

describe.skipIf(!hasDb)("feed ingestion (mocked network, real database)", () => {
  const topicId = `ing-${Date.now()}`;
  let feedId = "";
  beforeAll(async () => {
    await db.insert(topics).values({ id: topicId, name: "Ingest", description: "t", emoji: "🧪" });
    const [feed] = await db.insert(feeds).values({ topicId, name: "Ingest Feed", url: `https://feed.test/${topicId}.xml` }).returning();
    feedId = feed.id;
  });
  afterAll(async () => {
    await db.delete(topics).where(eq(topics.id, topicId));
    await getClient().end();
  });

  it("stores new items with teaser, tags, image and reading time; skips stale and duplicate items; is idempotent", async () => {
    const xml = rss(`
      <item><title>Full text article</title><link>https://site.test/a?utm_source=rss</link><pubDate>${recent}</pubDate>
        <category>Learning</category><category>News</category>
        <description>A short summary of the article. It explains the idea. It also has a third sentence. And a fourth.</description>
        <content:encoded><![CDATA[${articleHtml(700)}<img src="https://img.test/1.jpg">]]></content:encoded>
        <media:thumbnail url="https://img.test/thumb.jpg"/></item>
      <item><title>Excerpt only article</title><link>https://site.test/b</link><pubDate>${recent}</pubDate><description>Only an excerpt exists here. Click through for more.</description></item>
      <item><title>Ancient article</title><link>https://site.test/old</link><pubDate>${ancient}</pubDate><description>Too old to keep around.</description></item>
      <item><title>Duplicate of first</title><link>https://site.test/a</link><pubDate>${recent}</pubDate><description>Same canonical URL as the first item.</description></item>`);
    fetchMock.mockResolvedValue({ text: xml, finalUrl: "https://feed.test", contentType: "application/rss+xml" });

    const [feed] = await db.select().from(feeds).where(eq(feeds.id, feedId));
    const first = await ingestFeed(feed);
    expect(first.error).toBeUndefined();
    expect(first.inserted).toBe(2);

    const rows = await db.select().from(articles).where(eq(articles.feedId, feedId));
    const full = rows.find((r) => r.title === "Full text article")!;
    const excerpt = rows.find((r) => r.title === "Excerpt only article")!;
    expect(full.url).toBe("https://site.test/a");
    expect(full.teaser).toBe("A short summary of the article. It explains the idea. It also has a third sentence.");
    expect(full.tags).toEqual(["Learning"]);
    expect(full.imageUrl).toBe("https://img.test/thumb.jpg");
    expect(full.contentHtml).toContain("Spaced repetition");
    expect(full.readingMinutes).toBeGreaterThanOrEqual(3);
    expect(excerpt.contentHtml).toBeNull();

    const second = await ingestFeed(feed);
    expect(second.inserted).toBe(0);
    const [updated] = await db.select().from(feeds).where(eq(feeds.id, feedId));
    expect(updated.lastSuccessAt).not.toBeNull();
    expect(updated.consecutiveFailures).toBe(0);

    // The excerpt-only article gets its full text lazily (reader open or cron enrichment).
    fetchMock.mockResolvedValueOnce({ text: pageHtml, finalUrl: "https://site.test/b", contentType: "text/html" });
    expect(await extractAndStore(excerpt.id)).toBe(true);
    const [enriched] = await db.select().from(articles).where(eq(articles.id, excerpt.id));
    expect(enriched.contentHtml).toContain("Paragraph 2");
    expect(enriched.readingMinutes).toBeGreaterThanOrEqual(1);
  });

  it("records failures without throwing", async () => {
    fetchMock.mockRejectedValueOnce(new Error("HTTP 503"));
    const [feed] = await db.select().from(feeds).where(eq(feeds.id, feedId));
    const result = await ingestFeed(feed);
    expect(result.error).toBe("HTTP 503");
    const [updated] = await db.select().from(feeds).where(eq(feeds.id, feedId));
    expect(updated.consecutiveFailures).toBe(1);
    expect(updated.lastError).toBe("HTTP 503");
  });
});
