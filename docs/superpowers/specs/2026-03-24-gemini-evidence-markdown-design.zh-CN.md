# Newsi Gemini Evidence Markdown 设计

日期：2026-03-24

## 背景

当前 Gemini 日报生成已经演进为两阶段：

1. Stage 1：Gemini + Google Search 生成 `EvidenceBundle`
2. Stage 2：基于 `EvidenceBundle` 生成最终 `DigestResponse`

与此同时，最终 digest 已经从强结构化事件数组进一步收口成 topic 级别的单个 Markdown：

```ts
type DigestResponse = {
  title: string;
  intro?: string;
  readingTime: number;
  topics: Array<{
    topic: string;
    markdown: string;
  }>;
};
```

也就是说，最终用户看到的内容已经明确走向：

- 保留 topic 层结构
- topic 内部完全交给 Markdown 与 prompt 约束

但 Stage 1 仍然停留在强结构化事件包：

- `generatedAt`
- `topics[].searchQueries`
- `topics[].events[]`
- `events[].sourceTitle/sourceUrl/publishedAt`

这导致当前失败点从“最终 digest JSON 不稳定”转移成了：

`Gemini did not return valid JSON evidence output.`

也就是说，产品已经接受 Markdown-first，但证据层仍然在为不再需要的细粒度结构承担失败风险。

## 目标

把 Stage 1 evidence 也对齐成 markdown-first 的中间层，减少 Gemini 因轻微结构漂移导致的失败，同时保留：

- topic 维度的证据聚类
- 可点击来源链接
- 对 Stage 2 的可控输入边界

新的目标不是把 evidence 做成完整事件数据库，而是做成“topic 级证据底稿”。

## 非目标

这次不做：

- 重新引入强结构化的 `events[]` 数组
- 在 Stage 1 保留 `searchQueries`
- 记录 `generatedAt`
- 存储 grounding metadata 到数据库
- 更改 Today / Preview / History 的页面结构
- 更改 cron 调度逻辑

## 推荐方案

### 方案 A：Topic Markdown Evidence（推荐）

把 Stage 1 输出改成：

```ts
type EvidenceBundle = {
  topics: Array<{
    topic: string;
    markdown: string;
  }>;
};
```

其中 `markdown` 不是最终日报正文，而是一份供 Stage 2 使用的证据底稿。推荐格式：

```md
### Signals

1. **事件标题**
   1-2 句客观事实描述。
   [来源：媒体名 · 2026-03-24](https://example.com)

2. **事件标题**
   1-2 句客观事实描述。
   [来源：媒体名 · 2026-03-24](https://example.com)
```

优点：

- 失败率最低，和最终 markdown-first 输出方向一致
- 保留 topic 聚类，不会退化成一整篇自由文本
- 不再因为 `sourceUrl`、`publishedAt`、`searchQueries` 等细字段缺失而失败
- Stage 2 仍然有一份足够清晰的证据输入

缺点：

- 丢失中间层事件级结构
- 如果未来需要做事件级数据操作，需要重新设计中间层

### 方案 B：轻结构化 Signals

保留：

- `topic`
- `signals[]`
  - `title`
  - `sourceTitle`
  - `sourceUrl`

优点：

- 比方案 A 保留更多结构

缺点：

- 仍然容易因为字段缺失或 URL 不规范而失败
- 和当前“尽量把强约束移出 Gemini 输出”的方向不一致

### 方案 C：整篇自由 Evidence Markdown

只保留：

- `markdown`

优点：

- 最自由

缺点：

- topic 边界消失
- Stage 2 需要重新做 topic 聚类，复杂度上升

结论：采用方案 A。

## 最终设计

### 数据结构

`src/lib/digest/evidence-schema.ts`

```ts
type EvidenceBundle = {
  topics: Array<{
    topic: string;
    markdown: string;
  }>;
};
```

约束：

- `topics` 数量：`1-3`
- 每个 topic 必须有：
  - `topic`
  - `markdown`
- 不再要求：
  - `generatedAt`
  - `searchQueries`
  - `events[]`
  - `sourceTitle/sourceUrl/publishedAt` 的字段级校验

### Stage 1 Prompt

`buildEvidencePrompt()` 改成只要求：

- 使用 Google Search grounding 找最近 24 小时的相关信号
- 返回 exactly one JSON object
- 输出 only valid JSON，不要 markdown fences
- 顶层只有 `topics`
- 每个 topic 只有：
  - `topic`
  - `markdown`

每个 `markdown` 的内容规则：

- 必须有 `### Signals`
- 列出最多 7 条编号事件
- 每条事件只包含：
  - 标题
  - 1-2 句客观事实
  - 一条可点击来源链接
- 不输出最终 digest，不输出 summary，不输出 insight

Stage 1 只负责“搜到什么”，不负责“怎么写成日报”。

### Stage 2 Prompt

Stage 2 继续基于 `EvidenceBundle` 生成最终 `DigestResponse`，但输入 evidence 变成 topic markdown blocks。

Stage 2 规则保持：

- 每个 topic 输出一个 `markdown`
- Markdown 内必须包含：
  - `### Top Events`
  - 最多 7 条编号事件
  - 每条事件包含：
    - 事实
    - `Insight: ...`
    - 一个可点击来源链接
  - `### Summary`
- 不能发明 evidence 里没有的新来源

因此整体链路变成：

`Google Search -> topic evidence markdown -> topic digest markdown`

### Provider 解析逻辑

`normalizeGeminiEvidenceBundle()` 从直接跑强结构化 schema：

- `generatedAt`
- `searchQueries`
- `events[].sourceUrl`

改成只校验：

- `topics`
- `topic`
- `markdown`

`extractGeminiJsonCandidate()`、fenced code block 处理等容错逻辑继续保留。

### 页面与数据流

这次不改：

- `DigestView`
- `Preview / Today / History` 页面
- 数据库存储结构

因为最终 `DigestResponse` 仍然保持现在的 topic + markdown 形态，变化只发生在 provider 的 Stage 1 中间层。

## 错误处理

如果 Stage 1 仍然失败：

- 继续报 `Gemini did not return valid JSON evidence output.`

但由于 schema 已显著变薄，这类失败应明显减少。

如果 Stage 2 失败：

- 继续走现有 `Gemini did not return valid JSON digest output.` 错误链路

## 测试

需要覆盖：

1. `evidence-schema` 新结构
   - `topics[].topic`
   - `topics[].markdown`

2. `digest-provider` 的 Gemini 两阶段流
   - Stage 1 接受 topic markdown evidence
   - Stage 2 接受 topic markdown evidence 并生成最终 digest
   - fenced code block 的 JSON 仍能被抽取

3. 回归验证
   - 现有 Preview / Today / History 的 digest 读取逻辑不需要修改
