import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { SettingsView } from "@/components/SettingsView";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <PageShell title="Settings" subtitle="Reader appearance is adjusted right inside any article with the T (Aa) button.">
      <SettingsView user={{ name: user.name, email: user.email }} />
    </PageShell>
  );
}
