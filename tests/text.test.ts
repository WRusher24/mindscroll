import { describe, expect, it } from "vitest";
import { cleanTags, countWords, hashUrl, makeTeaser, normalizeUrl, readingMinutes, stripHtml } from "@/lib/text";

describe("text utilities", () => {
  it("strips HTML and decodes entities", () => {
    expect(stripHtml("<p>Tom &amp; Jerry&#8217;s <b>big</b> day</p><script>alert(1)</script>")).toBe("Tom & Jerry’s big day.");
  });

  it("builds a teaser of at most three sentences", () => {
    const teaser = makeTeaser("<p>One is here. Two follows it. Three arrives too. Four should not appear. Five neither.</p>");
    expect(teaser).toBe("One is here. Two follows it. Three arrives too.");
  });

  it("removes feed boilerplate such as 'appeared first on'", () => {
    const teaser = makeTeaser("Real insight lives in this sentence. The post Why X matters appeared first on Some Blog.");
    expect(teaser).toBe("Real insight lives in this sentence.");
  });

  it("truncates very long sentences on a word boundary with an ellipsis", () => {
    const teaser = makeTeaser(`${"word ".repeat(200)}end.`, 120);
    expect(teaser.length).toBeLessThanOrEqual(121);
    expect(teaser.endsWith("…")).toBe(true);
    expect(teaser.slice(0, -1).endsWith(" ")).toBe(false);
  });

  it("estimates reading time (min 1 minute)", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(230)).toBe(1);
    expect(readingMinutes(690)).toBe(3);
    expect(countWords("  a  b   c ")).toBe(3);
  });

  it("normalizes URLs so the same article is never ingested twice", () => {
    const a = normalizeUrl("https://Example.com/post/?utm_source=x&b=2&a=1#section");
    const b = normalizeUrl("https://example.com/post?a=1&b=2&fbclid=abc");
    expect(a).toBe("https://example.com/post?a=1&b=2");
    expect(a).toBe(b);
    expect(hashUrl(a!)).toBe(hashUrl(b!));
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });

  it("cleans tags: dedupes, drops noise, limits count and length", () => {
    expect(cleanTags(["News", "AI", "ai", "Machine Learning", "x", "123", { _: "Ethics" }, "Robotics"])).toEqual(["AI", "Machine Learning", "Ethics"]);
    expect(cleanTags(["a very very very long category name here"])).toEqual([]);
  });
});
