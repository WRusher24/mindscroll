import { AppShell } from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { ArticleStoreProvider } from "@/lib/client/articleStore";
import { ReaderProvider } from "@/lib/client/readerContext";
import { ToastProvider } from "@/lib/client/toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <ToastProvider>
      <ArticleStoreProvider>
        <ReaderProvider initialPrefs={user.readerPrefs}>
          <AppShell user={{ name: user.name, email: user.email }}>{children}</AppShell>
        </ReaderProvider>
      </ArticleStoreProvider>
    </ToastProvider>
  );
}
