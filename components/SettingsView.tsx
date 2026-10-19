"use client";

import { useState } from "react";
import Link from "next/link";
import { Compass, Download, Loader2, LogOut, Trash2 } from "lucide-react";
import { logoutAction } from "@/app/(auth)/actions";
import { api, hardNavigate } from "@/lib/client/api";

export function SettingsView({ user }: { user: { name: string; email: string } }) {
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/account", { method: "DELETE", body: { password } });
      hardNavigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete the account.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Account</h2>
        <p className="mt-3 text-lg font-semibold">{user.name}</p>
        <p className="text-sm text-zinc-400">{user.email}</p>
        <p className="mt-3 text-sm text-zinc-500">Your topics, libraries, highlights and notes belong to this account alone — no one else can see them.</p>
      </section>

      <section className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/60">
        <Link href="/topics" className="flex items-center gap-3 p-4 hover:bg-white/5">
          <Compass className="size-5 text-zinc-400" /> <span className="font-medium">Manage topics</span>
        </Link>
        <a href="/api/highlights/export" download className="flex items-center gap-3 p-4 hover:bg-white/5">
          <Download className="size-5 text-zinc-400" /> <span className="font-medium">Export highlights &amp; notes (Markdown)</span>
        </a>
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-3 p-4 text-left hover:bg-white/5">
            <LogOut className="size-5 text-zinc-400" /> <span className="font-medium">Sign out</span>
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-red-300">Danger zone</h2>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/10">
            <Trash2 className="size-4" /> Delete my account
          </button>
        ) : (
          <form onSubmit={deleteAccount} className="mt-3 space-y-3">
            <p className="text-sm text-zinc-300">This permanently deletes your account, saved articles, read-later queue, highlights and notes. It cannot be undone. Enter your password to confirm.</p>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label="Password"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 focus:border-red-400 focus:outline-none"
            />
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                {busy && <Loader2 className="size-4 animate-spin" />} Permanently delete
              </button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-xl px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/10">
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
