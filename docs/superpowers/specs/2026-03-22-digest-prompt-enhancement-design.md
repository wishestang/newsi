# Digest Prompt Enhancement — Design Spec

**Date:** 2026-03-22
**Status:** Draft

## Problem

The current digest generation prompt is too generic (5 lines of instruction), producing shallow, headline-level summaries. When a user enters a topic like "美股" (US stocks), the output is vague and lacks specific data (index levels, stock prices, percentage changes, causal analysis). Additionally, all output is in English regardless of the user's language.

## Solution

Enhance the prompt to guide the LLM toward data-rich, expert-level output with Markdown formatting support. No domain-specific templates — the prompt provides universal quality principles that the LLM applies to any topic.

## Approach

**Method:** Pure prompt enhancement + Markdown rendering (Schema structure unchanged)

### 1. Prompt Rewrite (`src/lib/digest/prompt.ts`)

Replace the current minimal prompt with a detailed research analyst brief:

```typescript
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
- Cite sources when possible (e.g., "according to Reuters", "per SEC filing")
- Each section should feel like a mini-briefing from a domain expert, not a generic summary

## Depth Guidelines
- For financial/market topics: include index levels, price changes (%), individual stock data with reasons, sector analysis
- For technology topics: specific product names, company announcements, technical details, competitive implications
- For any topic: go beyond headlines — provide context, causation, and forward-looking implications

## Language
Respond in the same language as the standing brief. If the standing brief is in Chinese, ALL output text (title, intro, section titles, summaries, key points, whyItMatters) MUST be in Chinese.

## Output
Return structured JSON only. Use Markdown syntax within string fields (summary, keyPoints, whyItMatters) for rich formatting including tables, bold, and lists.
`;
}
```

**Key changes from current prompt:**
- Role elevated from "synthesis generator" to "expert research analyst"
- Explicit data quality requirements (numbers, percentages, names)
- Analytical depth guidance (causation, implications, not just facts)
- Markdown formatting instruction for tables and rich text
- Domain-specific depth hints (financial, tech, etc.)
- Language matching rule

### 2. Schema Relaxation (`src/lib/digest/schema.ts`)

Structure stays the same. Constraints relaxed to accommodate richer content:

| Field | Current | New | Reason |
|---|---|---|---|
| `sections` max | 5 | 8 | Complex topics need more sections |
| `summary` items max | 4 | 6 | Markdown tables are longer |
| `keyPoints` items max | 5 | 8 | More detailed analysis |
| `readingTime` max | 12 | 20 | Richer content = longer read |

The same constraint changes apply to the duplicated `openAIDigestResponseSchema` in `provider.ts`.

**Note on schema divergence:** `provider.ts` uses `.nullable()` for `whyItMatters` while `schema.ts` uses `.optional()`. This is intentional — the `normalizeDigestSections()` function in `provider.ts` bridges the gap by stripping null values. This divergence must be preserved; only the array/number constraints should be synced.

**Backward compatibility:** All changes are constraint relaxations (wider ranges). Existing stored digests remain valid.

### 3. Frontend Markdown Rendering (`src/components/digest/digest-view.tsx`)

**New dependencies:**
- `react-markdown@^9` (ESM, React 18+) — Markdown to React components
- `remark-gfm@^4` — GitHub Flavored Markdown plugin (tables, strikethrough, etc.; v4 required for react-markdown v9)

**Security:** Do NOT include `rehype-raw`. All raw HTML in Markdown strings is rendered as plain text. Link hrefs must be validated to prevent `javascript:` URLs — use a custom `<a>` component that only allows `http:` and `https:` protocols.

**Changes:**
- `summary` paragraphs: wrap each string in `<ReactMarkdown>` instead of plain `<p>`
- `KeyPoint` component: replace the colon-split logic with `<ReactMarkdown>` rendering
- `whyItMatters` paragraph: wrap in `<ReactMarkdown>` (currently plain `<p>`, but the prompt instructs Markdown usage in this field)
- Custom component overrides for `<table>`, `<strong>`, `<a>` to match the existing design system (font sizes, colors, spacing)

**No structural layout changes** — the section/title/footer layout stays identical.

**Note:** The "End of Digest" footer and other static UI text remain in English. Language matching applies only to LLM-generated content. UI i18n is out of scope.

## Files Changed

| File | Change |
|---|---|
| `src/lib/digest/prompt.ts` | Rewrite prompt |
| `src/lib/digest/schema.ts` | Relax array/number constraints |
| `src/lib/digest/provider.ts` | Sync `openAIDigestResponseSchema` array/number constraints (preserve `.nullable()` divergence) |
| `src/components/digest/digest-view.tsx` | Add ReactMarkdown rendering |
| `package.json` | Add `react-markdown`, `remark-gfm` |

## Out of Scope

- Domain-specific prompt templates (e.g., a "finance template" vs "tech template")
- Two-stage LLM calls (plan then execute)
- Schema structural changes (new fields like `tables`, `dataHighlights`)
- Changes to the cron schedule, retry logic, or generation service
- Changes to the topics input form or interest profile storage

## Testing

- Unit tests for `buildDigestPrompt` — verify language instruction is present, verify Markdown instruction is present
- Update existing tests:
  - `tests/unit/digest-schema.test.ts` — update assertions for new constraint ranges (max 8 sections, max 6 summary items, etc.)
  - `tests/integration/digest-view.test.tsx` — rewrite `KeyPoint` colon-split test to match new ReactMarkdown rendering behavior
  - `tests/unit/digest-provider.test.ts` — add test fixtures at new upper bounds (8 sections, 8 keyPoints) to verify schema sync
- Manual test: set interestText to "美股" and verify LLM returns Chinese Markdown content with tables
- Visual check: verify Markdown tables render correctly in DigestView
- Backward compat: verify existing stored digests (plain text) still render correctly in the new DigestView
