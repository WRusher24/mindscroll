import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const USER_AGENT = "Mozilla/5.0 (compatible; MindScrollBot/1.0; +https://mindscroll.app)";

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
    );
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
  }
  return false;
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error(`Unsupported protocol: ${url.protocol}`);
  if (url.username || url.password) throw new Error("Credentials in URL are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("Blocked host");
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error("Blocked address");
    return url;
  }
  const records = await lookup(host, { all: true });
  if (!records.length || records.some((r) => isPrivateAddress(r.address))) throw new Error("Blocked address");
  return url;
}

type SafeFetchOptions = { timeoutMs?: number; maxBytes?: number; accept?: string; maxRedirects?: number };

/**
 * Fetches remote text content with SSRF protection (public hosts only, re-validated on every redirect),
 * a hard timeout and a response-size cap.
 */
export async function safeFetchText(rawUrl: string, opts: SafeFetchOptions = {}): Promise<{ text: string; finalUrl: string; contentType: string }> {
  const { timeoutMs = 10000, maxBytes = 3_000_000, accept = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", maxRedirects = 4 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = rawUrl;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const url = await assertPublicUrl(current);
      const res = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept, "accept-language": "en-US,en;q=0.8" },
      });
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        current = new URL(res.headers.get("location")!, url).toString();
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const contentType = res.headers.get("content-type") ?? "";
      const declared = Number(res.headers.get("content-length") ?? 0);
      if (declared > maxBytes) throw new Error("Response too large");

      const reader = res.body?.getReader();
      if (!reader) return { text: await res.text(), finalUrl: url.toString(), contentType };
      const chunks: Uint8Array[] = [];
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          await reader.cancel();
          throw new Error("Response too large");
        }
        chunks.push(value);
      }
      const charset = /charset=([^;]+)/i.exec(contentType)?.[1]?.trim().toLowerCase() ?? "utf-8";
      let decoder: TextDecoder;
      try {
        decoder = new TextDecoder(charset);
      } catch {
        decoder = new TextDecoder("utf-8");
      }
      return { text: decoder.decode(Buffer.concat(chunks)), finalUrl: url.toString(), contentType };
    }
    throw new Error("Too many redirects");
  } finally {
    clearTimeout(timer);
  }
}
