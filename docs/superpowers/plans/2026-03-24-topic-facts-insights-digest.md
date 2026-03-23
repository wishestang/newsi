# Topic Facts-Insights Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current generic digest `sections` output with per-topic `events -> insights -> takeaway` blocks across Gemini generation, preview, today, and history detail pages.

**Architecture:** Keep the existing two-stage Gemini pipeline, but change both intermediate evidence and final digest schemas to be topic-centric. Stage 1 should return topic-grouped event pools; Stage 2 should synthesize those pools into a new `DigestResponse` shape consumed by a redesigned `DigestView`. Preview, Today, and History should keep their routing/state behavior and only switch to the new render structure.

**Tech Stack:** Next.js App Router, TypeScript, React Server Components, Zod, Vitest, Testing Library, Gemini provider via `@google/genai`

---

## File Map

### Existing files to modify

- `src/lib/digest/schema.ts`
  - Replace `sections` schema with `topics -> events -> insights -> takeaway`
- `src/lib/digest/evidence-schema.ts`
  - Replace flat `signals` structure with topic-grouped evidence
- `src/lib/digest/provider.ts`
  - Update Stage 1 evidence prompt/output parsing and Stage 2 digest synthesis prompt/output parsing
- `src/components/digest/digest-view.tsx`
  - Replace section-based rendering with topic blocks and subheadings
- `src/app/(app)/preview/page.tsx`
  - Pass new digest shape into `DigestView` in preview mode and local preview mode
- `src/app/(app)/today/page.tsx`
  - Pass new digest shape into `DigestView` in ready state and local preview ready state
- `src/app/(app)/history/[digestDayKey]/page.tsx`
  - Pass new digest shape into `DigestView`
- `src/lib/preview-state.ts`
  - Update local preview digest fixtures/helpers to the new digest shape
- `tests/unit/digest-schema.test.ts`
  - Update digest schema expectations
- `tests/unit/digest-provider.test.ts`
  - Update Gemini two-stage fixture outputs and assertions
- `tests/unit/preview-state.test.ts`
  - Update local preview digest shape and assertions
- `tests/integration/digest-view.test.tsx`
  - Update renderer assertions for topic/event/insight/takeaway layout
- `tests/integration/preview-page.test.tsx`
  - Update preview ready-state assertions
- `tests/integration/preview-actions.test.tsx`
  - Update preview confirm/retry fixtures if they use digest content

### Files likely unaffected but should be sanity-checked during implementation

- `src/lib/digest/service.ts`
- `src/lib/digest/view-state.ts`
- `src/app/(app)/history/page.tsx`
- `src/components/preview/preview-actions.tsx`

---

### Task 1: Replace Digest Schema With Topic Blocks

**Files:**
- Modify: `src/lib/digest/schema.ts`
- Test: `tests/unit/digest-schema.test.ts`

- [ ] **Step 1: Write the failing schema tests**

Add tests that assert the new digest shape is valid:

```ts
const validDigest = {
  title: "Today's Synthesis",
  intro: "Three tracked spaces moved in the last 24 hours.",
  readingTime: 6,
  topics: [
    {
      topic: "AI Agents",
      events: [
        {
          title: "OpenAI shipped a new agent builder",
          summary: "A new agent builder was released for enterprise teams.",
          keyFacts: ["Released on March 24", "Targets enterprise teams"],
        },
      ],
      insights: ["Agent builders are moving from demos into packaged workflows."],
      takeaway: "AI agent tooling is becoming easier to operationalize.",
    },
  ],
};

expect(() => digestResponseSchema.parse(validDigest)).not.toThrow();
```

Also add failing tests for:
- empty `topics`
- topic with empty `events`
- topic with empty `insights`
- missing `takeaway`

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/digest-schema.test.ts
```

Expected: FAIL because the schema still expects `sections`.

- [ ] **Step 3: Write minimal schema changes**

Update `src/lib/digest/schema.ts` to something equivalent to:

```ts
const digestEventSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  keyFacts: z.array(z.string().min(1)).min(1).max(6),
});

const digestTopicSchema = z.object({
  topic: z.string().min(1),
  events: z.array(digestEventSchema).min(1).max(5),
  insights: z.array(z.string().min(1)).min(1).max(3),
  takeaway: z.string().min(1),
});

export const digestResponseSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
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
git commit -m "refactor: model digests as topic insight blocks"
```

---

### Task 2: Replace Evidence Schema With Topic-Grouped Event Pools

**Files:**
- Modify: `src/lib/digest/evidence-schema.ts`
- Modify: `src/lib/digest/provider.ts`
- Test: `tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Write the failing provider tests**

Add/update tests so Stage 1 Gemini evidence now expects:

```ts
const evidence = {
  generatedAt: "2026-03-24T00:00:00Z",
  topics: [
    {
      topic: "AI Agents",
      searchQueries: ["latest AI agent launches last 24 hours"],
      events: [
        {
          title: "A new agent IDE launched",
          summary: "A new IDE focused on multi-agent workflows launched today.",
          sourceTitle: "Example",
          sourceUrl: "https://example.com/agent-ide",
          publishedAt: "2026-03-24T01:00:00Z",
        },
      ],
    },
  ],
};
```

Assertions should verify:
- evidence parsing passes
- Stage 2 input prompt embeds topic-grouped events
- final output still maps to `DigestResponse.topics`

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/digest-provider.test.ts
```

Expected: FAIL because evidence schema still expects flat `signals`.

- [ ] **Step 3: Write minimal schema and prompt changes**

Update `src/lib/digest/evidence-schema.ts` to:

```ts
export const topicEvidenceEventSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url(),
  publishedAt: z.string().min(1).optional(),
});

export const topicEvidenceSchema = z.object({
  topic: z.string().min(1),
  searchQueries: z.array(z.string().min(1)).min(1),
  events: z.array(topicEvidenceEventSchema).min(1).max(8),
});

export const evidenceBundleSchema = z.object({
  generatedAt: z.string().min(1),
  topics: z.array(topicEvidenceSchema).min(1).max(3),
});
```

Then update `src/lib/digest/provider.ts`:
- `buildEvidencePrompt()` should ask for topic-grouped events
- `buildDigestSynthesisPrompt()` should embed the new bundle
- `normalizeGeminiEvidenceBundle()` should parse the new schema

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/digest-provider.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/digest/evidence-schema.ts src/lib/digest/provider.ts tests/unit/digest-provider.test.ts
git commit -m "refactor: group Gemini evidence by topic events"
```

---

### Task 3: Update Final Gemini Digest Synthesis To Output Topic Blocks

**Files:**
- Modify: `src/lib/digest/provider.ts`
- Test: `tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Write the failing synthesis tests**

Add/update tests to require Stage 2 normalized digest objects shaped like:

```ts
{
  title: "Today's Synthesis",
  intro: "Three tracked spaces moved in the last 24 hours.",
  readingTime: 6,
  topics: [
    {
      topic: "AI Agents",
      events: [
        {
          title: "OpenAI shipped a new agent builder",
          summary: "The release targets enterprise workflow teams.",
          keyFacts: ["Released March 24", "Enterprise positioning"],
        },
      ],
      insights: ["Agent tooling is packaging workflow orchestration."],
      takeaway: "This topic is shifting from experimentation to productization.",
    },
  ],
}
```

Test failure modes:
- missing `takeaway`
- `events` empty
- `insights` empty

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/unit/digest-provider.test.ts
```

Expected: FAIL because `normalizeGeminiDigest()` and OpenAI response schema still expect `sections`.

- [ ] **Step 3: Write minimal provider changes**

Update `src/lib/digest/provider.ts` to:
- replace `openAIDigestResponseSchema.sections` with `topics`
- normalize Gemini output fields into:
  - `topic`
  - `events`
  - `insights`
  - `takeaway`
- allow Gemini to return `events` with moderate variance, but normalize into the strict schema before `parseDigestResult`

Recommended normalization shape:

```ts
const topics = rawTopics.map((topic) => ({
  topic: z.string().min(1).parse(topic.topic),
  events: rawEvents.map((event) => ({
    title: z.string().min(1).parse(event.title),
    summary: z.string().min(1).parse(event.summary),
    keyFacts: z.array(z.string().min(1)).min(1).max(6).parse(event.keyFacts),
  })),
  insights: z.array(z.string().min(1)).min(1).max(3).parse(topic.insights),
  takeaway: z.string().min(1).parse(topic.takeaway),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/unit/digest-provider.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/digest/provider.ts tests/unit/digest-provider.test.ts
git commit -m "refactor: synthesize topic facts and insights digests"
```

---

### Task 4: Redesign DigestView For Topic Blocks

**Files:**
- Modify: `src/components/digest/digest-view.tsx`
- Test: `tests/integration/digest-view.test.tsx`

- [ ] **Step 1: Write the failing view tests**

Replace section-based assertions with tests that require:
- topic heading renders
- `Top Events` subheading renders
- event title, summary, and key facts render
- `Insights` subheading renders
- `Takeaway` subheading renders

Example:

```tsx
render(
  <DigestView
    title="Today's Synthesis"
    intro="..."
    digestDate="MARCH 24, 2026"
    topics={[
      {
        topic: "AI Agents",
        events: [
          {
            title: "A new agent IDE launched",
            summary: "The IDE targets multi-agent workflows.",
            keyFacts: ["Launched March 24", "Targets enterprise teams"],
          },
        ],
        insights: ["Tooling is packaging orchestration into products."],
        takeaway: "Execution layers are becoming productized.",
      },
    ]}
  />,
);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/integration/digest-view.test.tsx
```

Expected: FAIL because `DigestView` still accepts and renders `sections`.

- [ ] **Step 3: Write minimal rendering changes**

Update `src/components/digest/digest-view.tsx`:
- replace `DigestSection` with `DigestTopic`
- render each topic block with:
  - topic heading
  - `Top Events`
  - event list/cards
  - `Insights`
  - `Takeaway`
- keep the existing article/date/footer shell

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/integration/digest-view.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/digest/digest-view.tsx tests/integration/digest-view.test.tsx
git commit -m "feat: render topic facts and insights digest blocks"
```

---

### Task 5: Update Preview, Today, History, and Local Preview Fixtures

**Files:**
- Modify: `src/app/(app)/preview/page.tsx`
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/app/(app)/history/[digestDayKey]/page.tsx`
- Modify: `src/lib/preview-state.ts`
- Test: `tests/unit/preview-state.test.ts`
- Test: `tests/integration/preview-page.test.tsx`
- Test: `tests/integration/preview-actions.test.tsx`

- [ ] **Step 1: Write the failing page and preview-state tests**

Update fixtures to use:

```ts
digest: {
  title: "Preview Daily Synthesis",
  intro: "Your tracked space moved in the last 24 hours.",
  topics: [
    {
      topic: "China Tech Policy",
      events: [
        {
          title: "A new platform policy was announced",
          summary: "A regulator published a fresh compliance notice.",
          keyFacts: ["Published March 24", "Applies to platform operators"],
        },
      ],
      insights: ["Policy cadence remains elevated this week."],
      takeaway: "Regulatory clarity is increasing, but operating scope is tightening.",
    },
  ],
}
```

Assertions should verify:
- preview ready page renders `Top Events`, `Insights`, `Takeaway`
- local preview ready state uses the same shape
- confirm/retry action tests still pass with the new fixture

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm exec vitest run tests/unit/preview-state.test.ts tests/integration/preview-page.test.tsx tests/integration/preview-actions.test.tsx
```

Expected: FAIL because local preview fixtures and page props still pass `sections`.

- [ ] **Step 3: Write minimal page and fixture changes**

Update:
- page components to pass `topics={content.topics}`
- local preview helpers to store mock digests with `topics`
- integration fixtures to match the new structure

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
pnpm exec vitest run tests/unit/preview-state.test.ts tests/integration/preview-page.test.tsx tests/integration/preview-actions.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(app)/preview/page.tsx' 'src/app/(app)/today/page.tsx' 'src/app/(app)/history/[digestDayKey]/page.tsx' src/lib/preview-state.ts tests/unit/preview-state.test.ts tests/integration/preview-page.test.tsx tests/integration/preview-actions.test.tsx
git commit -m "refactor: wire topic digest shape through app views"
```

---

### Task 6: Full Regression Pass

**Files:**
- Verify only

- [ ] **Step 1: Run focused digest regressions**

Run:

```bash
pnpm exec vitest run tests/unit/digest-schema.test.ts tests/unit/digest-provider.test.ts tests/unit/preview-state.test.ts tests/integration/digest-view.test.tsx tests/integration/preview-page.test.tsx tests/integration/preview-actions.test.tsx
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
pnpm exec eslint src/lib/digest/provider.ts src/lib/digest/schema.ts src/lib/digest/evidence-schema.ts src/components/digest/digest-view.tsx src/lib/preview-state.ts 'src/app/(app)/preview/page.tsx' 'src/app/(app)/today/page.tsx' 'src/app/(app)/history/[digestDayKey]/page.tsx' tests/unit/digest-provider.test.ts tests/unit/digest-schema.test.ts tests/unit/preview-state.test.ts tests/integration/digest-view.test.tsx tests/integration/preview-page.test.tsx tests/integration/preview-actions.test.tsx
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
git commit -m "test: verify topic facts-insights digest flow"
```

---

## Notes for Implementers

- Do not touch unrelated untracked i18n or auxiliary files in the worktree.
- Keep `DigestProvider.generate()` public contract unchanged.
- Prefer small normalization helpers over inflating `provider.ts` inline.
- Preserve the existing scheduled / failed / pending preview state machine; only change the ready-content shape.
- If digest rendering starts to bloat `digest-view.tsx`, splitting subcomponents such as `DigestTopicBlock` is acceptable, but only if tests stay focused and the file boundary remains clear.
