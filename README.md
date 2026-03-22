# Newsi

Newsi is an editorial-style web app for personal knowledge workers. A user writes one standing brief in natural language, and Newsi generates one in-app daily synthesis around that brief instead of relying on recommendation feeds.

## Stack

- Next.js App Router
- Auth.js with Google OAuth
- Prisma + PostgreSQL
- OpenAI or Gemini-backed digest generation
- Vitest + React Testing Library
- Playwright

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
DATABASE_URL="postgresql://newsi:newsi-local@localhost:5432/newsi?schema=public"
AUTH_SECRET=""
AUTH_GOOGLE_ID=""
AUTH_GOOGLE_SECRET=""
CRON_SECRET=""
LLM_PROVIDER="openai"
LLM_API_KEY=""
GEMINI_API_KEY=""
LLM_MODEL="gpt-5.4"
APP_URL="http://localhost:3000"
```

Notes:

- `DATABASE_URL` should point to a PostgreSQL database.
- `AUTH_SECRET` can be generated with `openssl rand -base64 32`.
- `APP_URL` must match the origin used in your browser and OAuth callback config.
- `LLM_PROVIDER` selects the digest provider. Set it to `openai` or `gemini`.
- `LLM_API_KEY` remains the default OpenAI key. For Gemini, `GEMINI_API_KEY` is preferred and `LLM_API_KEY` is used as a fallback if the Gemini key is not set.
- `LLM_MODEL` is shared by both providers when set. Otherwise OpenAI defaults to `gpt-5.4` and Gemini defaults to `gemini-2.5-flash`.
- If `DATABASE_URL` or Google OAuth env vars are missing, Newsi falls back to local preview mode for UI work.
- Set `FORCE_LOCAL_PREVIEW=1` to force preview mode even when auth is configured. This is useful for smoke tests and local UI checks.
- In preview mode, `/signin` exposes an `Open preview` link so the app can be explored without OAuth.

## Local Database Setup

Start the local PostgreSQL container:

```bash
docker compose up -d postgres
```

If that command fails because Docker Desktop or the Docker daemon is not running, start it first and rerun the command.

Then copy `.env.example` to `.env.local` if needed and keep `DATABASE_URL` set to:

```bash
postgresql://newsi:newsi-local@localhost:5432/newsi?schema=public
```

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

## Node Version

Prisma 7 expects a supported Node.js release line. Newsi is pinned to:

- Node `20.19+`
- Node `22.12+`
- Node `24.x`

If you use `nvm`, this repo includes [`.nvmrc`](/Users/bytedance/Documents/newsi/.nvmrc):

```bash
nvm use
```

If `pnpm exec prisma migrate deploy` fails with an empty `Schema engine error`, check `node -v` first. In this workspace, that failure reproduced on Node `25.2.1`; this is an inference based on Prisma's documented supported versions, not a confirmed Prisma upstream bug report.

Useful routes:

- `/signin`
- `/topics`
- `/today`
- `/history`

## Preview Mode

When auth or persistence is not configured, Newsi runs in a local preview mode:

- `/signin` shows `Open preview`
- `/topics` saves the standing brief to a cookie and redirects to `/preview`
- `/preview` shows `Generating`, then a mock digest preview, then requires `Confirm and start daily digests`
- after confirm, `/today` immediately shows the promoted formal digest for today
- `/history` immediately includes that same digest
- `Clear interests` removes the preview cookie and resets `Today` and `History`

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
- generate one formal digest batch after the daily Beijing 07:00 cutoff
- use the Beijing calendar day for formal `Today` and `History` entries
- leave failed digests as `failed` until a future batch or manual rerun creates a later day entry

## Current MVP Notes

- `Topics` stores one standing interest brief per user.
- `Today` shows the current digest state or the ready digest for the current Beijing calendar day.
- `History` keeps historical rows and links to detail pages, including non-ready states.
- Preview mode mirrors the new confirmation flow: `Topics -> /preview -> confirm -> today/history`, promoting the confirmed preview into the formal digest.
- Formal digest generation runs once per day in a single Beijing-time batch at 07:00.
- Digest generation uses OpenAI structured outputs plus web search by default. When `LLM_PROVIDER=gemini`, Newsi uses Gemini through Google's OpenAI compatibility endpoint and structured chat completions. That path does not use web search, so the result may be less grounded in current sources. Missing `LLM_API_KEY` or `GEMINI_API_KEY` will cause the cron route to fail generation attempts with a clear configuration error.
