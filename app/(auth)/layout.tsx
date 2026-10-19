import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSessionUser()) redirect("/feed");
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(99,102,241,0.28),transparent),radial-gradient(40%_40%_at_90%_90%,rgba(217,70,239,0.18),transparent)]" />
      <div className="relative w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo size={40} />
        </Link>
        <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-6 shadow-2xl backdrop-blur sm:p-8">{children}</div>
      </div>
    </main>
  );
}
