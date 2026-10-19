import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Start learning in minutes</h1>
      <p className="mb-6 mt-1 text-sm text-zinc-400">Free account. Your library, highlights and notes stay private to you.</p>
      <AuthForm mode="register" />
    </>
  );
}
