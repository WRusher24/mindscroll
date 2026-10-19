import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ingestAll, pruneStaleData } from "@/lib/ingest";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/**
 * Scheduled ingestion endpoint. Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`;
 * the GitHub Actions workflow in .github/workflows/ingest.yml does the same at a finer cadence.
 *
 *   ?force=1        ignore the minimum re-fetch interval
 *   ?topic=<id>     only fetch feeds of one topic
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const summary = await ingestAll({ force: params.get("force") === "1", topicId: params.get("topic") ?? undefined });
  const pruned = await pruneStaleData();
  return NextResponse.json({
    feedsProcessed: summary.feedsProcessed,
    inserted: summary.inserted,
    enriched: summary.enriched,
    failures: summary.failures,
    errors: summary.results.filter((r) => r.error).map((r) => ({ feed: r.feed, error: r.error })),
    ...pruned,
  });
}
