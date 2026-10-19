import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export type ReaderPrefs = {
  theme: "oled" | "midnight" | "sepia" | "light" | "mint";
  fontSize: number;
  lineHeight: number;
  fontFamily: "serif" | "sans";
};

/* ------------------------------ Accounts ------------------------------ */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  readerPrefs: jsonb("reader_prefs").$type<ReaderPrefs>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

/* ------------------------- Shared content catalog ---------------------- */
/* Topics, feeds and articles are public catalog data shared by all users.   */
/* Everything a user does with them lives in the user-scoped tables below.   */

export const topics = pgTable("topics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  emoji: text("emoji").notNull(),
  accent: text("accent").notNull().default("#6366f1"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const feeds = pgTable(
  "feeds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull().unique(),
    siteUrl: text("site_url"),
    active: boolean("active").notNull().default(true),
    lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feeds_topic_idx").on(t.topicId), index("feeds_fetch_idx").on(t.active, t.lastFetchedAt)],
);

export const articles = pgTable(
  "articles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    feedId: uuid("feed_id")
      .notNull()
      .references(() => feeds.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    urlHash: text("url_hash").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    teaser: text("teaser").notNull(),
    author: text("author"),
    imageUrl: text("image_url"),
    tags: text("tags").array().notNull().default([]),
    readingMinutes: integer("reading_minutes").notNull().default(3),
    /** Sanitized, distraction-free article HTML. Null until extracted. */
    contentHtml: text("content_html"),
    contentExtractedAt: timestamp("content_extracted_at", { withTimezone: true }),
    extractionFailed: boolean("extraction_failed").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("articles_url_hash_idx").on(t.urlHash),
    index("articles_feed_pub_idx").on(t.feedId, t.publishedAt),
    index("articles_topic_pub_idx").on(t.topicId, t.publishedAt),
  ],
);

/* ----------------------- Per-user, isolated data ----------------------- */

export const userTopics = pgTable(
  "user_topics",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topicId: text("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.topicId] })],
);

/**
 * One row per (user, article) the user has ever been shown or interacted with.
 * Row existence == "never show this in the feed again" (the dismissal rule).
 * `saved` and `readLater` decide which library the article lives in.
 */
export const userArticles = pgTable(
  "user_articles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
    readLater: boolean("read_later").notNull().default(false),
    readLaterAt: timestamp("read_later_at", { withTimezone: true }),
    saved: boolean("saved").notNull().default(false),
    savedAt: timestamp("saved_at", { withTimezone: true }),
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.articleId] }),
    index("user_articles_read_later_idx").on(t.userId, t.readLater, t.readLaterAt),
    index("user_articles_saved_idx").on(t.userId, t.saved, t.savedAt),
  ],
);

export const highlights = pgTable(
  "highlights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    articleId: uuid("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    note: text("note"),
    color: text("color").notNull().default("yellow"),
    /** Character offsets into the article body's textContent. */
    startOffset: integer("start_offset").notNull(),
    endOffset: integer("end_offset").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("highlights_user_article_idx").on(t.userId, t.articleId),
    index("highlights_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type Feed = typeof feeds.$inferSelect;
export type Article = typeof articles.$inferSelect;
export type Highlight = typeof highlights.$inferSelect;
