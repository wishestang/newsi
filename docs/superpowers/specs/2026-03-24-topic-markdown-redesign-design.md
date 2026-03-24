# Topic Markdown Format Redesign

**Date:** 2026-03-24
**Status:** Draft

## Problem

Current topic markdown format is mechanical and template-like:
- Fixed `### Top Events` / `### Summary` headings feel rigid
- `Insight:` prefix on every event is formulaic
- Numbered list with separate source line breaks reading flow
- Low information density — event titles lack key data
- No visual variety — no tables, blockquotes, or rich formatting

## Design

### New Format Rules

Each topic's `markdown` field follows this structure:

```
Numbered event list (1-7 events, minimum 3)
+ optional data tables after quantitative events
+ closing blockquote (overall assessment)
```

**Removed elements:**
- `### Top Events` heading
- `### Summary` heading and paragraph
- `Insight:` prefix

### Event Format

Each numbered event consists of:

1. **Numbered bold title** — title itself should contain key data or conclusions, not just the event name
2. **1-3 sentences of natural prose** — blends factual description and analytical insight into one flowing paragraph (no `Insight:` separator)
3. **Inline source** — source link at end of paragraph, using parentheses matching the digest language: `([Source Name](url))` for English, `（[来源名](url)）` for Chinese

When a data table follows an event, the prose paragraph (including its source link) comes first, then the table.

### Optional Data Tables

When an event involves structured comparative data that fits naturally into rows and columns (e.g., multiple index levels, multi-stock price moves, league standings, multi-item rankings), a Markdown table MAY follow immediately after the event's prose paragraph. If the data can be stated clearly in a single sentence (e.g., "revenue grew 15% YoY"), do not use a table.

### Closing Assessment

Each topic ends with a blockquote (`>`) containing 1-2 sentences of overall trend judgment. This replaces the former `### Summary` section. No fixed prefix is required — the LLM should write the assessment naturally in the digest language.

If the LLM omits the blockquote, the rendering should degrade gracefully (no visual artifact).

### Complete Example

```markdown
1. **OpenAI 发布 Agent Builder，企业版定价降 40%**
   新平台支持多步骤任务编排和沙箱执行，面向企业开发者。Agent 工具链正从实验品转向生产级基础设施，企业采购窗口可能在 Q3 打开。（[OpenAI Blog](https://example.com/openai)）

2. **Anthropic 推出 Claude Agent SDK**
   标准化 Agent 编排接口，支持工具调用链和状态管理。与 OpenAI 同周发力，行业对 Agent 开发范式的共识正在加速形成。（[The Verge](https://example.com/verge)）

3. **美股科技板块全线反弹，纳指领涨 1.8%**
   市场受降息预期推动大幅反弹，科技股领涨。资金重新流入 AI 概念股，英伟达单日涨幅超 4%。（[Bloomberg](https://example.com/bloomberg)）

   | 指数 | 收盘 | 涨跌幅 |
   |------|------|--------|
   | 纳斯达克 | 18,230 | +1.8% |
   | 标普500 | 5,680 | +1.2% |
   | 道琼斯 | 42,100 | +0.7% |

4. **Google DeepMind 多 Agent 协作论文：效率提升 3 倍**
   新框架让多个 AI Agent 在复杂任务中自主分工，较单 Agent 效率提升 3 倍。这为企业级 Agent 部署提供了关键的扩展性基础。（[arXiv](https://example.com/arxiv)）

> Agent 基础设施竞赛全面开打，竞争焦点已从"能不能用"转向"谁的开发者体验更好"。
```

## Changes Required

### 1. `src/lib/digest/provider.ts` — `buildDigestSynthesisPrompt`

Update the markdown format instructions in the synthesis prompt.

**Before:**
```
- markdown must contain:
  - a "### Top Events" heading
  - up to 7 numbered events
  - each event must include a factual description, an "Insight:" line, and one clickable markdown source link
  - a "### Summary" heading followed by a short summary paragraph
- do not use extra sections outside "Top Events" and "Summary".
```

**After:**
```
- markdown format rules:
  - Do NOT use section headings like "### Top Events" or "### Summary"
  - List 3-7 numbered events
  - Each event: bold title (include key data/numbers in title), 1-3 sentences blending facts and analysis into natural prose, one source link in parentheses at end of paragraph
  - Use parentheses matching the language: ([Source](url)) for English, （[来源](url)）for Chinese
  - When an event involves structured comparative data (multiple items needing rows/columns), you may add a markdown table right after the prose paragraph
  - Do not use a table if the data fits in a single sentence
  - End with a blockquote (>) containing 1-2 sentences of overall trend assessment — no fixed prefix required
```

The evidence prompt (`buildEvidencePrompt`) is unchanged. The `### Signals` heading in evidence is an intermediate format consumed only by the synthesis step; the synthesis prompt explicitly instructs the LLM not to use section headings in the final output, preventing contamination.

### 2. `src/lib/digest/prompt.ts` — `buildDigestPrompt`

This prompt is used by the OpenAI provider path (single-step, no evidence stage). Update the `## Output` section.

**Before:**
```
## Output
Return structured JSON only. Use Markdown syntax only inside existing string fields such as summary, keyPoints, and whyItMatters.
```

**After:**
```
## Output
Return structured JSON only.
The `markdown` field in each topic must follow this format:
- Do NOT use section headings like "### Top Events" or "### Summary"
- List 3-7 numbered events
- Each event: bold title (include key data/numbers in title), 1-3 sentences blending facts and analysis, one source link in parentheses at end of paragraph
- Use parentheses matching the language: ([Source](url)) for English, （[来源](url)）for Chinese
- When an event involves structured comparative data (multiple items needing rows/columns), you may add a markdown table right after the prose paragraph
- End with a blockquote (>) containing 1-2 sentences of overall trend assessment
```

### 3. `src/components/digest/digest-markdown.tsx`

Add `blockquote` component to the `ReactMarkdown` components map.

**Styling:**
```tsx
blockquote: ({ children }) => (
  <blockquote className="border-l-2 border-[var(--border-solid)] pl-4 text-[var(--text-muted)]">
    {children}
  </blockquote>
),
```

Design rationale: left border + muted text color follows the existing design system's minimal style. Uses existing CSS variables (`--border-solid`, `--text-muted`) from the project's theme.

### 4. Schema (`src/lib/digest/schema.ts`)

No changes. The `markdown: string` field remains the same — only the content within it changes.

### 5. Tests

- **`src/lib/digest/__tests__/digest-provider.test.ts`**: Update prompt-content assertions for `buildDigestSynthesisPrompt` — verify new format instructions are present and old headings (`### Top Events`, `Insight:`) are absent.
- **`src/lib/digest/__tests__/digest-prompt.test.ts`** (if exists): Update assertions for the output section of `buildDigestPrompt`.
- **`src/components/digest/__tests__/digest-markdown.test.tsx`** (if exists): Add test case for blockquote rendering.

## Non-Goals

- Changing the `DigestResponse` schema structure
- Modifying the evidence-gathering stage format
- Changing how topics are stored in the database
- Modifying the `DigestView` component layout (topic sections, title, footer)
