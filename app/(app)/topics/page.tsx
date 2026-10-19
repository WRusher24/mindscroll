import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { TopicPicker } from "@/components/TopicPicker";
import { requireUser } from "@/lib/auth";
import { listTopicsForUser } from "@/lib/topics";

export const metadata: Metadata = { title: "Topics" };
export const dynamic = "force-dynamic";

export default async function TopicsPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser();
  const welcome = (await searchParams).welcome === "1";
  const topics = await listTopicsForUser(user.id);
  return (
    <PageShell
      title={welcome ? `Welcome, ${user.name.split(" ")[0]} 👋` : "Topics"}
      subtitle={welcome ? "What do you want to learn about? Choose a few — you can change this any time." : "Choose what appears in your feed. Each topic blends articles from several independent sources."}
    >
      <TopicPicker topics={topics} welcome={welcome} />
    </PageShell>
  );
}
