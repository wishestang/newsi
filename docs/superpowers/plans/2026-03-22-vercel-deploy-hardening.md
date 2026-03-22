# Vercel Deploy Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Newsi repository directly deployable to Vercel Hobby by adding explicit deploy scripts, production-facing README guidance, and clear platform constraints without changing product behavior.

**Architecture:** Keep the work limited to deployment scaffolding and documentation. Add explicit Prisma generate/migrate/build scripts in `package.json`, preserve the existing daily cron model in `vercel.json`, and expand `README.md` into a complete deployment runbook covering database, OAuth, secrets, build command, and post-deploy validation.

**Tech Stack:** Next.js 16 App Router, Prisma 7, PostgreSQL, Auth.js / NextAuth, Vercel, pnpm, README-based ops documentation.

---

## File Map

**Modify**
- `package.json`
  - Add deploy-oriented scripts for Prisma generation, production migration, and Vercel build execution.
- `README.md`
  - Add a dedicated Vercel deployment section and production setup checklist.

**Reference only**
- `vercel.json`
  - Keep the current daily cron schedule unchanged.
- `.nvmrc`
  - Reuse the existing Node version guidance in the new deployment docs.

### Task 1: Lock the Desired Deploy Scripts in `package.json`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the deploy scripts in the scripts block**

Add these entries:

```json
"db:generate": "prisma generate",
"db:migrate:deploy": "prisma migrate deploy",
"vercel-build": "pnpm db:generate && pnpm db:migrate:deploy && next build"
```

Keep the existing `build` script untouched so local developer workflows do not change unexpectedly.

- [ ] **Step 2: Validate the JSON structure**

Run:

```bash
pnpm exec node -e "const p=require('./package.json'); console.log(p.scripts['vercel-build'])"
```

Expected output:

```text
pnpm db:generate && pnpm db:migrate:deploy && next build
```

- [ ] **Step 3: Run the Prisma generate script**

Run:

```bash
pnpm db:generate
```

Expected: Prisma Client generation succeeds.

- [ ] **Step 4: Run the migrate deploy script**

Run:

```bash
pnpm db:migrate:deploy
```

Expected: the command succeeds in a correctly configured environment, or reproduces only the already-documented local environment limitation if the current Node runtime is unsupported.

- [ ] **Step 5: Commit the deploy scripts**

```bash
git add package.json
git commit -m "chore: add Vercel deploy scripts"
```

### Task 2: Expand README Into a Production Deployment Runbook

**Files:**
- Modify: `README.md`
- Reference: `package.json`, `vercel.json`, `.nvmrc`

- [ ] **Step 1: Add a `Deploy to Vercel` section**

Document:
- recommended platform: Vercel
- recommended database: managed PostgreSQL
- Vercel Build Command:

```bash
pnpm vercel-build
```

- [ ] **Step 2: Add a production environment variable checklist**

Document the required production variables:

```bash
DATABASE_URL
AUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
CRON_SECRET
LLM_PROVIDER
LLM_API_KEY
GEMINI_API_KEY
LLM_MODEL
APP_URL
```

Clarify that `APP_URL` must match the deployed origin.

- [ ] **Step 3: Add the production Google OAuth callback**

Document the callback shape explicitly:

```text
https://<your-domain>/api/auth/callback/google
```

Make clear that both local and production callback URLs should be registered in Google Cloud Console.

- [ ] **Step 4: Add Vercel Hobby cron and Node constraints**

Document:
- the repo currently runs one cron per day via `vercel.json`
- this is aligned with the app’s Beijing-time daily digest model
- cron should be understood as daily batch generation, not precise minute-level scheduling
- Node should match the repo’s supported versions from `.nvmrc` / `package.json`

- [ ] **Step 5: Add post-deploy verification steps**

Document a minimal smoke checklist:
- visit `/signin`
- verify Google sign-in
- create Topics
- preview and confirm
- verify `/today`
- verify `/history`
- verify cron route execution through Vercel logs or a manual authenticated request

- [ ] **Step 6: Add a production security reminder**

Document that any previously exposed development or conversational secrets must be rotated before launch, especially:
- Google OAuth client secret
- Gemini / OpenAI API key
- `AUTH_SECRET`
- `CRON_SECRET`

- [ ] **Step 7: Commit the deployment docs**

```bash
git add README.md
git commit -m "docs: add Vercel deployment runbook"
```

### Task 3: Verify the Repository Is Deployment-Ready

**Files:**
- Verify only

- [ ] **Step 1: Run the new Vercel build command**

Run:

```bash
pnpm vercel-build
```

Expected:
- success in a correctly supported local environment, or
- a reproducible known limitation already called out in the README if the current environment blocks Prisma or Next build behavior

Do not hide failures. If the current environment cannot complete this command, record the exact reason in the final report.

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm exec eslint .
```

Expected: PASS, or only previously accepted warnings that are explicitly called out.

- [ ] **Step 4: Run unit and integration tests**

Run:

```bash
pnpm exec vitest run
```

Expected: PASS.

- [ ] **Step 5: Run the smoke e2e**

Run:

```bash
pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit any final doc or script corrections required by verification**

```bash
git add package.json README.md
git commit -m "test: verify Vercel deployment setup"
```
