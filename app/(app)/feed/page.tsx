import type { Metadata } from "next";
import { FeedView } from "@/components/FeedView";
import { requireUser } from "@/lib/auth";
import { getFeedPage } from "@/lib/feed";
import { listSubscribedTopics } from "@/lib/topics";

export const metadata: Metadata = { title: "Feed" };
export const dynamic = "force-dynamic";

export default async function FeedPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const user = await requireUser();
  const { topic } = await searchParams;
  const topics = await listSubscribedTopics(user.id);
  const activeTopic = topic && topics.some((t) => t.id === topic) ? topic : null;
  const initialItems = topics.length ? await getFeedPage(user.id, { topic: activeTopic, limit: 10 }) : [];
  return <FeedView key={activeTopic ?? "all"} initialItems={initialItems} topics={topics} activeTopic={activeTopic} />;
}
