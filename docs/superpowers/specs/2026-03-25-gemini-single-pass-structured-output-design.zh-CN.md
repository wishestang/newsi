# Newsi Gemini Single-Pass Structured Output 设计

日期：2026-03-25

## 背景

当前 Gemini provider 仍然走两阶段：

1. Stage 1：Google Search grounding 生成 `EvidenceBundle`
2. Stage 2：基于 `EvidenceBundle` 生成最终 `DigestResponse`

虽然最终 digest 已经收口成 topic 级别的单一 Markdown，但 provider 内部仍然存在明显的复杂度：

- 两次 `generateContent()` 调用
- Stage 1 / Stage 2 双套 prompt
- 中间层 `EvidenceBundle`
- 对 Gemini 输出的中间层失败处理

实际运行中，失败点已经从“最终 digest JSON”转移到“evidence JSON”，表现为：

`Gemini did not return valid JSON evidence output.`

与此同时，Gemini 官方支持：

- `googleSearch`
- `responseMimeType: "application/json"`
- `responseJsonSchema`

这意味着目前手工维护中间 evidence 结构，已经不再是必要复杂度。

## 目标

把 Gemini provider 改成：

- 单次 Gemini 调用
- 开启 Google Search grounding
- 使用原生 structured outputs 直接返回最终 `DigestResponse`

从而删除中间 evidence 层，减少格式漂移与两阶段失败点。

## 非目标

这次不做：

- 修改最终 digest 的页面结构
- 修改 `DigestResponse` shape
- 修改 prompt 里的 topic markdown 规范
- 修改 OpenAI provider
- 修改数据库 schema
- 修改 cron 调度逻辑

## 推荐方案

### 方案 A：单次 Gemini + 原生 structured outputs（推荐）

Gemini provider 的目标行为变成：

- 一次 `generateContent()`
- 开启 `googleSearch`
- 配置：
  - `responseMimeType: "application/json"`
  - `responseJsonSchema`
- 直接拿最终 `DigestResponse`

数据结构保持不变：

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

优点：

- 链路最短
- 删除 `EvidenceBundle` 失败面
- 不再需要手工两阶段组装
- 与 Gemini 官方推荐的 structured output 能力对齐

缺点：

- 失去两阶段里“先搜再整理”的中间控制层
- 如果未来要单独持久化 evidence，需要重新引入单独设计

### 方案 B：保留两阶段，但两阶段都用 structured outputs

优点：

- 仍保留中间 evidence 层

缺点：

- 复杂度仍高
- 对当前问题来说收益不够大

### 方案 C：单次 Gemini + 自由文本 Markdown

优点：

- 更自由

缺点：

- 外层结构又失去稳定性
- 与当前“topic 壳 + markdown 正文”的产品方向不一致

结论：采用方案 A。

## 最终设计

### Gemini Provider

`src/lib/digest/provider.ts`

Gemini 路径改为：

1. 构建单次 prompt
   - 保留当前 topic markdown 的内容规范：
     - `### Top Events`
     - 最多 7 条编号事件
     - 每条事件包含：
       - 事实
       - `Insight: ...`
       - 一条可点击来源链接
     - `### Summary`

2. 调用 Gemini
   - `googleSearch` 开启
   - `responseMimeType: "application/json"`
   - `responseJsonSchema` 对应最终 `DigestResponse`

3. 解析返回
   - 不再从 `response.text` 手工抽第一段 JSON
   - 直接对 structured output 做轻量 normalize
   - 再走 `digestResponseSchema.parse(...)`

### Prompt

不再拆分为 Stage 1 / Stage 2。

新的单次 prompt 只做一件事：

- 基于 standing brief 和 Google Search grounding
- 直接返回最终 digest

Markdown 内容规范继续保留：

```md
### Top Events

1. **标题**
   客观事实。
   Insight: 简短判断。
   [来源：媒体名 · YYYY-MM-DD](https://...)

### Summary

一句或一小段总结。
```

### Structured Output Schema

Gemini 原生 schema 只约束：

- `title`
- `intro?`
- `readingTime`
- `topics[]`
  - `topic`
  - `markdown`

仍然采用“外壳结构化，正文 markdown”的模式。

### 可删除逻辑

Provider 中可以删除：

- `EvidenceBundle` 相关导入
- `buildEvidencePrompt()`
- `buildDigestSynthesisPrompt()`
- `normalizeGeminiEvidenceBundle()`
- Gemini 两次 `generateContent()` 调用
- 与 evidence 相关的错误分支

如果 `extractGeminiJsonCandidate()` 不再被 Gemini 使用，应一并从 Gemini 路径移除。

### 测试

`tests/unit/digest-provider.test.ts`

需要改成：

1. Gemini 只调用一次 `generateContent`
2. 请求参数里包含：
   - `googleSearch`
   - `responseMimeType: "application/json"`
   - `responseJsonSchema`
3. 成功路径直接返回最终 `DigestResponse`
4. structured output 缺失或不合法时，仍报：
   - `Gemini did not return valid JSON digest output.`

删除：

- 所有 Stage 1 evidence fixtures
- 所有 Stage 2 synthesis fixtures
- 两阶段调用次数断言

## 错误处理

失败语义收敛成一类：

- `Gemini did not return valid JSON digest output.`

不再区分：

- evidence output failure
- digest output failure

因为 provider 不再有中间 evidence 阶段。
