# Newsi Preview Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real digest preview confirmation flow so users must save Topics, review one real preview digest, and explicitly confirm before they become eligible for daily cron-generated digests.

**Architecture:** Extend `InterestProfile` with an activation state and introduce a separate `PreviewDigest` persistence model guarded by a generation token. `Topics` will create pending preview state, `/preview` will own preview generation and confirmation, and formal `Today`/`Archive`/cron paths will operate only on `active` profiles. Existing preview-mode cookie logic will be updated to mirror the new state machine without needing live auth or provider calls.

**Tech Stack:** Next.js App Router, Auth.js, Prisma/PostgreSQL, OpenAI/Gemini digest providers, Vitest, React Testing Library, Playwright

---

### Task 1: Extend the data model for pending preview vs active profiles

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_preview_confirmation/migration.sql`
- Modify: `src/lib/topics/service.ts`
- Test: `tests/unit/topics-service.test.ts`

- [ ] **Step 1: Write the failing service tests for profile status and clearing behavior**

Add tests covering:
- saving Topics creates or updates an `InterestProfile` with `status = pending_preview`
- saving Topics creates or overwrites a `PreviewDigest` shell with a fresh `generationToken`
- clearing interests removes both `InterestProfile` and `PreviewDigest` while preserving historical `DailyDigest`

- [ ] **Step 2: Run the focused tests to verify they fail for the new behavior**

Run: `pnpm exec vitest run tests/unit/topics-service.test.ts`
Expected: FAIL because `InterestProfile.status`, `PreviewDigest`, and the new clear semantics do not exist yet.

- [ ] **Step 3: Add Prisma schema changes**

Update `prisma/schema.prisma` to:
- add an `InterestProfileStatus` enum with `pending_preview` and `active`
- add `status` to `InterestProfile`
- add a `previewDigest PreviewDigest?` relation on `User`
- add a `PreviewDigest` model with:
  - `id`
  - `userId` as unique
  - `generationToken`
  - `interestTextSnapshot`
  - `status` enum (`generating`, `failed`, `ready`)
  - `title`, `intro`, `contentJson`, `readingTime`
  - `providerName`, `providerModel`, `failureReason`
  - timestamps

- [ ] **Step 4: Write the migration with explicit rollout behavior**

Create the migration SQL so it:
- creates the new enum(s) and table
- adds `status` to `InterestProfile`
- backfills existing `InterestProfile` rows to `active`
- preserves existing `DailyDigest` data untouched

- [ ] **Step 5: Implement minimal `topics` service changes**

Update `src/lib/topics/service.ts` so:
- `saveInterestProfile()` sets the profile to `pending_preview`
- `saveInterestProfile()` creates or updates one `PreviewDigest` with `status = generating`, `interestTextSnapshot = interestText`, and a fresh token
- `clearInterestProfile()` deletes the profile and preview digest, but leaves existing `DailyDigest` rows alone

- [ ] **Step 6: Re-run the focused tests**

Run: `pnpm exec vitest run tests/unit/topics-service.test.ts`
Expected: PASS

- [ ] **Step 7: Validate Prisma artifacts**

Run:
- `pnpm exec prisma validate --schema prisma/schema.prisma`
- `pnpm exec tsc --noEmit`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/topics/service.ts tests/unit/topics-service.test.ts
git commit -m "feat: add preview confirmation data model"
```

### Task 2: Add preview digest domain services with token-guarded generation and confirmation

**Files:**
- Create: `src/lib/preview-digest/service.ts`
- Modify: `src/lib/digest/service.ts`
- Test: `tests/unit/preview-digest-service.test.ts`
- Test: `tests/unit/digest-orchestration.test.ts`

- [ ] **Step 1: Write the failing preview-domain tests**

Cover:
- starting preview generation only succeeds when the record is still `generating`
- ready preview writes the provider output and metadata
- stale `generationToken` results are discarded
- retry refreshes `generationToken`
- confirmation requires `PreviewDigest.status = ready`
- confirmation rejects stale snapshot mismatches
- cron skips `pending_preview` profiles and only processes `active`

- [ ] **Step 2: Run the preview-domain tests to verify they fail**

Run:
- `pnpm exec vitest run tests/unit/preview-digest-service.test.ts tests/unit/digest-orchestration.test.ts`

Expected: FAIL because the preview domain service and active-only cron filtering do not exist yet.

- [ ] **Step 3: Create the preview digest service**

Implement focused functions in `src/lib/preview-digest/service.ts`, for example:
- `getPreviewDigest(userId)`
- `startPreviewDigestGeneration(userId)`
- `retryPreviewDigest(userId)`
- `confirmPreviewDigest(userId)`
- `deletePreviewDigest(userId)`

Service rules:
- provider generation uses the same digest schema as formal digests
- writeback must compare the stored `generationToken`
- stale writes must no-op
- confirmation must compare `interestTextSnapshot` to the current `InterestProfile.interestText`

- [ ] **Step 4: Refactor shared digest generation helpers only where necessary**

Keep `src/lib/digest/service.ts` focused on formal digests, but extract or reuse shared helper(s) for:
- provider invocation
- digest parsing
- provider metadata mapping

Do not merge preview persistence into `DailyDigest`.

- [ ] **Step 5: Update cron orchestration to scan only active profiles**

Adjust `runDigestGenerationCycle()` so it only loads and processes profiles with `status = active`.

- [ ] **Step 6: Re-run the focused tests**

Run:
- `pnpm exec vitest run tests/unit/preview-digest-service.test.ts tests/unit/digest-orchestration.test.ts`

Expected: PASS

- [ ] **Step 7: Run typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/preview-digest/service.ts src/lib/digest/service.ts tests/unit/preview-digest-service.test.ts tests/unit/digest-orchestration.test.ts
git commit -m "feat: add preview digest generation and confirmation"
```

### Task 3: Add the `/preview` route and wire Topics into the new preview flow

**Files:**
- Create: `src/app/(app)/preview/page.tsx`
- Create: `src/components/preview/preview-actions.tsx` or keep inline only if still focused
- Modify: `src/app/(app)/topics/page.tsx`
- Modify: `src/components/topics/topics-form.tsx`
- Test: `tests/integration/topics-form.test.tsx`
- Test: `tests/integration/preview-page.test.tsx`

- [ ] **Step 1: Write the failing UI tests for Topics and Preview**

Cover:
- saving `Topics` redirects to `/preview`
- `/preview` renders `Generating preview...` for pending generation
- `/preview` renders the real digest view when ready
- `/preview` renders retry state when failed
- `/preview` redirects to `/topics` if there is no pending preview

- [ ] **Step 2: Run the UI tests to verify they fail**

Run:
- `pnpm exec vitest run tests/integration/topics-form.test.tsx tests/integration/preview-page.test.tsx`

Expected: FAIL because `/preview` and the new redirect/CTA flow do not exist yet.

- [ ] **Step 3: Update the Topics server actions**

In `src/app/(app)/topics/page.tsx`:
- save action should call the updated `saveInterestProfile()`
- save action should revalidate affected routes and redirect to `/preview`
- clear action should use the new clear semantics and route back to `/today`

- [ ] **Step 4: Add the preview page**

Implement `src/app/(app)/preview/page.tsx` with three states:
- `generating`: render a status panel
- `ready`: render `DigestView` plus `Confirm and start daily digests` and `Back to Topics`
- `failed`: render a retry panel and `Back to Topics`

Use a protected real-data path when auth/persistence are configured.

- [ ] **Step 5: Add confirm and retry actions**

Expose server actions from the page so:
- retry refreshes the token and returns to `generating`
- confirm activates the profile, recalculates `firstEligibleDigestDayKey`, deletes the preview row, and redirects to `/today`

- [ ] **Step 6: Keep the component boundary focused**

Only extract a dedicated client component if action buttons or polling need it. Avoid creating a generic “preview state machine” component unless the page clearly needs it.

- [ ] **Step 7: Re-run the integration tests**

Run:
- `pnpm exec vitest run tests/integration/topics-form.test.tsx tests/integration/preview-page.test.tsx`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/app/(app)/topics/page.tsx src/app/(app)/preview/page.tsx src/components/topics/topics-form.tsx tests/integration/topics-form.test.tsx tests/integration/preview-page.test.tsx
git commit -m "feat: add preview confirmation route"
```

### Task 4: Update Today, Archive, and cron-facing status behavior

**Files:**
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/app/(app)/archive/page.tsx`
- Modify: `src/app/(app)/archive/[digestDayKey]/page.tsx`
- Modify: `src/lib/digest/view-state.ts`
- Modify: `src/app/api/cron/digests/route.ts` only if response semantics need tests updated
- Test: `tests/unit/cron-digests-route.test.ts`
- Test: `tests/integration/archive-list.test.tsx`
- Test: `tests/integration/status-panel.test.tsx`

- [ ] **Step 1: Write the failing behavior tests**

Cover:
- `Today` shows a pending-preview panel with a `Continue preview` CTA instead of auto-redirecting
- first-time unconfirmed users see an empty `Archive`
- previously active users who are back in `pending_preview` still see old formal archive rows
- cron route still authenticates but formal generation only touches `active`

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run:
- `pnpm exec vitest run tests/unit/cron-digests-route.test.ts tests/integration/archive-list.test.tsx tests/integration/status-panel.test.tsx`

Expected: FAIL because the new pending-preview branch is not implemented yet.

- [ ] **Step 3: Update formal route branching**

Implement route behavior so:
- `Today` distinguishes unconfigured, pending-preview, and active users
- `Archive` suppresses preview rows entirely
- `Archive` continues to show only formal `DailyDigest` rows
- `Archive` detail never attempts to render preview content

- [ ] **Step 4: Keep the formal system isolated**

Do not leak `PreviewDigest` into `ArchiveList`, `DailyDigest`, or cron persistence. The preview flow stays separate.

- [ ] **Step 5: Re-run the targeted tests**

Run:
- `pnpm exec vitest run tests/unit/cron-digests-route.test.ts tests/integration/archive-list.test.tsx tests/integration/status-panel.test.tsx`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/(app)/today/page.tsx src/app/(app)/archive/page.tsx src/app/(app)/archive/[digestDayKey]/page.tsx src/lib/digest/view-state.ts src/app/api/cron/digests/route.ts tests/unit/cron-digests-route.test.ts tests/integration/archive-list.test.tsx tests/integration/status-panel.test.tsx
git commit -m "feat: separate pending preview from formal digest views"
```

### Task 5: Bring local preview mode into the same confirmation state machine

**Files:**
- Modify: `src/lib/preview-state.ts`
- Modify: `src/app/(app)/topics/page.tsx`
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/app/(app)/archive/page.tsx`
- Modify: `src/app/(app)/archive/[digestDayKey]/page.tsx`
- Modify: `src/app/signin/page.tsx` only if copy or navigation changes
- Test: `tests/unit/preview-state.test.ts`
- Test: `tests/e2e/newsi-smoke.spec.ts`

- [ ] **Step 1: Write the failing local-preview tests**

Cover:
- preview-mode `Topics` save leads to `/preview`
- local preview mode has `pending_preview` vs `active` semantics
- confirm in local preview mode unlocks `Today`/`Archive`
- clear resets to the empty state

- [ ] **Step 2: Run the preview-mode tests to verify they fail**

Run:
- `pnpm exec vitest run tests/unit/preview-state.test.ts`
- `pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts`

Expected: FAIL because the current cookie-based preview logic jumps straight to mock digest readiness.

- [ ] **Step 3: Replace the old cookie state shape**

Update `src/lib/preview-state.ts` so the cookie stores enough state to mimic:
- `pending_preview`
- `generating`
- `ready`
- `active`

Keep it intentionally mock-only, but make the control flow match the real product.

- [ ] **Step 4: Add a local `/preview` experience**

Make local preview mode use the same route and CTA structure as real mode, with mock digest content standing in for provider output.

- [ ] **Step 5: Update the smoke path**

Adjust the e2e flow to:
- save Topics
- land on `/preview`
- confirm
- reach `Today`
- keep `Archive` behavior aligned with the new rules

- [ ] **Step 6: Re-run local preview tests**

Run:
- `pnpm exec vitest run tests/unit/preview-state.test.ts`
- `pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/preview-state.ts src/app/(app)/topics/page.tsx src/app/(app)/today/page.tsx src/app/(app)/archive/page.tsx src/app/(app)/archive/[digestDayKey]/page.tsx tests/unit/preview-state.test.ts tests/e2e/newsi-smoke.spec.ts
git commit -m "feat: align local preview mode with confirmation flow"
```

### Task 6: Final verification and docs touch-up

**Files:**
- Modify: `README.md`
- Optionally modify: `.env.example` only if no new envs were added, otherwise skip

- [ ] **Step 1: Update docs for the new flow**

Document:
- `Topics -> /preview -> confirm -> daily cron`
- `pending_preview` vs `active`
- the fact that preview digests are not archived
- the local preview-mode approximation

- [ ] **Step 2: Run the full verification suite**

Run:
- `pnpm exec tsc --noEmit`
- `pnpm exec eslint .`
- `pnpm exec vitest run`
- `pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts`
- `pnpm exec prisma validate --schema prisma/schema.prisma`

Expected: PASS

- [ ] **Step 3: Verify key manual paths**

Check at minimum:
- `/topics` save redirects to `/preview`
- `/preview` generates or shows a preview
- confirm enables formal flow
- previously active archive remains visible when re-entering `pending_preview`

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: describe preview confirmation flow"
```

