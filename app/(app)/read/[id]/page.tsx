import { notFound } from "next/navigation";
import { z } from "zod";
import { ReaderRoute } from "@/components/ReaderRoute";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  return <ReaderRoute articleId={id} />;
}
