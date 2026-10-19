import { after } from "next/server";
import { authed, json, parseBody } from "@/lib/http";
import { ingestTopicsIfEmpty } from "@/lib/ingest";
import { setUserTopics } from "@/lib/topics";
import { topicsSchema } from "@/lib/validation";

export const maxDuration = 60;

/** Replaces the caller's topic subscriptions. Topics that have no articles yet are fetched right after responding. */
export const PUT = authed(async (req, user) => {
  const parsed = await parseBody(req, topicsSchema);
  if ("error" in parsed) return parsed.error;
  const topicIds = await setUserTopics(user.id, parsed.data.topicIds);
  after(() => ingestTopicsIfEmpty(topicIds).catch((error) => console.error("Topic warm-up failed", error)));
  return json({ topicIds });
});
