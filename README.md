# MindScroll

An infinite-scroll **micro-learning** platform. Pick topics from a curated directory, swipe through a balanced feed of educational articles, read them in a distraction-free reader with Moon+ Reader–style themes, and keep highlights and notes in a private vault.

* 📱 Mobile-first TikTok/Reels-style vertical snap feed, fully usable on desktop (keyboard shortcuts included)
* 🧭 Topic directory — no RSS URLs to hunt for
* ⚖️ Balanced interleaving of sources within each topic (A → B → C → A → …), and of topics against each other
* 👆 Swipe a card left (or tap) for **Read Later**; scrolled-past cards never return
* 📖 Full-screen reading mode with OLED / Midnight / Sepia / Light / Mint themes, font size and line-spacing controls
* 🖍️ Highlights with colours and notes; separate **Saved**, **Read Later** and **Highlights & Notes** libraries
* 🔒 Multi-user with fully isolated data

**Docs:** [Deployment guide](./DEPLOYS_GUIDE.md) · [User guide](./USER_GUIDE.md)

## Stack

Next.js (App Router, React 19) · Tailwind CSS 4 · PostgreSQL (Neon) · Drizzle ORM · rss-parser · Mozilla Readability + linkedom · sanitize-html · Vitest

## Quick start

```bash
npm install
cp .env.example .env.local          # fill in DATABASE_URL, AUTH_SECRET, CRON_SECRET
docker compose up -d                # local Postgres (or use a Neon branch)
npm run db:setup                    # migrate + seed topics/feeds
npm run ingest                      # fetch the first articles
npm run dev                         # http://localhost:3000
```

## How it works

```
app/                    Next.js routes: pages (feed, saved, read-later, vault, topics, settings) and /api/*
components/             Feed, card (swipe), reader (themes, highlights), libraries, vault, topic picker
lib/db/schema.ts        Drizzle schema: catalog tables (topics, feeds, articles) + per-user tables
lib/feed.ts             Feed engine: balanced interleaving, dismissal rule, article state, libraries
lib/highlights.ts       Highlights, notes, vault queries and Markdown export
lib/ingest.ts           RSS/Atom ingestion, enrichment, pruning
lib/extract.ts          Readability extraction + sanitization
lib/catalog.ts          The curated topic and feed directory
drizzle/                Generated SQL migrations
scripts/                migrate, seed, ingest, feeds:check
tests/                  Unit and database integration tests
```

**Data isolation.** Topics, feeds and articles are a shared public catalog. Everything personal — topic subscriptions, `user_articles` (seen / read later / saved), and `highlights` — is keyed by `user_id`, and every query in the data layer is scoped by the authenticated user id (covered by integration tests that try to cross the boundary).

**Balanced feed.** For one user, unseen articles from their topics are ranked in SQL: first round-robin across a topic's sources (`row_number()` per feed, with a stable per-user shuffle of source order), then round-robin across topics. Clients pass the ids they already hold as `exclude`, so interleaving is preserved across pages.

**Dismissal rule.** The client reports cards the user has scrolled past; the server stores a `user_articles` row, and the feed query excludes every article with such a row — permanently.

**Highlights.** Anchored by character offsets into the article body's text, so they survive re-rendering and are independent of the saved/read-later state.

## Scripts

`npm run dev | build | start | lint | typecheck | test | db:generate | db:migrate | db:seed | db:setup | ingest | feeds:check`

## License

All rights reserved by the repository owner unless a license file is added.
