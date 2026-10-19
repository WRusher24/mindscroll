import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h2", "h3", "h4", "h5", "h6",
  "p", "br", "hr", "blockquote", "pre", "code",
  "ul", "ol", "li", "dl", "dt", "dd",
  "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark", "small", "abbr", "cite", "q", "kbd",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
];

function resolveUrl(value: string | undefined, base?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = base ? new URL(value, base) : new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Whitelist sanitizer for article bodies: strips scripts, iframes, forms, ad wrappers, inline styles
 * and classes, resolves relative URLs against `baseUrl`, and leaves only semantic reading markup.
 */
export function sanitizeArticleHtml(html: string, baseUrl?: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading", "referrerpolicy"],
      abbr: ["title"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    transformTags: {
      h1: "h2",
      a: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, href: resolveUrl(attribs.href, baseUrl) ?? "", target: "_blank", rel: "noopener noreferrer nofollow" },
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: { ...attribs, src: resolveUrl(attribs.src, baseUrl) ?? "", loading: "lazy", referrerpolicy: "no-referrer" },
      }),
    },
    exclusiveFilter(frame) {
      if (frame.tag === "img") {
        const w = Number(frame.attribs.width);
        const h = Number(frame.attribs.height);
        return !frame.attribs.src || (w > 0 && w <= 2) || (h > 0 && h <= 2);
      }
      if (frame.tag === "a") return !frame.attribs.href && !frame.text.trim();
      return ["p", "li", "blockquote", "figure", "h2", "h3", "h4", "h5", "h6"].includes(frame.tag) && !frame.text.trim() && !frame.mediaChildren.length;
    },
  }).trim();
}
