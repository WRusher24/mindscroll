import "./env";
import Parser from "rss-parser";
import { CATALOG } from "../lib/catalog";
import { mapLimit } from "../lib/ingest";
import { safeFetchText } from "../lib/net";

/** Audits every feed in the catalog (no database needed): `npm run feeds:check` */
async function main() {
  const parser = new Parser();
  const all = CATALOG.flatMap((t) => t.feeds.map((f) => ({ topic: t.id, ...f })));
  const results = await mapLimit(all, 8, async (feed) => {
    try {
      const { text } = await safeFetchText(feed.url, { timeoutMs: 15000, accept: "application/rss+xml,application/atom+xml,application/xml,text/xml,*/*" });
      const parsed = await parser.parseString(text);
      return { ...feed, ok: parsed.items.length > 0, detail: `${parsed.items.length} items` };
    } catch (error) {
      return { ...feed, ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  });
  for (const r of results) console.log(`${r.ok ? "✔" : "✖"} ${r.topic.padEnd(24)} ${r.name.padEnd(38)} ${r.detail}`);
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} feeds healthy`);
  process.exit(bad.length ? 1 : 0);
}

main();
