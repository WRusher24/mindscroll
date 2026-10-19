import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark, Compass, Highlighter, Layers, Palette, Swords } from "lucide-react";
import { Logo } from "@/components/Logo";
import { getSessionUser } from "@/lib/auth";

const FEATURES = [
  { icon: Compass, title: "Pick topics, not feeds", body: "Choose from a curated directory — AI, psychology, history, science, philosophy, economics and more. No RSS URLs to hunt down." },
  { icon: Layers, title: "Balanced by design", body: "Every topic blends several independent publishers in strict rotation, so no single source can take over your feed." },
  { icon: Swords, title: "Swipe, don't doomscroll", body: "Full-screen cards with a hook, tags and reading time. Swipe left to queue for later. Scrolled past? It never comes back." },
  { icon: Palette, title: "A reader you'll love", body: "Tap to expand into a clean, ad-free reader with OLED, sepia, light and mint themes plus size and spacing controls." },
  { icon: Highlighter, title: "Highlights & notes vault", body: "Select any passage to highlight it and add a note. Review everything, grouped by article, in one private place." },
  { icon: Bookmark, title: "Your own private library", body: "Saved articles, a Read Later queue and your highlights — each in its own space, visible only to you." },
];

export default async function Home() {
  if (await getSessionUser()) redirect("/feed");
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_0%,rgba(99,102,241,0.30),transparent),radial-gradient(40%_30%_at_100%_30%,rgba(217,70,239,0.16),transparent)]" />
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2 text-sm font-medium">
          <Link href="/login" className="rounded-xl px-4 py-2 text-zinc-300 hover:bg-white/10">
            Sign in
          </Link>
          <Link href="/register" className="rounded-xl bg-white px-4 py-2 text-zinc-950 hover:bg-zinc-200">
            Get started
          </Link>
        </nav>
      </header>

      <main className="relative mx-auto max-w-5xl px-5 pb-20">
        <section className="py-14 text-center md:py-24">
          <p className="mx-auto mb-5 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-indigo-200">Micro-learning, one swipe at a time</p>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Doomscroll something <span className="bg-linear-to-r from-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">worth remembering.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
            MindScroll turns the best educational writing on the internet into an endless, swipeable feed — with a distraction-free reader, highlights and notes built in.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="w-full rounded-2xl bg-linear-to-r from-indigo-500 to-fuchsia-500 px-8 py-4 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 sm:w-auto">
              Create your free feed
            </Link>
            <Link href="/login" className="w-full rounded-2xl border border-white/15 px-8 py-4 text-base font-semibold hover:bg-white/5 sm:w-auto">
              I already have an account
            </Link>
          </div>
        </section>

        <section aria-label="Features" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6">
              <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="text-lg font-semibold">{title}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
