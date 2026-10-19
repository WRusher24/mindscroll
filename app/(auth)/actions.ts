"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { clientIp, createSession, destroySession, hashPassword, rateLimit, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { loginSchema, registerSchema } from "@/lib/validation";

export type AuthState = { error?: string; fields?: { name?: string; email?: string } } | undefined;

const GENERIC_LOGIN_ERROR = "Incorrect email or password.";

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = { name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") };
  const fields = { name: raw.name, email: raw.email };
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your details.", fields };

  const ip = await clientIp();
  if (!(await rateLimit(`register:${ip}`, 10, 3600))) return { error: "Too many sign-up attempts. Please try again later.", fields };

  const { name, email, password } = parsed.data;
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: "An account with this email already exists. Try signing in instead.", fields };

  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash: await hashPassword(password) })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (!user) return { error: "An account with this email already exists. Try signing in instead.", fields };

  await createSession(user.id);
  redirect("/topics?welcome=1");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const raw = { email: String(formData.get("email") ?? ""), password: String(formData.get("password") ?? "") };
  const fields = { email: raw.email };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? GENERIC_LOGIN_ERROR, fields };

  const ip = await clientIp();
  const { email, password } = parsed.data;
  const allowed = (await rateLimit(`login:ip:${ip}`, 40, 600)) && (await rateLimit(`login:${ip}:${email}`, 8, 600));
  if (!allowed) return { error: "Too many attempts. Please wait a few minutes and try again.", fields };

  const [user] = await db.select({ id: users.id, hash: users.passwordHash }).from(users).where(eq(users.email, email)).limit(1);
  const valid = await verifyPassword(password, user?.hash ?? null);
  if (!user || !valid) return { error: GENERIC_LOGIN_ERROR, fields };

  await createSession(user.id);
  redirect("/feed");
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}
