import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-400">Pick up your feed right where you left off.</p>
      <AuthForm mode="login" />
    </>
  );
}
