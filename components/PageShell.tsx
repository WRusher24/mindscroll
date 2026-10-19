import Link from "next/link";
import { Settings } from "lucide-react";

/** Scrollable page container with a consistent header used by every non-feed screen. */
export function PageShell({ title, subtitle, actions, children }: { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 md:px-8 md:pt-10">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {actions}
            <Link href="/settings" aria-label="Settings" className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white md:hidden">
              <Settings className="size-5" />
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
