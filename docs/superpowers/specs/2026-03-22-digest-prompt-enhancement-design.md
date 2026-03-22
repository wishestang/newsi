# Digest Prompt Enhancement — Design Spec

**Date:** 2026-03-22
**Status:** Draft

## Problem

The current digest generation prompt is too generic (5 lines of instruction), producing shallow, headline-level summaries. When a user enters a topic like "美股" (US stocks), the output is vague and lacks specific data (index levels, stock prices, percentage changes, causal analysis). Additionally, all output is in English regardless of the user's language.

## Solution

Enhance the prompt to guide the LLM toward data-rich, expert-level output with Markdown formatting support. The system stays on a single universal prompt: no topic classifier, no prompt branching, and no domain-specific templates. Instead, the prompt provides universal quality principles plus a few domain examples that help the model reason about depth expectations.

## Approach

**Method:** Pure prompt enhancement + Markdown rendering (schema structure unchanged)

### Chosen Direction

Three approaches were considered:

1. Single universal prompt with quality principles and a few domain examples
2. Single universal prompt plus a formal self-check checklist inside the prompt
3. Lightweight topic-aware prompt branches for domains like finance or technology

Approach 1 is selected. It keeps one stable prompt entrypoint in `buildDigestPrompt()`, avoids topic classification and template drift, and still gives the model enough guidance to produce richer output. Approach 2 adds prompt length and repetition without enough extra value. Approach 3 would likely improve some high-structure topics, but it introduces classification logic and long-term maintenance costs that are out of scope for this enhancement.

### 1. Prompt Rewrite (`src/lib/digest/prompt.ts`)

Replace the current minimal prompt with a detailed research analyst brief. The function signature stays unchanged: `buildDigestPrompt()` still accepts only `dateLabel` and `interestText`. The prompt body is reorganized into five explicit sections:

- task definition
- content quality requirements
- depth guidance
- language rules
- output rules

The prompt remains universal. Domain mentions such as markets or technology are examples of how to apply the quality bar, not routing logic.

Illustrative target shape:

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
- Domain-specific depth hints as examples only (financial, tech, etc.)
- Language matching rule
- Single universal prompt preserved; no topic-aware branches and no separate self-check stage

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

**Boundary:** This enhancement widens validation ranges only. It does not add new schema fields for tables, citations, or structured data blocks.

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

**Rendering boundary:** The view layer renders Markdown inside existing text fields only. It does not interpret business semantics, repair malformed content, or introduce custom content block types.

**Note:** The "End of Digest" footer and other static UI text remain in English. Language matching applies only to LLM-generated content. UI i18n is out of scope.

## Data Flow

The request lifecycle remains the same:

1. `buildDigestPrompt()` creates a single prompt from `dateLabel` and `interestText`
2. the selected provider requests structured output from the model
3. provider-level schema validation parses the raw response
4. `normalizeDigestSections()` removes nullable `whyItMatters` values before app-level parsing
5. `DigestView` renders the validated strings, with Markdown support in content fields

This enhancement changes prompt quality and text rendering only. It does not introduce new persistence rules, generation phases, or post-processing transforms.

## Failure Handling

The failure semantics stay conservative:

- If the model returns richer content that still fits within the relaxed limits, the digest succeeds normally.
- If the model exceeds the new schema limits, generation fails at validation time. The app should not silently truncate content because truncation can damage structure and hide prompt-quality regressions.
- If the model returns imperfect Markdown, the frontend performs best-effort rendering through the Markdown renderer. The app does not attempt to rewrite or sanitize content beyond the existing Markdown safety constraints.

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
- Topic classification or topic-aware prompt branching
- Two-stage LLM calls (plan then execute)
- Formal prompt self-check or critique stages
- Schema structural changes (new fields like `tables`, `dataHighlights`)
- Changes to the cron schedule, retry logic, or generation service
- Changes to the topics input form or interest profile storage

## Testing

### Automated

- Unit tests for `buildDigestPrompt` to verify the universal-prompt structure, language rule, Markdown allowance, and depth guidance examples
- `tests/unit/digest-schema.test.ts` updated for the relaxed upper bounds
- `tests/unit/digest-provider.test.ts` updated with fixtures at the new limits and a check that `whyItMatters: null` still normalizes correctly
- `tests/integration/digest-view.test.tsx` updated to verify Markdown rendering for `summary`, `keyPoints`, and `whyItMatters`
- Digest view safety tests for link handling so `http:` and `https:` render as links while unsafe protocols are rejected
- Backward-compatibility tests verifying plain-text stored digests still render correctly under the Markdown renderer

### Manual

- Set `interestText` to `美股` and verify the generated digest is fully in Chinese
- Verify the output includes concrete figures, named entities, and causal analysis instead of generic summaries
- Verify Markdown tables and emphasis render correctly in `DigestView`
