# Topic Markdown Format Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mechanical Top Events / Summary / Insight topic markdown format with a natural prose style: bold-titled numbered events, inline sources, optional data tables, and a closing blockquote assessment.

**Architecture:** Prompt-only change for the LLM output format (both OpenAI and Gemini paths), plus a blockquote style addition in the markdown renderer. Schema and data model are unchanged.

**Tech Stack:** TypeScript, Vitest, React, ReactMarkdown, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-24-topic-markdown-redesign-design.md`

---

### Task 1: Update digest prompt (OpenAI path)

**Files:**
- Modify: `src/lib/digest/prompt.ts:33-35`
- Modify: `tests/unit/digest-prompt.test.ts:27-36`

- [ ] **Step 1: Update the failing test**

In `tests/unit/digest-prompt.test.ts`, replace the third test to assert new format instructions instead of the old field names:

```ts
it("specifies the new topic markdown format in the output section", () => {
  const prompt = buildDigestPrompt({
    dateLabel: "2026-03-22",
    interestText: "AI agents",
  });

  expect(prompt).toContain("Do NOT use section headings");
  expect(prompt).toContain("3-7 numbered events");
  expect(prompt).toContain("blockquote");
  expect(prompt).not.toContain("summary, keyPoints, and whyItMatters");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/digest-prompt.test.ts`
Expected: FAIL — prompt still contains old field names

- [ ] **Step 3: Update `buildDigestPrompt` output section**

In `src/lib/digest/prompt.ts`, the `## Output` section is inside the template literal returned by `buildDigestPrompt` (lines 33-35). Replace the old output section text with the new format instructions.

Find this text inside the template literal:
```
## Output
Return structured JSON only. Use Markdown syntax only inside existing string fields such as summary, keyPoints, and whyItMatters.
```

Replace with:
```
## Output
Return structured JSON only.
The \`markdown\` field in each topic must follow this format:
- Do NOT use section headings like "### Top Events" or "### Summary"
- List 3-7 numbered events
- Each event: bold title (include key data/numbers in title), 1-3 sentences blending facts and analysis, one source link in parentheses at end of paragraph
- Use parentheses matching the language: ([Source](url)) for English, （[来源](url)）for Chinese
- When an event involves structured comparative data (multiple items needing rows/columns), you may add a markdown table right after the prose paragraph
- End with a blockquote (>) containing 1-2 sentences of overall trend assessment
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/digest-prompt.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/digest/prompt.ts tests/unit/digest-prompt.test.ts
git commit -m "feat: update digest prompt with new topic markdown format"
```

---

### Task 2: Update Gemini synthesis prompt

**Files:**
- Modify: `src/lib/digest/provider.ts:171-181` (inside `buildDigestSynthesisPrompt` template literal)
- Modify: `tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Write the failing test**

Add a new test in `tests/unit/digest-provider.test.ts` that asserts the synthesis prompt contains new format instructions and does not contain old ones:

```ts
it("synthesis prompt uses new markdown format instructions", async () => {
  process.env.LLM_PROVIDER = "gemini";
  process.env.GEMINI_API_KEY = "gemini-key";

  googleGenAIMock.generateContent.mockResolvedValueOnce({
    text: JSON.stringify({
      topics: [
        {
          topic: "AI coding",
          markdown:
            "### Signals\n\n1. **Signal**\n   A new release.\n   [来源：Source · 2026-03-24](https://example.com/source)",
        },
      ],
    }),
  });
  googleGenAIMock.generateContent.mockResolvedValueOnce({
    text: JSON.stringify({
      title: "Daily Digest",
      topics: [
        {
          topic: "AI coding",
          markdown:
            "1. **Signal**\n   A new release landed today.\n   （[Source](https://example.com/source)）\n\n> AI coding keeps iterating.",
        },
      ],
    }),
  });

  const { createDigestProvider } = await import("@/lib/digest/provider");
  const provider = createDigestProvider();
  await provider.generate({ prompt: "test" });

  const synthesisPrompt =
    googleGenAIMock.generateContent.mock.calls[1][0]?.contents;
  expect(synthesisPrompt).toContain("Do NOT use section headings");
  expect(synthesisPrompt).toContain("3-7 numbered events");
  expect(synthesisPrompt).toContain("blockquote");
  expect(synthesisPrompt).not.toContain('"### Top Events" heading');
  expect(synthesisPrompt).not.toContain('"Insight:" line');
  expect(synthesisPrompt).not.toContain('"### Summary" heading');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/digest-provider.test.ts`
Expected: FAIL — synthesis prompt still has old format instructions

- [ ] **Step 3: Update `buildDigestSynthesisPrompt`**

In `src/lib/digest/provider.ts`, inside the `buildDigestSynthesisPrompt` template literal, replace lines 176-181 (the markdown format instructions). The surrounding lines 171-175 (`Return exactly one JSON object...` through `Keep topics between 1 and 3.`) stay unchanged:

```ts
// Before:
Return exactly one JSON object for the final digest.
Required fields: title, intro, readingTime, topics.
- intro is optional.
- topics must be an array with fields: topic, markdown.
- Keep topics between 1 and 3.
- markdown must contain:
  - a "### Top Events" heading
  - up to 7 numbered events
  - each event must include a factual description, an "Insight:" line, and one clickable markdown source link
  - a "### Summary" heading followed by a short summary paragraph
- do not use extra sections outside "Top Events" and "Summary".

// After:
Return exactly one JSON object for the final digest.
Required fields: title, intro, readingTime, topics.
- intro is optional.
- topics must be an array with fields: topic, markdown.
- Keep topics between 1 and 3.
- markdown format rules:
  - Do NOT use section headings like "### Top Events" or "### Summary"
  - List 3-7 numbered events
  - Each event: bold title (include key data/numbers in title), 1-3 sentences blending facts and analysis into natural prose, one source link in parentheses at end of paragraph
  - Use parentheses matching the language: ([Source](url)) for English, （[来源](url)）for Chinese
  - When an event involves structured comparative data (multiple items needing rows/columns), you may add a markdown table right after the prose paragraph
  - Do not use a table if the data fits in a single sentence
  - End with a blockquote (>) containing 1-2 sentences of overall trend assessment — no fixed prefix required
```

- [ ] **Step 4: Update existing test fixtures**

The `buildTopic` helper in `tests/unit/digest-provider.test.ts` uses the old format. Update it:

```ts
function buildTopic(index: number) {
  return {
    topic: `Topic ${index}`,
    markdown: [
      `1. **Event ${index}，关键数据上涨 ${index}0%**`,
      `   Event ${index} moved in the last 24 hours, reflecting broader trends in the space.`,
      `   （[来源 ${index}](https://example.com/${index})）`,
      "",
      `> Takeaway ${index}`,
    ].join("\n"),
  };
}
```

Also update the "builds a normalized topic-grouped evidence bundle" test:

1. Replace the `stageTwoResponse` fixture to use new-format markdown:
```ts
const stageTwoResponse = {
  text: '```json\n{"title":"每日情报摘要","intro":"今天最值得关注的是 AI coding 的新发布。","topics":[{"topic":"AI coding","markdown":"1. **OpenAI 发布了新的编程模型**\\n   新版本今天正式上线，迭代速度加快。（[OpenAI · 2026-03-24](https://example.com/openai)）\\n\\n> AI coding 仍是今天最相关的主题。"}]}\n```',
};
```

2. Change the `toMatchObject` assertion from `expect.stringContaining("### Summary")` to `expect.stringContaining("> ")`.

- [ ] **Step 5: Run all provider tests**

Run: `npx vitest run tests/unit/digest-provider.test.ts`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/digest/provider.ts tests/unit/digest-provider.test.ts
git commit -m "feat: update Gemini synthesis prompt with new topic markdown format"
```

---

### Task 3: Update digest view tests for new format

**Files:**
- Modify: `tests/integration/digest-view.test.tsx`

- [ ] **Step 1: Update test fixtures and assertions**

Replace the old-format markdown fixtures and assertions with new-format ones:

```tsx
const defaultProps = {
  title: "Today's Synthesis",
  intro: "Two signals stood out across your tracked space today.",
  digestDate: "OCTOBER 24, 2023",
  topics: [
    {
      topic: "AI Agents",
      markdown: [
        "1. **A new agent IDE launched, adoption up 200%**",
        "   The IDE targets multi-agent workflows and saw rapid early adoption.",
        "   （[Example](https://example.com)）",
        "",
        "> Execution layers are becoming productized.",
      ].join("\n"),
    },
  ],
};
```

Update the "renders top events and summary headings" test to instead verify the new format elements:

```tsx
it("renders event content and closing assessment blockquote", () => {
  render(<DigestView {...defaultProps} />);

  expect(screen.getByText(/A new agent IDE launched/)).toBeInTheDocument();
  expect(screen.getByText(/adoption up 200%/)).toBeInTheDocument();
  expect(
    screen.getByText(/The IDE targets multi-agent workflows/),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Execution layers are becoming productized\./),
  ).toBeInTheDocument();
  expect(screen.queryByText("Top Events")).not.toBeInTheDocument();
  expect(screen.queryByText("Summary")).not.toBeInTheDocument();
});
```

Update the "renders markdown emphasis and links" test inline fixture:

```tsx
markdown: [
  "1. **A bold move**",
  "   This topic changed quickly. See **why** this matters.",
  "   [source](https://example.com)",
  "",
  "> One **clear** takeaway.",
].join("\n"),
```

Update the "does not render unsafe javascript links" test inline fixture:

```tsx
markdown: [
  "1. **Unsafe item**",
  "   Summary text. Unsafe [link](javascript:alert(1))",
  "",
  "> Takeaway text.",
].join("\n"),
```

- [ ] **Step 2: Run tests to verify they pass (content renders regardless of styling)**

Run: `npx vitest run tests/integration/digest-view.test.tsx`
Expected: All tests PASS (content renders regardless of blockquote styling). If any fail, fix the fixture.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/digest-view.test.tsx
git commit -m "test: update digest view fixtures to new topic markdown format"
```

---

### Task 4: Add blockquote styling to DigestMarkdown

**Files:**
- Modify: `src/components/digest/digest-markdown.tsx:38-67`
- Modify: `tests/integration/digest-view.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test in `tests/integration/digest-view.test.tsx`:

```tsx
it("renders closing assessment in a styled blockquote", () => {
  render(<DigestView {...defaultProps} />);

  const blockquote = document.querySelector("blockquote");
  expect(blockquote).toBeInTheDocument();
  expect(blockquote).toHaveClass("border-l-2");
  expect(blockquote?.textContent).toContain(
    "Execution layers are becoming productized.",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/integration/digest-view.test.tsx`
Expected: FAIL — blockquote exists but has no `border-l-2` class (no custom component mapped)

- [ ] **Step 3: Add blockquote component to DigestMarkdown**

In `src/components/digest/digest-markdown.tsx`, add to the `components` map:

```tsx
blockquote: ({ children }) => (
  <blockquote className="border-l-2 border-[var(--border-solid)] pl-4 text-[var(--text-muted)]">
    {children}
  </blockquote>
),
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run tests/integration/digest-view.test.tsx`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/digest/digest-markdown.tsx tests/integration/digest-view.test.tsx
git commit -m "feat: add blockquote styling for topic closing assessment"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Commit if any fixups needed**

If any tests needed fixing, commit the fixes.
