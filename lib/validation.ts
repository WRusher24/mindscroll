import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(60, "Name is too long"),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Please enter a valid email address")),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address")),
  password: z.string().min(1, "Please enter your password").max(128),
});

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;

export const highlightCreateSchema = z.object({
  articleId: z.uuid(),
  text: z.string().min(1).max(5000),
  note: z.string().trim().max(5000).nullish(),
  color: z.enum(HIGHLIGHT_COLORS).default("yellow"),
  startOffset: z.number().int().min(0),
  endOffset: z.number().int().min(1),
});

export const highlightUpdateSchema = z.object({
  note: z.string().trim().max(5000).nullish(),
  color: z.enum(HIGHLIGHT_COLORS).optional(),
});

export const readerPrefsSchema = z.object({
  theme: z.enum(["oled", "midnight", "sepia", "light", "mint"]),
  fontSize: z.number().int().min(14).max(30),
  lineHeight: z.number().min(1.3).max(2.4),
  fontFamily: z.enum(["serif", "sans"]),
});

export const feedRequestSchema = z.object({
  topic: z.string().max(64).nullish(),
  exclude: z.array(z.uuid()).max(300).default([]),
  limit: z.number().int().min(1).max(20).default(10),
});

export const seenSchema = z.object({ ids: z.array(z.uuid()).min(1).max(100) });
export const topicsSchema = z.object({ topicIds: z.array(z.string().max(64)).max(50) });
