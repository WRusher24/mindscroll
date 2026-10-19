import { describe, expect, it } from "vitest";
import { sanitizeArticleHtml } from "@/lib/sanitize";

describe("article sanitizer", () => {
  it("removes scripts, iframes, event handlers, styles and forms", () => {
    const html = sanitizeArticleHtml(
      `<p onclick="x()" style="color:red" class="ad">Hello</p><script>alert(1)</script><iframe src="https://evil"></iframe><form><input></form><img src="https://a.com/i.png" onerror="alert(1)">`,
    );
    expect(html).not.toMatch(/script|iframe|onclick|onerror|style=|class=|<form|<input/i);
    expect(html).toContain("<p>Hello</p>");
    expect(html).toContain('src="https://a.com/i.png"');
  });

  it("blocks javascript: and data: URLs", () => {
    const html = sanitizeArticleHtml(`<a href="javascript:alert(1)">bad</a><a href="https://ok.com/x">good</a><img src="data:image/png;base64,AAAA">`);
    expect(html).not.toMatch(/javascript:|data:/);
    expect(html).toContain('href="https://ok.com/x"');
  });

  it("hardens links and lazy-loads images", () => {
    const html = sanitizeArticleHtml(`<a href="/about">About</a><img src="/pic.jpg">`, "https://site.com/post/1");
    expect(html).toContain('href="https://site.com/about"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('src="https://site.com/pic.jpg"');
    expect(html).toContain('loading="lazy"');
  });

  it("drops tracking pixels and empty blocks, demotes h1 to h2", () => {
    const html = sanitizeArticleHtml(`<h1>Title</h1><p>   </p><img src="https://t.com/p.gif" width="1" height="1"><p>Text</p>`);
    expect(html).toBe("<h2>Title</h2><p>Text</p>");
  });
});
