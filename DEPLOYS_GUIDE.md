# MindScroll — Deployment Guide

This guide takes you from a fresh clone to a running production deployment on **Vercel** with a **Neon PostgreSQL** database. It also covers local development, scheduled article fetching, and day-two operations.

---

## 1. What you are deploying

| Piece | Technology |
| --- | --- |
| Web app + API | Next.js (App Router), React, Tailwind CSS |
| Database | PostgreSQL (Neon in production), accessed with Drizzle ORM |
| Authentication | Email + password (bcrypt), database-backed sessions in an `httpOnly` cookie |
| Feed ingestion | `/api/cron/ingest` — fetches every active RSS/Atom feed, extracts readable text |
| Scheduling | Vercel Cron (daily backstop) and/or the included GitHub Actions workflow (every 30 min) |

**Requirements:** Node.js 20.9 or newer (22 recommended), npm, a GitHub account, a Vercel account, a Neon account.

---

## 2. Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string. On Neon use the **pooled** string (host contains `-pooler`). |
| `AUTH_SECRET` | yes | Random string of at least 32 characters, used to hash session tokens. Generate: `openssl rand -base64 48`. |
| `CRON_SECRET` | yes | Random string protecting `/api/cron/ingest`. Generate: `openssl rand -hex 32`. |

> Changing `AUTH_SECRET` signs every user out. Keep it stable once you have users.

---

## 3. Run locally

```bash
git clone https://github.com/WRusher24/mindscroll.git
cd mindscroll
npm install
cp .env.example .env.local     # then edit the values (read by Next.js and by the npm scripts)
```

Start a local PostgreSQL (any of these works):

```bash
docker compose up -d           # uses docker-compose.yml, matches the default DATABASE_URL
# ...or point DATABASE_URL at a free Neon branch
```

Create the schema, seed the topic directory, fetch the first articles, and start the app:

```bash
npm run db:setup               # runs migrations, then seeds 14 topics / ~75 curated feeds (idempotent)
npm run ingest                 # fetches all feeds once (add --force to ignore the re-fetch interval)
npm run dev                    # http://localhost:3000
```

Useful scripts:

| Command | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development / production build / production server |
| `npm test` | Unit + integration tests (the database tests need `DATABASE_URL`; they are skipped otherwise) |
| `npm run lint` / `typecheck` | ESLint / TypeScript |
| `npm run db:generate` | Generate a new SQL migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` / `db:seed` | Apply migrations / re-seed topics and feeds |
| `npm run ingest` | Run the feed fetcher from your terminal |
| `npm run feeds:check` | Audit every catalog feed URL (no database required) |

---

## 4. Create the Neon database

1. Sign in at <https://console.neon.tech> and **Create project** (choose the region closest to your Vercel region).
2. Open the project **Dashboard → Connect**. Choose your branch and database, and enable **Connection pooling**.
3. Copy the connection string. It looks like:
   `postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require`
4. Keep it for the next section. (Neon's `channel_binding=require` parameter, if present, is handled automatically.)

Tip: create a separate Neon **branch** for Preview deployments so previews never touch production data.

---

## 5. Connect GitHub to Vercel

1. Push the repository to GitHub (already done if you are reading this on GitHub).
2. Go to <https://vercel.com/new> and **Import** the `mindscroll` repository. The Next.js framework is detected automatically; leave the build settings at their defaults.
3. Expand **Environment Variables** and add `DATABASE_URL`, `AUTH_SECRET` and `CRON_SECRET` from section 2 (apply them to Production, and Preview if you use a preview database).
4. Click **Deploy**.

What happens during the build: Vercel runs the `vercel-build` script, which executes, in order,

1. `tsx scripts/migrate.ts` — applies pending SQL migrations from `drizzle/`,
2. `tsx scripts/seed.ts` — upserts the topic directory and feed catalog (safe to repeat),
3. `next build`.

So every deploy automatically brings the database schema up to date. If you prefer to run migrations manually, change the project's **Build Command** to `next build` and run `npm run db:migrate` yourself.

### Alternative: Vercel ↔ Neon integration

In the Vercel project, open **Storage → Neon (Marketplace)** and connect or create a database. Make sure the variable named `DATABASE_URL` exists (add it as an alias of the pooled `POSTGRES_URL`-style variable if the integration names it differently).

---

## 6. Fetch the first articles

A brand-new deployment has topics but no articles yet. Trigger the first fetch right away instead of waiting for the schedule:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://YOUR-APP.vercel.app/api/cron/ingest?force=1"
```

The response lists how many feeds were processed, how many articles were added, and any feed errors. Alternatively run `npm run ingest` locally with your production `DATABASE_URL` in `.env`.

When a user picks a topic that has no articles yet, the app also fetches that topic's feeds in the background immediately.

---

## 7. Automatic periodic fetching

Two complementary mechanisms are included.

### Vercel Cron (built in)

`vercel.json` registers a daily run of `/api/cron/ingest` (05:00 UTC). Vercel automatically sends `Authorization: Bearer $CRON_SECRET` when the `CRON_SECRET` environment variable is set. Vercel limits how often cron jobs may run on the free Hobby plan (at the time of writing, once per day); on a paid plan you may edit the schedule, for example hourly:

```json
{ "crons": [{ "path": "/api/cron/ingest", "schedule": "0 * * * *" }] }
```

### GitHub Actions (every 30 minutes, free)

`.github/workflows/ingest.yml` calls the same endpoint every 30 minutes. In your GitHub repository open **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
| --- | --- |
| `APP_URL` | `https://YOUR-APP.vercel.app` (no trailing slash needed) |
| `CRON_SECRET` | the same value as in Vercel |

You can also start it manually from the **Actions** tab (**Fetch new articles → Run workflow**).

### How a fetch run behaves

* Feeds are processed oldest-fetched first, six in parallel, within a 50-second budget; whatever does not fit is picked up on the next run.
* A feed is skipped if it was fetched in the last 25 minutes (`?force=1` overrides this).
* New articles are stored with a teaser, tags, image and reading time. Full readable text comes from the feed when it is included, otherwise it is extracted from the article page (also on demand when someone opens the article).
* A feed that fails five times in a row is retried only once a day until it recovers.
* Housekeeping: articles older than 120 days that nobody saved, queued, or highlighted are deleted, as are expired sessions.

---

## 8. Production checklist

- [ ] `AUTH_SECRET` and `CRON_SECRET` are long random values, unique to production.
- [ ] `DATABASE_URL` uses the **pooled** Neon endpoint.
- [ ] First ingestion run returned `feedsProcessed > 0` (section 6).
- [ ] Scheduled fetching is active (Vercel Cron and/or the GitHub workflow).
- [ ] Custom domain attached in Vercel (**Settings → Domains**); HTTPS is automatic.
- [ ] Neon point-in-time restore / backups reviewed for your plan.
- [ ] Run `npm run feeds:check` and replace feeds that report errors (section 9).
- [ ] Create a test account, pick topics, and walk through [USER_GUIDE.md](./USER_GUIDE.md).

Security measures already in place: bcrypt password hashing; hashed, revocable server-side sessions; `httpOnly` + `SameSite=Lax` + `Secure` cookies; same-origin enforcement on all state-changing API calls; Postgres-backed rate limiting on sign-in and sign-up; every user-data query scoped by the authenticated user id; sanitized article HTML; SSRF-guarded fetching of remote feeds and pages (public hosts only, redirects re-checked); a strict Content-Security-Policy and standard security headers.

---

## 9. Operations

**Add or change feeds and topics.** Edit `lib/catalog.ts` and deploy; the seed step upserts them. To retire a feed without deleting history, set it inactive:

```sql
update feeds set active = false where url = 'https://example.com/feed.xml';
```

**Change the schema.** Edit `lib/db/schema.ts`, run `npm run db:generate`, commit the generated SQL in `drizzle/`, and deploy (migrations run during the build).

**Inspect ingestion health.**

```sql
select name, consecutive_failures, last_error, last_success_at
from feeds where consecutive_failures > 0 order by consecutive_failures desc;
```

**Delete a user's data.** Users can delete their own account in **Settings**. All their data is removed by cascading deletes.

---

## 10. Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Build fails with `DATABASE_URL is not set` | The variable is missing in the Vercel project (or not enabled for this environment). |
| Build fails during migration with a connection/handshake error | Check the connection string is complete and includes `sslmode=require`; make sure the Neon project is not suspended or deleted. |
| Everyone is signed out after a deploy | `AUTH_SECRET` changed. Restore the previous value. |
| Sign-in works locally but not in production | `AUTH_SECRET` is shorter than 32 characters, or the site is served over plain HTTP (the session cookie is `Secure` in production). |
| Feed is empty ("You're all caught up") on a new deployment | No articles ingested yet — run section 6. Also confirm `CRON_SECRET` matches in Vercel and the caller. |
| `/api/cron/ingest` returns 401 | The `Authorization: Bearer …` header is missing or the secret differs. |
| Many feed failures in the cron response | Outbound network blocked, or publishers changed their feed URLs. Run `npm run feeds:check` and update `lib/catalog.ts`. |
| Reader shows "couldn't extract a clean version" | The publisher blocks automated readers or uses a paywall. The original-article link is offered instead. |
