import type { DataSourceResult } from "@/lib/datasources/types";

function buildDataSourcePromptSection(contexts: DataSourceResult[]): string {
  if (contexts.length === 0) return "";

  const sections = contexts
    .filter((c) => c.markdown)
    .map(
      (c) => `### ${c.sourceName}\n\n${c.markdown}`,
    );

  if (sections.length === 0) return "";

  return `
## Pre-fetched Real Data

The following real data has been pre-fetched for you. You MUST use this data as the primary source of truth. Do NOT fabricate or hallucinate entries — only reference items that appear in the data below.

${sections.join("\n\n")}
`;
}

export function buildBasePrompt({
  dateLabel,
  interestText,
  dataSourceContexts = [],
}: {
  dateLabel: string;
  interestText: string;
  dataSourceContexts?: DataSourceResult[];
}) {
  const dataSection = buildDataSourcePromptSection(dataSourceContexts);

  return `
You are an expert research analyst generating a personal daily intelligence briefing.

Date: ${dateLabel}
Standing brief: ${interestText}
${dataSection}
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
`;
}

export const TOPIC_MARKDOWN_FORMAT = `
The \`markdown\` field in each topic must follow one of two formats. Choose based on the topic's nature:

## Format Selection

- **Format A: Event Briefing** (default) — use for news, market moves, policy changes, product launches, and general events
- **Format B: Leaderboard** — use for rankings, trending lists, charts, top-N lists, leaderboards, app store rankings, box office charts, GitHub trending, bestseller lists, etc.

### Format A: Event Briefing

1. **Opening paragraph** (1-2 sentences): A concise overview of the day's overall situation in this domain. No heading — just a plain paragraph at the top.

2. **Event blocks** (up to 7): Each event is separated by \`---\` and follows this pattern:
   - \`#### Event Title\` — use h4 for the event headline
   - 2-3 sentences of factual description with specific data, names, companies, and figures
   - A blockquote insight line: \`> **Why it matters:** analysis of causes, impact, and forward-looking implications\`
   - A source line in italics: \`*Sources: [Reuters](url), [Bloomberg](url)*\`

3. **Closing assessment**: End with a blockquote summary:
   \`> **Today's takeaway:** One-sentence assessment of the overall direction for this domain today.\`

Example structure:
\`\`\`
Opening paragraph summarizing the day's landscape in this area.

---

#### Event Headline

2-3 sentences of factual description with real data and names.

> **Why it matters:** Analysis of why this event is significant and what it means going forward.

*Sources: [Source1](url1), [Source2](url2)*

---

#### Another Event Headline

Description with specific details.

> **Why it matters:** Forward-looking analysis.

*Sources: [Source1](url1)*

---

> **Today's takeaway:** One-sentence overall assessment.
\`\`\`

### Format B: Leaderboard

1. **Opening paragraph** (1-2 sentences): A brief overview of the ranking landscape and any notable shifts. No heading — just a plain paragraph at the top.

2. **Ranking table**: A markdown table with these columns:
   - \`#\` — rank number
   - Name — item name as a markdown link: \`[Name](url)\`
   - Description — 1-sentence summary
   - Metric — the key data point (stars, downloads, revenue, score, etc.)

3. **Optional highlights** (0-2): Use \`####\` blocks to expand on noteworthy entries or trends, following the same event block pattern as Format A.

4. **Closing assessment**: End with a blockquote summary:
   \`> **Today's takeaway:** One-sentence assessment.\`

Example structure:
\`\`\`
Opening paragraph about today's ranking trends and notable movements.

| # | Name | Description | Metric |
|---|------|-------------|--------|
| 1 | [Project Alpha](url) | A fast-growing ML framework | 2.3k stars today |
| 2 | [Beta Tool](url) | CLI for cloud deployments | 1.8k stars today |
| 3 | [Gamma UI](url) | Component library for React | 1.2k stars today |

---

#### Notable: Project Alpha surges to #1

2-3 sentences about why this entry is noteworthy.

> **Why it matters:** Analysis of the trend or significance.

*Sources: [Source1](url1)*

---

> **Today's takeaway:** One-sentence overall assessment.
\`\`\`

Rules:
- Do NOT use any headings other than \`####\` for events or highlights
- Do NOT use numbered lists for events — each event is its own \`####\` block
- Separate every event/highlight block with \`---\`
- Use markdown links for all sources and names
- The "Why it matters" and "Today's takeaway" labels must match the language of the standing brief (e.g. use "为什么重要：" and "今日总评：" for Chinese)`;

export function buildDigestPrompt({
  dateLabel,
  interestText,
}: {
  dateLabel: string;
  interestText: string;
}) {
  return `${buildBasePrompt({ dateLabel, interestText })}
## Output
Return structured JSON only.
${TOPIC_MARKDOWN_FORMAT}
`;
}
