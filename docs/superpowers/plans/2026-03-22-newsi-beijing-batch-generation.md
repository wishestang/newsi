# Newsi Beijing Batch Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change formal digest scheduling from per-user local 07:00 to one daily batch run at Beijing time 07:00, while preserving preview confirmation promotion into today's formal digest.

**Architecture:** Keep the existing preview-confirmation pipeline intact and only change the formal scheduling semantics. Introduce a small set of Beijing-time scheduling helpers in the timezone module, switch Topics and digest orchestration to those helpers, then update user-facing scheduled copy and deployment cron frequency to match the new once-per-day batch behavior.

**Tech Stack:** Next.js App Router, TypeScript, Auth.js, Prisma + PostgreSQL, Vitest, Playwright, Vercel Cron

---

## File Structure

### Existing files to modify

- `src/lib/timezone.ts`
  - Add fixed Beijing scheduling constants and helpers used by formal digest generation.
- `src/lib/topics/service.ts`
  - Compute `firstEligibleDigestDayKey` from Beijing time instead of user/browser timezone.
- `src/lib/digest/service.ts`
  - Remove per-user timezone gating and switch to one Beijing batch window and shared Beijing `digestDayKey`.
- `src/lib/preview-digest/service.ts`
  - Promote confirmed previews into a Beijing-day formal digest and advance eligibility by Beijing day.
- `src/app/(app)/today/page.tsx`
  - Read formal digests using Beijing-day semantics and update failed-state copy so it no longer promises same-day auto retry.
- `src/lib/digest/view-state.ts`
  - Update scheduled-state copy from `local 07:00` to `Beijing 07:00`.
- `tests/unit/timezone.test.ts`
  - Cover Beijing scheduling helpers.
- `tests/unit/topics-service.test.ts`
  - Assert first eligible day uses Beijing time.
- `tests/unit/digest-view-state.test.ts`
  - Assert new Beijing copy.
- `tests/unit/digest-orchestration.test.ts`
  - Cover active-only batch behavior with one shared Beijing `digestDayKey`.
- `tests/unit/preview-digest-service.test.ts`
  - Assert preview confirmation writes and advances using Beijing-day semantics.
- `tests/unit/cron-digests-route.test.ts`
  - Keep route behavior stable while result semantics reflect batch scheduling.
- `README.md`
  - Update product and deployment documentation to Beijing-time daily batching.
- `vercel.json`
  - Change cron frequency from hourly to daily at the UTC time corresponding to Beijing 07:00.

### No new production files expected

- This change should fit within the existing scheduling modules without adding new services or database schema.

## Task 1: Add Beijing Scheduling Helpers

**Files:**
- Modify: `src/lib/timezone.ts`
- Test: `tests/unit/timezone.test.ts`

- [ ] **Step 1: Write the failing test**

Add tests in `tests/unit/timezone.test.ts` that assert:

```ts
import {
  DIGEST_TIMEZONE,
  getBeijingDigestDayKey,
  hasBeijingDailyRunPassed,
  getNextBeijingDigestDayKey,
} from "@/lib/timezone";

it("uses Asia/Shanghai as the formal digest timezone", () => {
  expect(DIGEST_TIMEZONE).toBe("Asia/Shanghai");
});

it("treats 06:59 Beijing time as before the batch window", () => {
  expect(hasBeijingDailyRunPassed(new Date("2026-03-22T06:59:00+08:00"))).toBe(false);
});

it("treats 07:00 Beijing time as inside the batch window", () => {
  expect(hasBeijingDailyRunPassed(new Date("2026-03-22T07:00:00+08:00"))).toBe(true);
});

it("builds the Beijing digest day key from Beijing calendar time", () => {
  expect(getBeijingDigestDayKey(new Date("2026-03-21T23:30:00Z"))).toBe("2026-03-22");
});

it("returns the next Beijing digest day key", () => {
  expect(getNextBeijingDigestDayKey(new Date("2026-03-22T08:00:00+08:00"))).toBe("2026-03-23");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/timezone.test.ts
```

Expected: FAIL because the Beijing scheduling exports do not exist yet.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/timezone.ts`, add the smallest set of exports needed:

- `DIGEST_TIMEZONE = "Asia/Shanghai"`
- `DIGEST_RUN_HOUR = 7`
- `getBeijingDigestDayKey(now = new Date())`
- `hasBeijingDailyRunPassed(now = new Date())`
- `getNextBeijingDigestDayKey(now = new Date())`

Keep existing generic helpers intact if still needed by preview-related code.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/timezone.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/timezone.ts tests/unit/timezone.test.ts
git commit -m "refactor: add Beijing digest scheduling helpers"
```

## Task 2: Move Topics Eligibility to Beijing Time

**Files:**
- Modify: `src/lib/topics/service.ts`
- Test: `tests/unit/topics-service.test.ts`

- [ ] **Step 1: Write the failing test**

Extend `tests/unit/topics-service.test.ts` with a case that proves browser timezone no longer controls eligibility:

```ts
it("computes firstEligibleDigestDayKey from Beijing time instead of browser timezone", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-21T23:30:00Z"));

  mockDb.user.findUniqueOrThrow.mockResolvedValue({
    id: "user-1",
    accountTimezone: null,
  });

  const { saveInterestProfile } = await import("@/lib/topics/service");

  await saveInterestProfile("user-1", {
    interestText: "AI agents",
    browserTimezone: "America/New_York",
  });

  expect(mockDb.interestProfile.upsert).toHaveBeenCalledWith(
    expect.objectContaining({
      create: expect.objectContaining({
        firstEligibleDigestDayKey: "2026-03-23",
      }),
    }),
  );
});
```

The chosen timestamp is already `2026-03-22 07:30` in Beijing, so the next eligible day should be `2026-03-23` regardless of browser timezone.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/topics-service.test.ts
```

Expected: FAIL because `saveInterestProfile()` still uses user/browser timezone semantics.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/topics/service.ts`:

- Replace `getDigestDayKey()`, `getNextDigestDayKey()`, and `hasDailyRunPassed()` usage with the new Beijing helpers.
- Keep `accountTimezone` persistence unchanged for now.
- Do not change preview creation behavior.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/topics-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/topics/service.ts tests/unit/topics-service.test.ts
git commit -m "refactor: use Beijing scheduling for topics eligibility"
```

## Task 3: Switch Formal Digest Orchestration to Beijing Batch Mode

**Files:**
- Modify: `src/lib/digest/service.ts`
- Test: `tests/unit/digest-orchestration.test.ts`

- [ ] **Step 1: Write the failing test**

Add or extend `tests/unit/digest-orchestration.test.ts` with two cases:

```ts
it("skips the entire batch before Beijing 07:00", async () => {
  // arrange two active profiles
  // run at 2026-03-22T06:30:00+08:00
  // expect skipped count increments and no dailyDigest upsert/update calls
});

it("uses one shared Beijing digestDayKey for all active users after 07:00", async () => {
  // arrange active profiles with different accountTimezone values
  // run at 2026-03-22T08:15:00+08:00
  // expect all db.dailyDigest upsert/update calls use digestDayKey "2026-03-22"
});
```

Keep the tests focused on scheduling semantics, not provider formatting.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/digest-orchestration.test.ts
```

Expected: FAIL because orchestration still branches by per-user timezone.

- [ ] **Step 3: Write minimal implementation**

In `src/lib/digest/service.ts`:

- Remove per-profile timezone gating based on `profile.user.accountTimezone`
- Check `hasBeijingDailyRunPassed(now)` once per iteration path
- Use `getBeijingDigestDayKey(now)` for all formal digests
- Use a Beijing-formatted `dateLabel` when calling `generateDigest()`
- Leave preview confirmation promotion semantics untouched

Do not over-refactor unrelated parts of the file.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/digest-orchestration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/digest/service.ts tests/unit/digest-orchestration.test.ts
git commit -m "refactor: batch formal digest generation by Beijing time"
```

## Task 4: Align Preview Confirmation and Today Reads to Beijing Day Keys

**Files:**
- Modify: `src/lib/preview-digest/service.ts`
- Modify: `src/lib/digest/service.ts`
- Modify: `src/app/(app)/today/page.tsx`
- Test: `tests/unit/preview-digest-service.test.ts`

- [ ] **Step 1: Write the failing test**

Extend `tests/unit/preview-digest-service.test.ts` with a case that proves confirm promotion ignores `accountTimezone`:

```ts
it("promotes a confirmed preview into the Beijing-day digest and advances to the next Beijing day", async () => {
  // arrange previewDigest.status = "ready"
  // arrange interestProfile.interestText matches the snapshot
  // arrange user.accountTimezone = "America/New_York"
  // confirm at 2026-03-22T00:30:00Z, which is 2026-03-22 08:30 in Beijing
  // expect dailyDigest.upsert to use digestDayKey "2026-03-22"
  // expect interestProfile.update to set firstEligibleDigestDayKey "2026-03-23"
});
```

Add or extend a digest read test so `getTodayDigest()` also resolves the Beijing-day key regardless of user timezone input.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/preview-digest-service.test.ts tests/unit/digest-read-service.test.ts
```

Expected: FAIL because confirm promotion and formal today reads still depend on user timezone.

- [ ] **Step 3: Write minimal implementation**

Update:

- `src/lib/preview-digest/service.ts`
  - replace `getDigestDayKey(timezone, now)` with Beijing-day helper usage
  - replace `getNextDigestDayKey(timezone, now)` with Beijing-next-day helper usage
  - stop deriving confirm promotion from `accountTimezone`
- `src/lib/digest/service.ts`
  - make `getTodayDigest()` resolve the Beijing-day key
- `src/app/(app)/today/page.tsx`
  - remove the user-timezone argument from `getTodayDigest()`

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/preview-digest-service.test.ts tests/unit/digest-read-service.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview-digest/service.ts src/lib/digest/service.ts 'src/app/(app)/today/page.tsx' tests/unit/preview-digest-service.test.ts tests/unit/digest-read-service.test.ts
git commit -m "refactor: align preview promotion and today reads with Beijing digests"
```

## Task 5: Update Scheduled and Failed Copy for Daily Batch Semantics

**Files:**
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/lib/digest/view-state.ts`
- Test: `tests/unit/digest-view-state.test.ts`

- [ ] **Step 1: Write the failing test**

Change the expected strings in `tests/unit/digest-view-state.test.ts`:

```ts
expect(formatScheduledDigestMessage({ firstEligibleDigestDayKey: "2026-03-22" })).toBe(
  "Your first digest is scheduled for March 22, 2026 after the Beijing 07:00 run.",
);

expect(formatScheduledDigestMessage({ firstEligibleDigestDayKey: null })).toBe(
  "Your next digest will appear after the Beijing 07:00 run.",
);
```

Add a UI-level assertion for the failed-state semantics if a focused integration or unit test already covers `Today` copy. If there is no narrow test today, add one minimal assertion in the most local existing test file that proves failed copy no longer says `retry automatically`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/digest-view-state.test.ts
```

Expected: FAIL because the code still returns `local 07:00`.

- [ ] **Step 3: Write minimal implementation**

Update:

- `formatScheduledDigestMessage()` in `src/lib/digest/view-state.ts` to return the new Beijing-specific copy
- the failed branch in `'src/app/(app)/today/page.tsx'` so it no longer promises same-day automatic retry, for example:

```ts
body="Today's digest failed in the Beijing morning batch. The next batch will run tomorrow at 07:00 Beijing time."
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/digest-view-state.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/digest/view-state.ts 'src/app/(app)/today/page.tsx' tests/unit/digest-view-state.test.ts
git commit -m "copy: clarify Beijing batch digest states"
```

## Task 6: Update Route Semantics Docs and Deployment Cron

**Files:**
- Modify: `vercel.json`
- Modify: `README.md`
- Test: `tests/unit/cron-digests-route.test.ts`

- [ ] **Step 1: Write the failing test**

If needed, add a route-level assertion in `tests/unit/cron-digests-route.test.ts` that still expects:

```ts
{
  ok: true,
  result: {
    processed: ...,
    ready: ...,
    failed: ...,
    skipped: ...,
  },
}
```

This is mainly a regression guard to prove the route contract stays stable while scheduling semantics shift underneath it.

Also manually inspect `vercel.json` expectation:

- current hourly cron must be replaced
- new cron must be once per day at UTC time equivalent to Beijing 07:00

- [ ] **Step 2: Run test to verify route contract still holds**

Run:

```bash
pnpm exec vitest run tests/unit/cron-digests-route.test.ts
```

Expected: PASS or targeted FAIL only if the test needed route fixture updates.

- [ ] **Step 3: Write minimal implementation**

Update:

- `vercel.json` from hourly cron to daily cron
  - Beijing 07:00 is UTC 23:00 on the previous day, so use:

```json
{
  "crons": [
    {
      "path": "/api/cron/digests",
      "schedule": "0 23 * * *"
    }
  ]
}
```

- `README.md`
  - replace “local 07:00” language with “Beijing 07:00”
  - document that formal digests are generated once per day in one Beijing-time batch
  - mention that preview confirmation still promotes immediately into Today and History
  - remove any implication that failed digests will be retried again later the same day

- [ ] **Step 4: Run focused verification**

Run:

```bash
pnpm exec vitest run tests/unit/cron-digests-route.test.ts
pnpm exec eslint . README.md src/lib/timezone.ts src/lib/topics/service.ts src/lib/digest/service.ts src/lib/preview-digest/service.ts 'src/app/(app)/today/page.tsx' src/lib/digest/view-state.ts tests/unit/timezone.test.ts tests/unit/topics-service.test.ts tests/unit/digest-orchestration.test.ts tests/unit/preview-digest-service.test.ts tests/unit/digest-view-state.test.ts tests/unit/cron-digests-route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add vercel.json README.md tests/unit/cron-digests-route.test.ts
git commit -m "docs: align deployment with Beijing batch digests"
```

## Task 7: Full Regression Verification

**Files:**
- Verify only

- [ ] **Step 1: Run full unit and integration suite**

Run:

```bash
pnpm exec vitest run
```

Expected: PASS.

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

Expected: PASS.

- [ ] **Step 4: Run smoke test**

Run:

```bash
pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts
```

Expected: PASS. Preview confirm should still promote immediately into `Today` and `History`.

- [ ] **Step 5: Commit final verification state**

If this task required no code changes, skip commit. If any final test-driven fixes were needed:

```bash
git add <files touched during regression fixes>
git commit -m "test: finalize Beijing batch generation rollout"
```
