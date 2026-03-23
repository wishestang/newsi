# Gemini Search Grounding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real Google Search grounding to the Gemini digest provider while preserving the existing digest schema, UI, and higher-level generation flows.

**Architecture:** Keep the existing `DigestProvider` abstraction unchanged and replace only the Gemini provider internals. The Gemini path will move from the OpenAI compatibility client to the official Google Gemini client with `google_search` enabled, then normalize the response back into the existing `DigestResponse` shape.

**Tech Stack:** Next.js, TypeScript, Vitest, Zod, OpenAI SDK, Google GenAI SDK, Prisma

---

## File Map

- Modify: `package.json`
  - Add the Google Gemini SDK dependency needed for native Google Search grounding.
- Modify: `src/lib/digest/provider.ts`
  - Replace Gemini OpenAI-compatibility calls with native Gemini API calls using `google_search`.
  - Keep OpenAI behavior unchanged.
  - Continue returning `DigestResponse`.
- Modify: `tests/unit/digest-provider.test.ts`
  - Replace Gemini provider tests that currently assert OpenAI compatibility behavior.
  - Add tests for native Gemini grounding, JSON parsing, and configuration failures.

## Task 1: Add the Gemini SDK Dependency

**Files:**
- Modify: `/Users/bytedance/Documents/newsi/package.json`

- [ ] **Step 1: Confirm there is no existing Google Gemini SDK dependency**

Run:

```bash
cat /Users/bytedance/Documents/newsi/package.json
```

Expected: `dependencies` does not include `@google/genai`.

- [ ] **Step 2: Add the dependency**

Update `package.json` and add:

```json
"@google/genai": "^1.0.0"
```

Place it in `dependencies`, not `devDependencies`.

- [ ] **Step 3: Commit**

```bash
git add /Users/bytedance/Documents/newsi/package.json
git commit -m "chore: add Google GenAI dependency"
```

## Task 2: Define the Failing Gemini Provider Tests

**Files:**
- Modify: `/Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts`
- Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/provider.ts`

- [ ] **Step 1: Replace the current Gemini compatibility expectation with native grounding tests**

Update the Gemini-focused tests so they assert the new behavior:

- `createDigestProvider()` with `LLM_PROVIDER=gemini` instantiates the Google Gemini client
- Gemini requests include the `google_search` tool
- Gemini still returns a valid `DigestResponse`

Add a failing test that checks for a request payload shaped like:

```ts
expect(generateContent).toHaveBeenCalledWith(
  expect.objectContaining({
    model: "gemini-2.5-flash",
    contents: "Generate a digest about AI agents and design tools.",
    config: expect.objectContaining({
      tools: [{ googleSearch: {} }],
    }),
  }),
);
```

Use the exact request shape that matches the SDK style chosen in implementation.

- [ ] **Step 2: Add a failing test for malformed Gemini JSON output**

Add a test that returns invalid JSON content from Gemini and asserts:

```ts
await expect(provider.generate({ prompt: "test" })).rejects.toThrow(
  "Gemini did not return valid JSON digest output.",
);
```

- [ ] **Step 3: Add a failing test for missing Gemini API key**

Ensure:

```ts
await expect(provider.generate({ prompt: "test" })).rejects.toThrow(
  "GEMINI_API_KEY or LLM_API_KEY is not configured.",
);
```

- [ ] **Step 4: Run the focused test file and verify it fails for the expected reason**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
```

Expected: FAIL because the provider still uses OpenAI compatibility behavior.

- [ ] **Step 5: Commit**

```bash
git add /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
git commit -m "test: define Gemini search grounding behavior"
```

## Task 3: Implement Native Gemini Search Grounding

**Files:**
- Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/provider.ts`

- [ ] **Step 1: Import the Google Gemini SDK and define the Gemini client interface**

Add the minimal imports and types needed for:

- client construction
- `models.generateContent(...)`
- text extraction from the response

Do not change the `DigestProvider` public interface.

- [ ] **Step 2: Replace the Gemini OpenAI-compatibility client with the native Gemini client**

Change `createGeminiDigestProvider()` so it:

- reads `GEMINI_API_KEY ?? LLM_API_KEY`
- instantiates the Google Gemini client
- sends the user prompt through the native Gemini API
- enables Google Search grounding in the request config

Keep OpenAI provider logic unchanged.

- [ ] **Step 3: Require JSON-only output from Gemini and parse it locally**

In the Gemini prompt wrapper or request config, instruct Gemini to return only JSON matching the existing digest schema.

Then:

```ts
const parsed = JSON.parse(text);
return finalizeDigest(parsed);
```

Wrap parsing failures and throw a clear error:

```ts
throw new Error("Gemini did not return valid JSON digest output.");
```

- [ ] **Step 4: Preserve existing normalization rules**

Keep:

- `finalizeDigest(...)`
- `normalizeDigestSections(...)`
- `parseDigestResult(...)`

This avoids changing UI or downstream consumers.

- [ ] **Step 5: Run the focused provider test file and verify it passes**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add /Users/bytedance/Documents/newsi/src/lib/digest/provider.ts /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts
git commit -m "feat: add Gemini search grounding"
```

## Task 4: Run Regression Verification

**Files:**
- Modify: `/Users/bytedance/Documents/newsi/src/lib/digest/provider.ts`
- Modify: `/Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Run unit tests for the provider and generation flows**

Run:

```bash
pnpm exec vitest run /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts /Users/bytedance/Documents/newsi/tests/unit/preview-digest-service.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the full unit test suite**

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

- [ ] **Step 4: Commit the verification-safe final state**

```bash
git add /Users/bytedance/Documents/newsi/src/lib/digest/provider.ts /Users/bytedance/Documents/newsi/tests/unit/digest-provider.test.ts /Users/bytedance/Documents/newsi/package.json
git commit -m "test: verify Gemini search grounding integration"
```

## Task 5: Post-Implementation Manual Verification

**Files:**
- No new files

- [ ] **Step 1: Deploy the branch or push to the tracked environment**

Use the project’s standard git/Vercel workflow so the updated Gemini provider reaches the running app.

- [ ] **Step 2: Generate a preview digest with `LLM_PROVIDER=gemini`**

Use a recent, news-sensitive topic such as:

```text
AI agents, China tech policy, developer tools
```

Expected: the content should reflect fresh web information rather than broad background synthesis.

- [ ] **Step 3: Compare before/after output quality**

Check for:

- fewer stale summaries
- stronger recency cues
- more specific references to recent events

- [ ] **Step 4: If quality is still weak, capture examples for the next spec**

Document whether the next iteration should prioritize:

- freshness constraints
- section-count relaxation
- citation display

