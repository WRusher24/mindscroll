"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Clock, Compass, Highlighter, LogOut, Rows3, Settings } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { Logo } from "./Logo";

const NAV = [
  { href: "/feed", label: "Feed", icon: Rows3 },
  { href: "/read-later", label: "Read Later", icon: Clock },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/vault", label: "Highlights", icon: Highlighter },
  { href: "/topics", label: "Topics", icon: Compass },
] as const;

export function AppShell({ user, children }: { user: { name: string; email: string }; children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="flex h-dvh overflow-hidden bg-zinc-950">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-zinc-950 px-4 py-6 md:flex">
        <Link href="/feed" className="mb-8 px-2">
          <Logo />
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
                isActive(href) ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/5 pt-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </div>
          <div className="flex gap-1">
            <Link
              href="/settings"
              className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            >
              <Settings className="size-4" aria-hidden /> Settings
            </Link>
            <form action={logoutAction}>
              <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-100" aria-label="Sign out">
                <LogOut className="size-4" aria-hidden />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="min-h-0 flex-1">{children}</main>
        <nav className="pb-safe shrink-0 border-t border-white/10 bg-zinc-950/95 backdrop-blur md:hidden" aria-label="Main">
          <ul className="grid grid-cols-5">
            {NAV.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive(href) ? "text-white" : "text-zinc-500"}`}
                >
                  <Icon className={`size-[22px] ${isActive(href) ? "text-indigo-300" : ""}`} aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
