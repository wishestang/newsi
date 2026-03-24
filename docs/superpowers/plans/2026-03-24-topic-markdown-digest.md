# Topic Markdown Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert topic-level digest content from nested JSON arrays into Markdown blocks while preserving the `Top Events / Insights / Takeaway` reading structure across preview, today, and history.

**Architecture:** Keep the existing two-stage Gemini pipeline. Stage 1 remains topic-grouped evidence collection. Stage 2 changes from strict event/insight/takeaway arrays to a thinner JSON shape with `eventsMarkdown`, `insightsMarkdown`, and `takeawayMarkdown`. `DigestView` will keep the same section headers but render Markdown blocks instead of iterating nested arrays.

**Tech Stack:** Next.js App Router, TypeScript, React Server Components, Zod, Vitest, Testing Library, Playwright, Gemini provider via `@google/genai`

---

## File Map

### Existing files to modify

- `src/lib/digest/schema.ts`
  - Replace nested `events / insights / takeaway` fields with markdown block fields
- `src/lib/digest/provider.ts`
  - Update Stage 2 synthesis prompt, OpenAI structured response schema, Gemini normalization, and reading time estimation to match markdown block output
- `src/components/digest/digest-view.tsx`
  - Replace array-based event/insight rendering with block Markdown rendering under the same headings
- `src/lib/preview-state.ts`
  - Update local mock digests to the new markdown-block shape
- `src/app/(app)/preview/page.tsx`
  - Continue passing topic digests, but against the new markdown shape
- `src/app/(app)/today/page.tsx`
  - Continue passing topic digests, but against the new markdown shape
- `src/app/(app)/history/[digestDayKey]/page.tsx`
  - Continue passing topic digests, but against the new markdown shape
- `tests/unit/digest-schema.test.ts`
  - Replace nested array expectations with markdown-block expectations
- `tests/unit/digest-provider.test.ts`
  - Update Gemini and OpenAI fixtures to use markdown-block topics
- `tests/unit/preview-state.test.ts`
  - Update local preview digest fixture assertions
- `tests/unit/digest-service.test.ts`
  - Update parsed provider fixture
- `tests/unit/digest-read-service.test.ts`
  - Update stored digest content fixture
- `tests/unit/digest-orchestration.test.ts`
  - Update generated digest fixture
- `tests/unit/preview-digest-service.test.ts`
  - Update preview persistence fixture
- `tests/integration/digest-view.test.tsx`
  - Assert markdown-block rendering under `Top Events / Insights / Takeaway`
- `tests/integration/preview-page.test.tsx`
  - Update preview ready-state fixtures

### Files likely unaffected but should be sanity-checked

- `src/lib/digest/evidence-schema.ts`
  - Stage 1 evidence structure remains topic-grouped; should not require change
- `src/lib/digest/service.ts`
  - Public orchestration should stay unchanged beyond reading new `DigestResponse`
- `src/app/(app)/history/page.tsx`
  - History list should remain unchanged

---

### Task 1: Replace Digest Schema With Markdown Block Topics

**Files:**
- Modify: `src/lib/digest/schema.ts`
- Test: `tests/unit/digest-schema.test.ts`

- [ ] **Step 1: Write the failing schema tests**

Update the digest schema tests to require:

```ts
const validDigest = {
  title: "Today's Synthesis",
  intro: "Three tracked spaces moved in the last 24 hours.",
  readingTime: 6,
  topics: [
    {
      topic: "AI Agents",
      eventsMarkdown: "- OpenAI shipped a new agent builder\n- Anthropic expanded tool use",
      insightsMarkdown: "- Agent tooling is becoming more operational\n- Productization is accelerating",
      takeawayMarkdown: "AI agent tooling is moving from demos to workflows.",
    },
  ],
};
```

Add failing tests for:
- empty `topics`
- missing `eventsMarkdown`
- missing `insightsMarkdown`
- missing `takeawayMarkdown`

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/digest-schema.test.ts
```

Expected: FAIL because the current schema still expects nested arrays.

- [ ] **Step 3: Write minimal schema changes**

Update `src/lib/digest/schema.ts` to:

```ts
const digestTopicSchema = z.object({
  topic: z.string().min(1),
  eventsMarkdown: z.string().min(1),
  insightsMarkdown: z.string().min(1),
  takeawayMarkdown: z.string().min(1),
});

export const digestResponseSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1).optional(),
  readingTime: z.number().int().min(3).max(20),
  topics: z.array(digestTopicSchema).min(1).max(3),
});
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/digest-schema.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/digest/schema.ts tests/unit/digest-schema.test.ts
git commit -m "refactor: model digest topics as markdown blocks"
```

---

### Task 2: Update Gemini/OpenAI Final Digest Output To Markdown Blocks

**Files:**
- Modify: `src/lib/digest/provider.ts`
- Test: `tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Write the failing provider tests**

Update the provider tests so final digest fixtures use:

```ts
{
  title: "Today's Synthesis",
  intro: "Three tracked spaces moved in the last 24 hours.",
  readingTime: 6,
  topics: [
    {
      topic: "AI Agents",
      eventsMarkdown: "- OpenAI shipped a new agent builder",
      insightsMarkdown: "- Tooling is packaging orchestration into products.",
      takeawayMarkdown: "Execution layers are becoming productized.",
    },
  ],
}
```

Assertions should verify:
- OpenAI structured output accepts markdown-block topics
- Gemini Stage 2 normalizes markdown-block topics
- invalid Stage 2 output still throws `Gemini did not return valid JSON digest output.`

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/digest-provider.test.ts
```

Expected: FAIL because `openAIDigestResponseSchema`, Gemini normalization, and reading-time estimation still expect nested event arrays.

- [ ] **Step 3: Write minimal provider changes**

Update `src/lib/digest/provider.ts`:
- change `openAIDigestResponseSchema.topics` to:

```ts
topics: z.array(
  z.object({
    topic: z.string().min(1),
    eventsMarkdown: z.string().min(1),
    insightsMarkdown: z.string().min(1),
    takeawayMarkdown: z.string().min(1),
  }),
).min(1).max(3)
```

- change `buildDigestSynthesisPrompt()` to require:
  - `topic`
  - `eventsMarkdown`
  - `insightsMarkdown`
  - `takeawayMarkdown`
- update `normalizeGeminiDigest()` accordingly
- update `estimateReadingTimeFromDigest()` to count markdown strings instead of event arrays

Do not change Stage 1 evidence schema in this task.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/digest-provider.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/digest/provider.ts tests/unit/digest-provider.test.ts
git commit -m "refactor: synthesize markdown-first topic digests"
```

---

### Task 3: Render Markdown Blocks In DigestView

**Files:**
- Modify: `src/components/digest/digest-view.tsx`
- Test: `tests/integration/digest-view.test.tsx`

- [ ] **Step 1: Write the failing integration tests**

Update the digest view tests to use:

```tsx
topics={[
  {
    topic: "AI Agents",
    eventsMarkdown: "- A **bold** move with [source](https://example.com)",
    insightsMarkdown: "- Tooling is packaging orchestration into products.",
    takeawayMarkdown: "One **clear** takeaway.",
  },
]}
```

Assert:
- topic heading renders
- `Top Events` section renders markdown list/link content
- `Insights` renders markdown
- `Takeaway` renders markdown

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/integration/digest-view.test.tsx
```

Expected: FAIL because `DigestView` still expects nested `events[] / insights[] / takeaway`.

- [ ] **Step 3: Write minimal rendering changes**

Update `src/components/digest/digest-view.tsx`:
- replace `DigestEvent` and nested array rendering
- keep the same headings:
  - `Top Events`
  - `Insights`
  - `Takeaway`
- render each block with `DigestMarkdown`

Recommended topic type:

```ts
type DigestTopic = {
  topic: string;
  eventsMarkdown: string;
  insightsMarkdown: string;
  takeawayMarkdown: string;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/integration/digest-view.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/digest/digest-view.tsx tests/integration/digest-view.test.tsx
git commit -m "feat: render topic digest markdown blocks"
```

---

### Task 4: Update Preview/Today/History Fixtures And Page Reads

**Files:**
- Modify: `src/lib/preview-state.ts`
- Modify: `src/app/(app)/preview/page.tsx`
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/app/(app)/history/[digestDayKey]/page.tsx`
- Test: `tests/unit/preview-state.test.ts`
- Test: `tests/unit/digest-service.test.ts`
- Test: `tests/unit/digest-read-service.test.ts`
- Test: `tests/unit/digest-orchestration.test.ts`
- Test: `tests/unit/preview-digest-service.test.ts`
- Test: `tests/integration/preview-page.test.tsx`

- [ ] **Step 1: Write/update failing fixtures**

Update all remaining digest fixtures from nested array topics to markdown-block topics, e.g.:

```ts
topics: [
  {
    topic: "AI Agents",
    eventsMarkdown: "- New product shipped\n- Enterprise launch announced",
    insightsMarkdown: "- Competition is shifting toward workflow ownership",
    takeawayMarkdown: "Execution layers are becoming productized.",
  },
]
```

Update local preview mock digest generation in `src/lib/preview-state.ts` to emit markdown-block topics.

- [ ] **Step 2: Run focused tests to verify they fail where expected**

Run:

```bash
pnpm exec vitest run tests/unit/preview-state.test.ts tests/unit/digest-service.test.ts tests/unit/digest-read-service.test.ts tests/unit/digest-orchestration.test.ts tests/unit/preview-digest-service.test.ts tests/integration/preview-page.test.tsx
```

Expected: FAIL until all fixtures and reads are aligned.

- [ ] **Step 3: Write minimal page and fixture changes**

Update:
- `src/lib/preview-state.ts`
  - mock digests use markdown blocks
- `src/app/(app)/preview/page.tsx`
- `src/app/(app)/today/page.tsx`
- `src/app/(app)/history/[digestDayKey]/page.tsx`
  - continue passing `topics`, but now with markdown block fields

The page files should not need structural routing/state changes.

- [ ] **Step 4: Run focused tests to verify they pass**

Run:

```bash
pnpm exec vitest run tests/unit/preview-state.test.ts tests/unit/digest-service.test.ts tests/unit/digest-read-service.test.ts tests/unit/digest-orchestration.test.ts tests/unit/preview-digest-service.test.ts tests/integration/preview-page.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview-state.ts 'src/app/(app)/preview/page.tsx' 'src/app/(app)/today/page.tsx' 'src/app/(app)/history/[digestDayKey]/page.tsx' tests/unit/preview-state.test.ts tests/unit/digest-service.test.ts tests/unit/digest-read-service.test.ts tests/unit/digest-orchestration.test.ts tests/unit/preview-digest-service.test.ts tests/integration/preview-page.test.tsx
git commit -m "refactor: wire markdown-first digests through app views"
```

---

### Task 5: Full Regression Pass

**Files:**
- Verify only

- [ ] **Step 1: Run focused digest regressions**

Run:

```bash
pnpm exec vitest run tests/unit/digest-schema.test.ts tests/unit/digest-provider.test.ts tests/unit/preview-state.test.ts tests/unit/digest-service.test.ts tests/unit/digest-read-service.test.ts tests/unit/digest-orchestration.test.ts tests/unit/preview-digest-service.test.ts tests/integration/digest-view.test.tsx tests/integration/preview-page.test.tsx tests/integration/preview-generation-kickoff.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run full unit/integration suite**

Run:

```bash
pnpm exec vitest run
```

Expected: PASS

- [ ] **Step 3: Run typecheck**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS

- [ ] **Step 4: Run lint on touched files**

Run:

```bash
pnpm exec eslint src/lib/digest/provider.ts src/lib/digest/schema.ts src/components/digest/digest-view.tsx src/lib/preview-state.ts 'src/app/(app)/preview/page.tsx' 'src/app/(app)/today/page.tsx' 'src/app/(app)/history/[digestDayKey]/page.tsx' tests/unit/digest-provider.test.ts tests/unit/digest-schema.test.ts tests/unit/preview-state.test.ts tests/unit/digest-service.test.ts tests/unit/digest-read-service.test.ts tests/unit/digest-orchestration.test.ts tests/unit/preview-digest-service.test.ts tests/integration/digest-view.test.tsx tests/integration/preview-page.test.tsx tests/integration/preview-generation-kickoff.test.tsx
```

Expected: PASS

- [ ] **Step 5: Run smoke e2e**

Run:

```bash
pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "test: verify markdown-first topic digest flow"
```

---

## Notes for Implementers

- Do not touch unrelated untracked i18n or auxiliary files in the worktree.
- Do not redesign the page layout in this task; only change data shape and block rendering.
- Keep Stage 1 evidence schema unchanged unless a failing test proves it is insufficient.
- `intro` becomes optional in the schema, but page components do not need to display it if they already ignore it visually.
- The priority here is stability: prefer a thinner schema over clever normalization heuristics.
