import { createHash } from "node:crypto";

const WORDS_PER_MINUTE = 230;

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const point = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point < 0x110000 ? String.fromCodePoint(point) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/** Converts HTML to readable plain text (single spaces, no tags, entities decoded). */
export function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, ". ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/\.\s*\.(\s|$)/g, ".$1")
    .trim();
}

const BOILERPLATE = [
  /\bThe post .{1,200}? appeared first on .{1,120}?\.?$/i,
  /\bThe (?:article|story) .{1,200}? appeared first on .{1,120}?\.?$/i,
  /\s*(?:Read|Continue reading|Click here to read|Read more|Learn more)(?: the (?:full|rest of the))?(?: (?:article|story|post))?\s*(?:…|\.\.\.|»|→)?\s*$/i,
  /\[(?:…|\.\.\.|&#8230;|&hellip;)\]\s*$/i,
];

export function makeTeaser(source: string, maxChars = 300): string {
  let text = stripHtml(source);
  for (const pattern of BOILERPLATE) text = text.replace(pattern, "").trim();
  if (!text) return "";

  const sentences = text.split(/(?<=[.!?…])["”’')\]]*\s+(?=["“‘'(\[]?[A-Z0-9])/);
  let teaser = "";
  let count = 0;
  for (const sentence of sentences) {
    const next = teaser ? `${teaser} ${sentence}` : sentence;
    if (teaser && next.length > maxChars) break;
    teaser = next;
    count++;
    if (count >= 3 || teaser.length >= maxChars * 0.7) break;
  }
  if (teaser.length > maxChars) {
    const cut = teaser.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(" ");
    teaser = `${cut.slice(0, lastSpace > maxChars * 0.6 ? lastSpace : maxChars).replace(/[\s,;:–—-]+$/, "")}…`;
  }
  return teaser;
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function readingMinutes(wordCount: number): number {
  return Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
}

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|mc_|ref$|ref_|source$|cmpid|ncid|ito$)/i;

/** Canonicalizes a URL so that the same article is never ingested twice. */
export function normalizeUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.slice(0, -1);
    return url.toString();
  } catch {
    return null;
  }
}

export function hashUrl(normalizedUrl: string): string {
  return createHash("sha1").update(normalizedUrl).digest("hex");
}

export function cleanTags(categories: unknown[], extra: string[] = [], max = 3): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const candidates = [...extra, ...categories.map((c) => (typeof c === "string" ? c : (c as { _?: string })?._ ?? ""))];
  for (const raw of candidates) {
    const tag = decodeEntities(String(raw)).replace(/\s+/g, " ").trim();
    const key = tag.toLowerCase();
    if (!tag || tag.length < 2 || tag.length > 24 || /^\d+$/.test(tag) || seen.has(key)) continue;
    if (/^(uncategorized|news|blog|featured|general|other)$/i.test(tag)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= max) break;
  }
  return result;
}
