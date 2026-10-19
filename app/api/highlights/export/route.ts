import { exportVaultMarkdown } from "@/lib/highlights";
import { authed } from "@/lib/http";

export const GET = authed(async (_req, user) => {
  const markdown = await exportVaultMarkdown(user.id);
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mindscroll-highlights.md"',
      "Cache-Control": "no-store",
    },
  });
});
