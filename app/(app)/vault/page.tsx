import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { VaultView } from "@/components/VaultView";
import { requireUser } from "@/lib/auth";
import { getVault } from "@/lib/highlights";

export const metadata: Metadata = { title: "Highlights & Notes" };
export const dynamic = "force-dynamic";

export default async function VaultPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const q = ((await searchParams).q ?? "").slice(0, 100);
  const groups = await getVault(user.id, q);
  return (
    <PageShell title="Highlights & Notes" subtitle="Everything you've marked, organized by article — independent of what you've saved.">
      <VaultView key={q} initialGroups={groups} query={q} />
    </PageShell>
  );
}
