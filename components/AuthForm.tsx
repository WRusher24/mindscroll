"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, registerAction, type AuthState } from "@/app/(auth)/actions";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? loginAction : registerAction, undefined);
  const isLogin = mode === "login";

  return (
    <form action={action} className="space-y-4" noValidate>
      {!isLogin && (
        <Field label="Name" name="name" type="text" autoComplete="name" defaultValue={state?.fields?.name} required />
      )}
      <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state?.fields?.email} required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        hint={isLogin ? undefined : "At least 8 characters"}
        required
      />
      {state?.error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-300">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-indigo-500 to-fuchsia-500 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 transition active:scale-[0.99] disabled:opacity-70"
      >
        {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {isLogin ? "Sign in" : "Create account"}
      </button>
      <p className="text-center text-sm text-zinc-400">
        {isLogin ? "New to MindScroll? " : "Already have an account? "}
        <Link href={isLogin ? "/register" : "/login"} className="font-medium text-indigo-300 hover:underline">
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}

function Field({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</span>
      <input
        {...props}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-base text-white placeholder:text-zinc-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
      />
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}
