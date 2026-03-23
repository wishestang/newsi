# Gemini Evidence Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current single-pass Gemini digest generation with a two-stage evidence-then-digest pipeline while keeping the existing UI and `DigestResponse` contract unchanged.

**Architecture:** Keep the public `DigestProvider` interface unchanged and refactor only the Gemini provider internals. Stage 1 will produce an `EvidenceBundle` using Gemini + `googleSearch`; Stage 2 will transform that evidence into the existing digest JSON shape without search enabled.

**Tech Stack:** TypeScript, Next.js, Vitest, Zod, Google GenAI SDK

---

## File Map

- Create: `/Users/bytedance/Documents/newsi/src/lib/digest/evidence-schema.ts`
  - Defines the normalized `EvidenceBundle` shape used between Gemini stages.
- Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/provider.ts`
  - Replaces the current single-pass Gemini JSON extraction flow with the two-stage pipeline.
- Modify: `/Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts`
  - Adds tests for evidence generation and digest synthesis behavior.
- Optional Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/prompt.ts`
  - Only if the second-stage synthesis prompt needs a dedicated wrapper rather than reusing the current prompt verbatim.

## Task 1: Define the Evidence Schema

**Files:**
- Create: `/Users/bytedance/Documents/newsi/src/lib/digest/evidence-schema.ts`
- Test: `/Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Write the failing test for a normalized evidence bundle**

Add a failing unit test in `/Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts` that expects Gemini stage 1 output shaped like:

```ts
{
  topic: "AI coding",
  generatedAt: "2026-03-24T08:00:00.000Z",
  searchQueries: ["AI coding tools 24 hours"],
  signals: [
    {
      headline: "OpenAI shipped ...",
      summary: "What changed",
      whyRelevant: "Why it matters",
      sourceTitle: "Source title",
      sourceUrl: "https://example.com",
    },
  ],
}
```

- [ ] **Step 2: Run the provider unit test and verify it fails**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
```

Expected: FAIL because no `EvidenceBundle` schema or stage-1 parsing exists yet.

- [ ] **Step 3: Create the schema file**

Create `/Users/bytedance/Documents/newsi/src/lib/digest/evidence-schema.ts` with a zod schema and exported type:

```ts
export const evidenceBundleSchema = z.object({
  topic: z.string().min(1),
  generatedAt: z.string().min(1),
  searchQueries: z.array(z.string().min(1)).min(1),
  signals: z.array(
    z.object({
      headline: z.string().min(1),
      summary: z.string().min(1),
      whyRelevant: z.string().min(1),
      sourceTitle: z.string().min(1),
      sourceUrl: z.string().url(),
      publishedAt: z.string().optional(),
    }),
  ).min(1).max(8),
});
```

- [ ] **Step 4: Run the focused provider test again**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
```

Expected: still FAIL, but now because stage-1 Gemini parsing is not implemented.

- [ ] **Step 5: Commit**

```bash
git add /Users/bytedance/Documents/newsi/src/lib/digest/evidence-schema.ts /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
git commit -m "test: define Gemini evidence bundle"
```

## Task 2: Implement Gemini Stage 1 Evidence Generation

**Files:**
- Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/provider.ts`
- Create: `/Users/bytedance/Documents/newsi/src/lib/digest/evidence-schema.ts`
- Test: `/Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Add a dedicated stage-1 helper in the provider**

In `/Users/bytedance/Documents/newsi/src/lib/digest/provider.ts`, add a helper such as:

```ts
async function generateGeminiEvidenceBundle(...) { ... }
```

Responsibilities:
- call Gemini with `googleSearch`
- ask for evidence JSON only
- parse the first JSON object from the response
- validate with `evidenceBundleSchema`

- [ ] **Step 2: Keep the parsing logic isolated**

If the current single-pass helper functions are too tightly coupled, add new focused helpers:

- `extractGeminiJsonCandidate(...)`
- `normalizeGeminiEvidenceBundle(...)`

Do not mix stage-1 and stage-2 logic into one giant parser.

- [ ] **Step 3: Run the focused provider tests**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
```

Expected: FAIL only because stage 2 synthesis is not implemented yet.

- [ ] **Step 4: Commit**

```bash
git add /Users/bytedance/Documents/newsi/src/lib/digest/provider.ts /Users/bytedance/Documents/newsi/src/lib/digest/evidence-schema.ts /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
git commit -m "feat: add Gemini evidence generation stage"
```

## Task 3: Implement Gemini Stage 2 Digest Synthesis

**Files:**
- Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/provider.ts`
- Optional Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/prompt.ts`
- Test: `/Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Write the failing synthesis test**

Add a failing test that verifies:
- stage 2 receives an `EvidenceBundle`
- stage 2 returns a valid `DigestResponse`
- no search tool is sent during stage 2

The expected final digest can remain minimal, for example:

```ts
{
  title: "每日情报摘要",
  intro: "今天最值得关注的是...",
  sections: [{ title: "AI coding", ... }]
}
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
```

Expected: FAIL because stage-2 synthesis does not exist.

- [ ] **Step 3: Implement stage 2 inside the Gemini provider**

Add a helper such as:

```ts
async function synthesizeDigestFromEvidence(...) { ... }
```

Responsibilities:
- build a synthesis prompt from the original digest prompt + `EvidenceBundle`
- call Gemini **without** `googleSearch`
- parse the returned JSON into the existing digest schema

- [ ] **Step 4: Connect the public Gemini provider**

Update `createGeminiDigestProvider().generate({ prompt })` to:

1. call stage 1
2. call stage 2
3. return the existing `DigestResponse`

Do not change the OpenAI path.

- [ ] **Step 5: Run the focused provider test file**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add /Users/bytedance/Documents/newsi/src/lib/digest/provider.ts /Users/bytedance/Documents/newsi/src/lib/digest/prompt.ts /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
git commit -m "feat: add Gemini digest synthesis stage"
```

## Task 4: Remove Temporary Debugging and Stabilize the Provider

**Files:**
- Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/provider.ts`

- [ ] **Step 1: Remove temporary server-side debug logging**

Delete the current `console.error("Gemini response debug:", ...)` instrumentation so production behavior is clean.

- [ ] **Step 2: Make the error boundaries explicit**

Keep clear top-level provider errors such as:

- evidence generation failed
- evidence parsing failed
- digest synthesis failed

But avoid leaking raw response blobs to end users.

- [ ] **Step 3: Run focused provider tests again**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add /Users/bytedance/Documents/newsi/src/lib/digest/provider.ts
git commit -m "refactor: clean Gemini provider debug paths"
```

## Task 5: Regression Verification

**Files:**
- Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/provider.ts`
- Modify: `/Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts`
- Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/evidence-schema.ts`

- [ ] **Step 1: Run provider and preview-related unit tests**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts /Users/bytedance/Documents/newsi/tests/unit/preview-digest-service.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the full unit suite**

Run:

```bash
pnpm exec vitest run
```

Expected: PASS

- [ ] **Step 3: Run type checking**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS

- [ ] **Step 4: Run targeted linting for modified files**

Run:

```bash
pnpm exec eslint /Users/bytedance/Documents/newsi/src/lib/digest/provider.ts /Users/bytedance/Documents/newsi/src/lib/digest/evidence-schema.ts /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the verified final state**

```bash
git add /Users/bytedance/Documents/newsi/src/lib/digest/provider.ts /Users/bytedance/Documents/newsi/src/lib/digest/evidence-schema.ts /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts /Users/bytedance/Documents/newsi/src/lib/digest/prompt.ts
git commit -m "test: verify Gemini evidence pipeline"
```

## Task 6: Manual Validation

**Files:**
- No new files

- [ ] **Step 1: Start the local dev server**

Run:

```bash
pnpm dev
```

- [ ] **Step 2: Trigger a preview generation locally**

Use a recency-sensitive standing brief, for example:

```text
关注过去24小时内的 AI agents、China tech policy、developer tools 新动态
```

- [ ] **Step 3: Confirm the preview no longer fails with Gemini JSON parsing errors**

Expected:
- no `Gemini did not return valid JSON digest output`
- preview renders the digest surface successfully

- [ ] **Step 4: Compare quality against the previous single-pass approach**

Check whether:
- content is fresher
- sections are grounded in clearer recent signals
- synthesis reads more coherently than the earlier raw Gemini JSON output
