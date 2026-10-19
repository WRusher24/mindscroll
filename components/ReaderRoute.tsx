"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReader } from "@/lib/client/readerContext";

/** Deep-link entry point (/read/:id): opens the reader immediately and returns to the feed when closed. */
export function ReaderRoute({ articleId }: { articleId: string }) {
  const reader = useReader();
  const router = useRouter();
  useEffect(() => {
    reader.open(articleId, { pushHistory: false, onClosed: () => router.replace("/feed") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);
  return <div className="h-full bg-zinc-950" />;
}
