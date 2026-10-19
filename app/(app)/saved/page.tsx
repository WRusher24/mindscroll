import type { Metadata } from "next";
import { LibraryView } from "@/components/LibraryView";
import { PageShell } from "@/components/PageShell";
import { requireUser } from "@/lib/auth";
import { listLibrary } from "@/lib/feed";

export const metadata: Metadata = { title: "Saved" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  const { items, hasMore } = await listLibrary(user.id, "saved");
  return (
    <PageShell title="Saved" subtitle="Articles you decided to keep.">
      <LibraryView kind="saved" initialItems={items} initialHasMore={hasMore} />
    </PageShell>
  );
}
