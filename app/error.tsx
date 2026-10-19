"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="max-w-sm text-zinc-400">An unexpected error occurred. Please try again; if it keeps happening, check the server logs.</p>
      <button onClick={reset} className="rounded-xl bg-indigo-500 px-5 py-3 font-semibold text-white">
        Try again
      </button>
    </main>
  );
}
