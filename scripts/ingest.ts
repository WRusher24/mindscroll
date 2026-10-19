import "./env";
import { getClient } from "../lib/db";
import { ingestAll, pruneStaleData } from "../lib/ingest";

/** Manual ingestion run: `npm run ingest` (add --force to ignore the re-fetch interval). */
async function main() {
  const force = process.argv.includes("--force");
  const summary = await ingestAll({ budgetMs: 10 * 60_000, force, enrichLimit: 150 });
  for (const r of summary.results) console.log(`${r.error ? "✖" : "✔"} ${r.feed.padEnd(36)} +${r.inserted}${r.error ? `  (${r.error})` : ""}`);
  console.log(`\n${summary.feedsProcessed} feeds, ${summary.inserted} new articles, ${summary.enriched} fully extracted, ${summary.failures} failures`);
  console.log(await pruneStaleData());
  await getClient().end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
