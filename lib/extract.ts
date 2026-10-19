import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { safeFetchText } from "./net";
import { sanitizeArticleHtml } from "./sanitize";
import { countWords, stripHtml } from "./text";

export type ExtractedArticle = { html: string; text: string; wordCount: number; image: string | null };

const MIN_WORDS = 120;

function norm(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Removes a leading heading that merely repeats the article title (the reader renders the title itself). */
function dropLeadingTitle(html: string, title: string): string {
  const match = /^\s*<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i.exec(html);
  if (match && norm(stripHtml(match[1])) === norm(title)) return html.slice(match[0].length).trim();
  return html;
}

/** Prepares feed-provided or extracted HTML for the reader: sanitize, de-duplicate title, count words. */
export function prepareContent(rawHtml: string, baseUrl: string, title: string): Omit<ExtractedArticle, "image"> {
  const html = dropLeadingTitle(sanitizeArticleHtml(rawHtml, baseUrl), title);
  const text = stripHtml(html);
  return { html, text, wordCount: countWords(text) };
}

/** Downloads an article page and returns distraction-free readable content, or null when none is found. */
export async function extractArticle(url: string, title: string): Promise<ExtractedArticle | null> {
  const { text: page, finalUrl, contentType } = await safeFetchText(url, { timeoutMs: 8000 });
  if (contentType && !/html|xml/i.test(contentType)) return null;

  const { document } = parseHTML(page);
  const image =
    document.querySelector('meta[property="og:image"]')?.getAttribute("content") ??
    document.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ??
    null;

  // linkedom's Document is structurally compatible with what Readability needs.
  const parsed = new Readability(document as unknown as Document, { keepClasses: false, charThreshold: 200 }).parse();
  if (!parsed?.content) return null;

  const prepared = prepareContent(parsed.content, finalUrl, title);
  if (prepared.wordCount < MIN_WORDS) return null;

  let resolvedImage: string | null = null;
  if (image) {
    try {
      const u = new URL(image, finalUrl);
      if (u.protocol === "https:" || u.protocol === "http:") resolvedImage = u.toString();
    } catch {
      resolvedImage = null;
    }
  }
  return { ...prepared, image: resolvedImage };
}
