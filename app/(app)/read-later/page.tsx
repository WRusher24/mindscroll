import type { Metadata } from "next";
import { LibraryView } from "@/components/LibraryView";
import { PageShell } from "@/components/PageShell";
import { requireUser } from "@/lib/auth";
import { listLibrary } from "@/lib/feed";

export const metadata: Metadata = { title: "Read Later" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const { items, hasMore } = await listLibrary(user.id, "read-later");
  return (
    <PageShell title="Read Later" subtitle="Your queue of swiped articles, ready when you are.">
      <LibraryView kind="read-later" initialItems={items} initialHasMore={hasMore} />
    </PageShell>
  );
}
