# Topic Markdown Top Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert each topic digest block into a single Markdown body that contains `Top Events` and `Summary`, with up to seven numbered events that each include an inline insight and a clickable source link.

**Architecture:** Keep the existing two-stage provider flow. Stage 1 still collects topic-grouped evidence. Stage 2 changes from `eventsMarkdown / insightsMarkdown / takeawayMarkdown` to a single `markdown` field per topic, and the synthesis prompt becomes responsible for writing the full numbered `Top Events` and `Summary` structure inside that Markdown. `DigestView` will stop rendering separate sub-sections and instead render the topic title plus the single Markdown body.

**Tech Stack:** Next.js App Router, TypeScript, React Server Components, Zod, Vitest, Testing Library, Playwright, Gemini provider via `@google/genai`

---

## File Map

### Existing files to modify

- `src/lib/digest/schema.ts`
  - Replace topic-level markdown subfields with a single `markdown` field
- `src/lib/digest/provider.ts`
  - Update final digest schema, synthesis prompt, Gemini normalization, and reading-time estimation to use topic-level markdown
- `src/components/digest/digest-view.tsx`
  - Render a single Markdown body under each topic heading instead of separate `Top Events / Insights / Takeaway` blocks
- `src/lib/preview-state.ts`
  - Update local mock digest generation to the new `topic + markdown` shape
- `src/app/(app)/preview/page.tsx`
  - Continue passing digest topics through `DigestView` with the new shape
- `src/app/(app)/today/page.tsx`
  - Continue passing digest topics through `DigestView` with the new shape
- `src/app/(app)/history/[digestDayKey]/page.tsx`
  - Continue passing digest topics through `DigestView` with the new shape
- `tests/unit/digest-schema.test.ts`
  - Replace `eventsMarkdown / insightsMarkdown / takeawayMarkdown` expectations with `markdown`
- `tests/unit/digest-provider.test.ts`
  - Update OpenAI and Gemini digest fixtures to `topic + markdown`
- `tests/unit/preview-state.test.ts`
  - Update local preview assertions
- `tests/unit/digest-service.test.ts`
  - Update provider fixture
- `tests/unit/digest-read-service.test.ts`
  - Update stored digest fixture
- `tests/unit/digest-orchestration.test.ts`
  - Update generated digest fixture
- `tests/unit/preview-digest-service.test.ts`
  - Update preview persistence fixtures
- `tests/integration/digest-view.test.tsx`
  - Assert topic markdown rendering instead of sectionized event/insight/takeaway rendering
- `tests/integration/preview-page.test.tsx`
  - Update preview ready-state fixtures
- `tests/e2e/newsi-smoke.spec.ts`
  - Sanity-check headings/content against the simpler topic markdown structure if needed

### Files likely unaffected but should be sanity-checked

- `src/lib/digest/evidence-schema.ts`
  - Stage 1 evidence structure should stay topic-grouped
- `src/lib/digest/service.ts`
  - Orchestration should continue to work with the new `DigestResponse`
- `src/components/digest/digest-markdown.tsx`
  - Should already render links and markdown safely; just verify it fits the new output

---

### Task 1: Replace Digest Schema With Topic Markdown Blocks

**Files:**
- Modify: `src/lib/digest/schema.ts`
- Test: `tests/unit/digest-schema.test.ts`

- [ ] **Step 1: Write the failing schema tests**

Update the digest schema tests so valid fixtures use:

```ts
const validDigest = {
  title: "Today's Synthesis",
  intro: "Three tracked spaces moved in the last 24 hours.",
  readingTime: 6,
  topics: [
    {
      topic: "AI Agents",
      markdown: [
        "### Top Events",
        "",
        "1. **OpenAI shipped a new agent builder**",
        "   OpenAI released a new builder in the last 24 hours.",
        "   Insight: Tooling is moving toward execution layers.",
        "   [来源：OpenAI · 2026-03-24](https://example.com/openai)",
        "",
        "### Summary",
        "",
        "Agent tooling is moving from demos to workflows.",
      ].join(\"\\n\"),
    },
  ],
};
```

Add failing tests for:
- empty `topics`
- missing `markdown`
- empty `markdown`

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/digest-schema.test.ts
```

Expected: FAIL because the current schema still expects multiple topic markdown subfields.

- [ ] **Step 3: Write minimal schema changes**

Update `src/lib/digest/schema.ts` to:

```ts
const digestTopicSchema = z.object({
  topic: z.string().min(1),
  markdown: z.string().min(1),
});
```

Keep:
- `title`
- `intro?`
- `readingTime`
- `topics: 1-3`

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/digest-schema.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/digest/schema.ts tests/unit/digest-schema.test.ts
git commit -m "refactor: simplify digest topics to markdown bodies"
```

---

### Task 2: Update Final Digest Provider Output To Topic Markdown

**Files:**
- Modify: `src/lib/digest/provider.ts`
- Test: `tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Write the failing provider tests**

Update provider fixtures so final digest responses use:

```ts
{
  title: "Today's Synthesis",
  intro: "Three tracked spaces moved in the last 24 hours.",
  readingTime: 6,
  topics: [
    {
      topic: "AI Agents",
      markdown: [
        "### Top Events",
        "",
        "1. **OpenAI shipped a new agent builder**",
        "   OpenAI released a new builder in the last 24 hours.",
        "   Insight: Tooling is moving toward execution layers.",
        "   [来源：OpenAI · 2026-03-24](https://example.com/openai)",
        "",
        "### Summary",
        "",
        "Agent tooling is moving from demos to workflows.",
      ].join(\"\\n\"),
    },
  ],
}
```

Assertions should cover:
- OpenAI structured output accepts topic markdown
- Gemini Stage 2 normalizes topic markdown
- Invalid Stage 2 output still throws `Gemini did not return valid JSON digest output.`

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/digest-provider.test.ts
```

Expected: FAIL because the current provider still expects `eventsMarkdown / insightsMarkdown / takeawayMarkdown`.

- [ ] **Step 3: Write minimal provider changes**

Update `src/lib/digest/provider.ts`:
- change `openAIDigestResponseSchema.topics` to:

```ts
topics: z.array(
  z.object({
    topic: z.string().min(1),
    markdown: z.string().min(1),
  }),
).min(1).max(3)
```

- update `buildDigestSynthesisPrompt()` so it requires:
  - one `markdown` field per topic
  - markdown must contain:
    - `Top Events`
    - up to 7 numbered events
    - each event includes a fact paragraph, an `Insight:` line, and a clickable source link
    - `Summary`
- update `normalizeGeminiDigest()` accordingly
- update `estimateReadingTimeFromDigest()` to count `topic.markdown`

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
git commit -m "refactor: synthesize topic markdown top events digests"
```

---

### Task 3: Render Topic Markdown Bodies In DigestView

**Files:**
- Modify: `src/components/digest/digest-view.tsx`
- Test: `tests/integration/digest-view.test.tsx`

- [ ] **Step 1: Write the failing integration tests**

Update the digest view tests to use:

```tsx
topics={[
  {
    topic: "AI Agents",
    markdown: [
      "### Top Events",
      "",
      "1. **A bold move**",
      "   The topic changed quickly.",
      "   Insight: Tooling is packaging orchestration into products.",
      "   [来源：Example · 2026-03-24](https://example.com)",
      "",
      "### Summary",
      "",
      "Execution layers are becoming productized.",
    ].join(\"\\n\"),
  },
]}
```

Assert:
- topic heading renders
- markdown heading `Top Events` renders
- numbered event content renders
- insight text renders inline
- source link renders and is clickable
- `Summary` renders

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/integration/digest-view.test.tsx
```

Expected: FAIL because `DigestView` still renders separate `Top Events / Insights / Takeaway` containers.

- [ ] **Step 3: Write minimal view changes**

Update `src/components/digest/digest-view.tsx`:
- remove the separate:
  - `Top Events`
  - `Insights`
  - `Takeaway`
  blocks
- keep:
  - digest title
  - digest date
  - topic heading
- render one `DigestMarkdown` block per topic beneath the topic heading

Do not add custom parser logic for `Top Events` or `Summary`; let the Markdown body own that structure.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/integration/digest-view.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/digest/digest-view.tsx tests/integration/digest-view.test.tsx
git commit -m "refactor: render topic markdown digest bodies"
```

---

### Task 4: Propagate New Topic Markdown Shape Through Preview, Today, History, and Local Preview

**Files:**
- Modify: `src/lib/preview-state.ts`
- Modify: `src/app/(app)/preview/page.tsx`
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/app/(app)/history/[digestDayKey]/page.tsx`
- Test: `tests/integration/preview-page.test.tsx`
- Test: `tests/unit/preview-state.test.ts`
- Test: `tests/unit/digest-service.test.ts`
- Test: `tests/unit/digest-read-service.test.ts`
- Test: `tests/unit/digest-orchestration.test.ts`
- Test: `tests/unit/preview-digest-service.test.ts`
- Test: `tests/e2e/newsi-smoke.spec.ts`

- [ ] **Step 1: Write the failing fixture updates**

Update all remaining digest fixtures from:
- `eventsMarkdown / insightsMarkdown / takeawayMarkdown`

to:
- `markdown`

For local preview mock digests in `src/lib/preview-state.ts`, generate a topic markdown body that already follows the target format:

```md
### Top Events

1. **<focus area> surfaced as a top tracked event**
   Signals around <focus area> are the most relevant part of this brief right now.
   Insight: The preview keeps fact and interpretation together for faster scanning.
   [来源：Newsi Preview · 2026-03-24](https://newsi.local/preview)

### Summary

This mock digest simulates the final reading surface before live provider output is configured.
```

- [ ] **Step 2: Run targeted tests to verify they fail**

Run:

```bash
pnpm exec vitest run \
  tests/integration/preview-page.test.tsx \
  tests/unit/preview-state.test.ts \
  tests/unit/digest-service.test.ts \
  tests/unit/digest-read-service.test.ts \
  tests/unit/digest-orchestration.test.ts \
  tests/unit/preview-digest-service.test.ts
```

Expected: FAIL because fixtures and `DigestView` call sites still expect the old topic markdown subfields.

- [ ] **Step 3: Write minimal propagation changes**

Update the mock digests and all test fixtures to the new shape.

Keep page components simple:
- `PreviewPage`, `TodayPage`, and `History` detail should continue passing `topics` directly to `DigestView`
- no extra formatting logic in page files

If `tests/e2e/newsi-smoke.spec.ts` asserts the old section headings, update it to assert:
- topic headings
- `Top Events`
- `Summary`

inside the rendered markdown body instead.

- [ ] **Step 4: Run targeted tests to verify they pass**

Run:

```bash
pnpm exec vitest run \
  tests/integration/preview-page.test.tsx \
  tests/unit/preview-state.test.ts \
  tests/unit/digest-service.test.ts \
  tests/unit/digest-read-service.test.ts \
  tests/unit/digest-orchestration.test.ts \
  tests/unit/preview-digest-service.test.ts
pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add \
  src/lib/preview-state.ts \
  src/app/(app)/preview/page.tsx \
  src/app/(app)/today/page.tsx \
  src/app/(app)/history/[digestDayKey]/page.tsx \
  tests/integration/preview-page.test.tsx \
  tests/unit/preview-state.test.ts \
  tests/unit/digest-service.test.ts \
  tests/unit/digest-read-service.test.ts \
  tests/unit/digest-orchestration.test.ts \
  tests/unit/preview-digest-service.test.ts \
  tests/e2e/newsi-smoke.spec.ts
git commit -m "refactor: propagate topic markdown digest shape"
```

---

### Task 5: Full Regression Pass

**Files:**
- No new files
- Verify all modified files from Tasks 1-4

- [ ] **Step 1: Run the full unit/integration suite**

Run:

```bash
pnpm exec vitest run
```

Expected: PASS

- [ ] **Step 2: Run type-check**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Run lint**

Run:

```bash
pnpm exec eslint \
  src/lib/digest/provider.ts \
  src/lib/digest/schema.ts \
  src/lib/preview-state.ts \
  src/components/digest/digest-view.tsx \
  tests/unit/digest-provider.test.ts \
  tests/unit/digest-schema.test.ts \
  tests/integration/digest-view.test.tsx \
  tests/integration/preview-page.test.tsx \
  tests/unit/preview-state.test.ts \
  tests/unit/digest-service.test.ts \
  tests/unit/digest-read-service.test.ts \
  tests/unit/digest-orchestration.test.ts \
  tests/unit/preview-digest-service.test.ts \
  tests/e2e/newsi-smoke.spec.ts
```

Expected: PASS

- [ ] **Step 4: Run smoke e2e once more**

Run:

```bash
pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "test: verify topic markdown top events flow"
```

