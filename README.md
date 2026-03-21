# Newsi

Newsi is an editorial-style web app for personal knowledge workers. A user writes one standing brief in natural language, and Newsi generates one in-app daily synthesis around that brief instead of relying on recommendation feeds.

## Stack

- Next.js App Router
- Auth.js with Google OAuth
- Prisma + PostgreSQL
- OpenAI-backed digest generation
- Vitest + React Testing Library
- Playwright

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
DATABASE_URL=""
AUTH_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
CRON_SECRET=""
LLM_API_KEY=""
LLM_MODEL="gpt-5.4"
APP_URL="http://localhost:3000"
```

Notes:

- `DATABASE_URL` should point to a PostgreSQL database.
- `AUTH_SECRET` can be generated with `openssl rand -base64 32`.
- `APP_URL` must match the origin used in your browser and OAuth callback config.
- If `DATABASE_URL` or Google OAuth env vars are missing, Newsi falls back to local preview mode for UI work.
- In preview mode, `/signin` exposes an `Open preview` link so the app can be explored without OAuth.

## Local Database Setup

Apply the checked-in migration:

```bash
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

To validate the schema without applying changes:

```bash
pnpm exec prisma validate
```

## Google OAuth Setup

Create a Google OAuth web application and add this callback URL:

```text
http://localhost:3000/api/auth/callback/google
```

For a deployed environment, add the production callback URL with the same path on your real domain.

## Run the App

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful routes:

- `/signin`
- `/topics`
- `/today`
- `/archive`

## Preview Mode

When auth or persistence is not configured, Newsi runs in a local preview mode:

- `/signin` shows `Open preview`
- `/topics` saves the standing brief to a cookie
- `/today` shows either a scheduled state or a mock ready digest, depending on whether the local day has reached `firstEligibleDigestDayKey`
- `/archive` shows the preview digest row and detail page
- `Clear interests` removes the preview cookie and resets `Today` and `Archive`

## Run Tests

Unit and integration tests:

```bash
pnpm exec vitest run
```

Playwright smoke test:

```bash
pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts
```

Type check:

```bash
pnpm exec tsc --noEmit
```

## Trigger the Cron Route Locally

The digest job expects bearer auth with `CRON_SECRET`:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/digests
```

The route will:

- skip in preview mode if auth or persistence is not configured
- scan all interest profiles
- generate digests only for users whose local time is past the daily 07:00 cutoff
- retry failed digests up to three times for the same `digestDayKey`

## Current MVP Notes

- `Topics` stores one standing interest brief per user.
- `Today` shows the current digest state or the ready digest for the user’s local day.
- `Archive` keeps historical rows and links to detail pages, including non-ready states.
- Preview mode now simulates both scheduled and ready digest states so the reading surfaces can be validated without live auth, database, or provider credentials.
- Digest generation uses OpenAI structured outputs plus web search. Missing `LLM_API_KEY` will cause the cron route to fail generation attempts with a clear configuration error.
