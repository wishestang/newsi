# Digest Prompt Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade digest generation so the model produces richer, language-matched, Markdown-capable output without changing the stored digest shape.

**Architecture:** Keep one universal prompt entrypoint in `src/lib/digest/prompt.ts`, widen only the existing schema constraints in `src/lib/digest/schema.ts` and `src/lib/digest/provider.ts`, and render Markdown inside existing digest text fields in the view layer. Isolate Markdown rendering and link sanitization in a small helper component so `DigestView` stays focused on layout.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, OpenAI SDK, Vitest, React Testing Library, Tailwind CSS, `react-markdown`, `remark-gfm`

---

## Implementation Notes

- Keep the digest JSON shape unchanged: no new fields for tables, citations, or structured metadata.
- Preserve the current provider normalization boundary: provider schema keeps `whyItMatters: nullable()`, app schema keeps `whyItMatters: optional()`.
- Do not add topic classification, prompt routing, or a second LLM pass.
- Do not silently truncate oversized model output; schema validation should still fail if the response exceeds the relaxed limits.
- Keep the static UI chrome unchanged. Only LLM-provided text fields gain Markdown rendering.
- Before touching Next.js component code, read the relevant local docs:
  - `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  - `node_modules/next/dist/docs/01-app/02-guides/third-party-libraries.md`
  - `node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md`

## Planned File Structure

### Create

- `tests/unit/digest-prompt.test.ts`
- `src/components/digest/digest-markdown.tsx`

### Modify

- `package.json`
- `pnpm-lock.yaml`
- `src/lib/digest/prompt.ts`
- `src/lib/digest/schema.ts`
- `src/lib/digest/provider.ts`
- `src/components/digest/digest-view.tsx`
- `tests/unit/digest-schema.test.ts`
- `tests/unit/digest-provider.test.ts`
- `tests/integration/digest-view.test.tsx`

## File Responsibilities

- `src/lib/digest/prompt.ts`
  Own the single universal digest prompt and keep the function signature unchanged.
- `tests/unit/digest-prompt.test.ts`
  Lock down prompt requirements such as language matching, Markdown allowance, and domain-example guidance.
- `src/lib/digest/schema.ts`
  Define app-level validation limits for stored and rendered digests.
- `src/lib/digest/provider.ts`
  Keep provider parsing limits in sync with app-level limits while preserving `nullable()` to `optional()` normalization.
- `src/components/digest/digest-markdown.tsx`
  Render Markdown safely for digest text fields, including GFM tables and safe links.
- `src/components/digest/digest-view.tsx`
  Keep digest layout and spacing, delegating content rendering to the Markdown helper.
- `tests/integration/digest-view.test.tsx`
  Prove Markdown rendering, safe link handling, and backward compatibility with plain text.

## Task 1: Rewrite the Universal Prompt Under Test

**Files:**
- Create: `tests/unit/digest-prompt.test.ts`
- Modify: `src/lib/digest/prompt.ts`

- [ ] **Step 1: Write the failing prompt tests**

Create `tests/unit/digest-prompt.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildDigestPrompt } from "@/lib/digest/prompt";

describe("buildDigestPrompt", () => {
  it("keeps one universal prompt with quality requirements", () => {
    const prompt = buildDigestPrompt({
      dateLabel: "March 22, 2026",
      interestText: "US stocks",
    });

    expect(prompt).toContain("expert research analyst");
    expect(prompt).toContain("## Content Quality Requirements");
    expect(prompt).toContain("## Depth Guidelines");
    expect(prompt).not.toContain("finance template");
  });

  it("requires matching the language of the standing brief", () => {
    const prompt = buildDigestPrompt({
      dateLabel: "2026-03-22",
      interestText: "美股",
    });

    expect(prompt).toContain("MUST be in Chinese");
    expect(prompt).toContain("Match the user's language exactly");
  });

  it("allows markdown inside existing string fields", () => {
    const prompt = buildDigestPrompt({
      dateLabel: "2026-03-22",
      interestText: "AI agents",
    });

    expect(prompt).toContain("Markdown");
    expect(prompt).toContain("tables");
    expect(prompt).toContain("summary, keyPoints, whyItMatters");
  });
});
```

- [ ] **Step 2: Run the focused prompt test to confirm it fails**

Run:

```bash
pnpm test -- tests/unit/digest-prompt.test.ts
```

Expected:

- FAIL because the current prompt does not include the new role, section headings, or Markdown guidance

- [ ] **Step 3: Rewrite `buildDigestPrompt()` with the approved structure**

Update `src/lib/digest/prompt.ts` so the returned template follows the validated spec shape:

```ts
export function buildDigestPrompt({
  dateLabel,
  interestText,
}: {
  dateLabel: string;
  interestText: string;
}) {
  return `
You are an expert research analyst generating a personal daily intelligence briefing.

Date: ${dateLabel}
Standing brief: ${interestText}

## Your Task
Based on the standing brief above, search for the most recent and relevant information as of the given date. Produce a thorough, data-rich daily digest.

## Content Quality Requirements
- Be SPECIFIC: include real names, numbers, percentages, prices, dates
- Be ANALYTICAL: don't just state facts — explain WHY things happened and what they mean
- Be DATA-DRIVEN: when covering markets, stocks, sports, or any quantifiable topic, include actual figures in tables
- Use Markdown formatting within JSON string fields: **bold** for emphasis, tables for structured data, bullet lists for details
- Cite sources when possible (e.g. "according to Reuters", "per SEC filing")
- Each section should feel like a mini-briefing from a domain expert, not a generic summary

## Depth Guidelines
- For financial or market topics: include index levels, price changes, individual stock moves, and the reason behind them
- For technology topics: include specific products, companies, launches, technical details, and competitive implications
- For any topic: go beyond headlines and explain context, causation, and forward-looking implications

## Language
Respond in the same language as the standing brief above. If the standing brief is written in Chinese, all output text (title, intro, section titles, summaries, key points, whyItMatters) MUST be in Chinese. Match the user's language exactly.

## Output
Return structured JSON only. Use Markdown syntax only inside existing string fields such as summary, keyPoints, and whyItMatters.
`;
}
```

- [ ] **Step 4: Run the prompt test again**

Run:

```bash
pnpm test -- tests/unit/digest-prompt.test.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit the prompt rewrite**

Run:

```bash
git add src/lib/digest/prompt.ts tests/unit/digest-prompt.test.ts
git commit -m "feat: strengthen digest prompt guidance"
```

## Task 2: Relax Schema Bounds and Sync Provider Parsing

**Files:**
- Modify: `src/lib/digest/schema.ts`
- Modify: `src/lib/digest/provider.ts`
- Modify: `tests/unit/digest-schema.test.ts`
- Modify: `tests/unit/digest-provider.test.ts`

- [ ] **Step 1: Expand the failing schema and provider tests**

Update `tests/unit/digest-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { digestResponseSchema } from "@/lib/digest/schema";

function buildSection(index: number) {
  return {
    title: `Section ${index}`,
    summary: ["Paragraph one", "Paragraph two", "Paragraph three", "Paragraph four", "Paragraph five", "Paragraph six"],
    keyPoints: ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"],
    whyItMatters: "Why this matters",
  };
}

describe("digestResponseSchema", () => {
  it("accepts richer digests up to the new limits", () => {
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 20,
      sections: Array.from({ length: 8 }, (_, index) => buildSection(index + 1)),
    });

    expect(result.success).toBe(true);
  });

  it("still rejects digests with too few sections", () => {
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      sections: [],
    });

    expect(result.success).toBe(false);
  });
});
```

Append the following `it()` block inside the existing `describe("digest provider", ...)` block in `tests/unit/digest-provider.test.ts`, after the last `it()` at line 168 (before the closing `});` of the describe):

```ts
it("normalizes nullable whyItMatters while accepting the new upper bounds", async () => {
  const sections = Array.from({ length: 8 }, (_, index) => ({
    title: `Section ${index + 1}`,
    summary: ["a", "b", "c", "d", "e", "f"],
    keyPoints: ["1", "2", "3", "4", "5", "6", "7", "8"],
    whyItMatters: index === 0 ? null : `Reason ${index + 1}`,
  }));

  const client = {
    responses: {
      parse: vi.fn().mockResolvedValue({
        output_parsed: {
          title: "Today's Synthesis",
          intro: "Two signals stood out today.",
          readingTime: 20,
          sections,
        },
      }),
    },
  };

  const { createOpenAIDigestProvider } = await import("@/lib/digest/provider");
  const provider = createOpenAIDigestProvider({ apiKey: "test-key", client });

  const result = await provider.generate({ prompt: "test" });

  expect(result.sections).toHaveLength(8);
  expect(result.sections[0]).not.toHaveProperty("whyItMatters");
  expect(result.sections[1]?.whyItMatters).toBe("Reason 2");
});
```

- [ ] **Step 2: Run the focused schema and provider tests to confirm they fail**

Run:

```bash
pnpm test -- tests/unit/digest-schema.test.ts tests/unit/digest-provider.test.ts
```

Expected:

- FAIL because the current max limits are still `5 / 4 / 5 / 12`

- [ ] **Step 3: Relax the schema limits and keep normalization intact**

Update `src/lib/digest/schema.ts`:

```ts
export const digestResponseSchema = z.object({
  title: z.string().min(1),
  intro: z.string().min(1),
  readingTime: z.number().int().min(3).max(20),
  sections: z
    .array(
      z.object({
        title: z.string().min(1),
        summary: z.array(z.string().min(1)).min(2).max(6),
        keyPoints: z.array(z.string().min(1)).min(2).max(8),
        whyItMatters: z.string().min(1).optional(),
      }),
    )
    .min(3)
    .max(8),
});
```

Mirror the same numeric limits inside `openAIDigestResponseSchema` in `src/lib/digest/provider.ts`, but keep:

```ts
whyItMatters: z.string().min(1).nullable()
```

Do not change `normalizeDigestSections()` beyond what is needed to keep the test passing.

- [ ] **Step 4: Run the schema and provider tests again**

Run:

```bash
pnpm test -- tests/unit/digest-schema.test.ts tests/unit/digest-provider.test.ts
```

Expected:

- PASS

- [ ] **Step 5: Commit the schema sync**

Run:

```bash
git add src/lib/digest/schema.ts src/lib/digest/provider.ts tests/unit/digest-schema.test.ts tests/unit/digest-provider.test.ts
git commit -m "feat: relax digest schema limits"
```

## Task 3: Add Safe Markdown Rendering to DigestView

**Files:**
- Create: `src/components/digest/digest-markdown.tsx`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `src/components/digest/digest-view.tsx`
- Modify: `tests/integration/digest-view.test.tsx`

- [ ] **Step 1: Write the failing digest view tests**

Replace the contents of `tests/integration/digest-view.test.tsx`. Keep `defaultProps` using plain text (for backward-compat coverage). Remove the existing colon-split tests ("renders key points with bold labels when colon is present" and "renders key points without colon as plain text") since the colon-split behavior is intentionally removed in favor of Markdown rendering. Add new Markdown-specific test cases:

```ts
it("renders plain-text digests correctly (backward compat)", () => {
  render(<DigestView {...defaultProps} />);

  expect(screen.getByText("A first summary paragraph.")).toBeInTheDocument();
  expect(screen.getByText(/Speed/)).toBeInTheDocument();
  expect(screen.getByText(/Faster than before/)).toBeInTheDocument();
  expect(screen.getByText("Point two")).toBeInTheDocument();
});

it("renders markdown emphasis and links inside digest content", () => {
  render(
    <DigestView
      {...defaultProps}
      sections={[
        {
          title: "AI Agents",
          summary: ["A **bold** move with [source](https://example.com)."],
          keyPoints: ["- First point", "- Second point"],
          whyItMatters: "See **why** this matters.",
        },
      ]}
    />,
  );

  expect(screen.getByText("bold")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "source" })).toHaveAttribute(
    "href",
    "https://example.com",
  );
  expect(screen.getByText("First point")).toBeInTheDocument();
  expect(screen.getByText("why")).toBeInTheDocument();
});

it("does not render unsafe javascript links", () => {
  render(
    <DigestView
      {...defaultProps}
      sections={[
        {
          title: "AI Agents",
          summary: ["Unsafe [link](javascript:alert(1))"],
          keyPoints: ["Point one", "Point two"],
        },
      ]}
    />,
  );

  expect(screen.queryByRole("link", { name: "link" })).not.toBeInTheDocument();
  expect(screen.getByText("link")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the digest view test to confirm it fails**

Run:

```bash
pnpm test -- tests/integration/digest-view.test.tsx
```

Expected:

- FAIL because the current view renders plain text and still uses colon-splitting for key points

- [ ] **Step 3: Add the Markdown dependencies**

Run:

```bash
pnpm add react-markdown@^9 remark-gfm@^4
```

Expected:

- `package.json` and `pnpm-lock.yaml` update with the new runtime dependencies

- [ ] **Step 4: Implement a focused Markdown helper and integrate it into the view**

Create `src/components/digest/digest-markdown.tsx`. Since `react-markdown` uses client-side React features, add `"use client"` at the top if `DigestView` is rendered as a server component (check whether `digest-view.tsx` or its parent has `"use client"`):

```tsx
"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function getSafeHref(href?: string) {
  if (!href) return null;
  return /^https?:\/\//.test(href) ? href : null;
}

function SafeLink({
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  const safeHref = getSafeHref(href);

  if (!safeHref) {
    return <>{children}</>;
  }

  return (
    <a
      {...props}
      href={safeHref}
      rel="noreferrer noopener"
      target="_blank"
      className="text-foreground underline underline-offset-2"
    >
      {children}
    </a>
  );
}

export function DigestMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="font-sans text-[17px] leading-[28.9px] text-[var(--text-body)]">
            {children}
          </p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        a: ({ children, href, ...props }) => (
          <SafeLink href={href} {...props}>
            {children}
          </SafeLink>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">{children}</table>
          </div>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

Update `src/components/digest/digest-view.tsx` so `summary`, `keyPoints`, and `whyItMatters` render with `DigestMarkdown`, and remove the colon-split logic from `KeyPoint`.

- [ ] **Step 5: Run the digest view tests again**

Run:

```bash
pnpm test -- tests/integration/digest-view.test.tsx
```

Expected:

- PASS

- [ ] **Step 6: Commit the Markdown rendering work**

Run:

```bash
git add package.json pnpm-lock.yaml src/components/digest/digest-markdown.tsx src/components/digest/digest-view.tsx tests/integration/digest-view.test.tsx
git commit -m "feat: render markdown in digest content"
```

## Task 4: Run Final Focused Verification

**Files:**
- Modify: none
- Test: `tests/unit/digest-prompt.test.ts`
- Test: `tests/unit/digest-schema.test.ts`
- Test: `tests/unit/digest-provider.test.ts`
- Test: `tests/integration/digest-view.test.tsx`

- [ ] **Step 1: Run the full targeted digest test suite**

Run:

```bash
pnpm test -- tests/unit/digest-prompt.test.ts tests/unit/digest-schema.test.ts tests/unit/digest-provider.test.ts tests/integration/digest-view.test.tsx
```

Expected:

- PASS for all digest prompt, schema, provider, and digest view coverage

- [ ] **Step 2: Run a type check**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected:

- PASS with no new type errors from the Markdown helper or schema updates

- [ ] **Step 3: Record manual verification steps for the executor**

Use this checklist in the implementation session:

```md
- Set the standing brief to `美股`
- Generate a digest in preview or formal flow
- Confirm all digest content is in Chinese
- Confirm at least one section contains concrete numbers or percentages
- Confirm Markdown emphasis and any table layout render correctly
- Confirm plain-text historic digests still render without layout regressions
```
