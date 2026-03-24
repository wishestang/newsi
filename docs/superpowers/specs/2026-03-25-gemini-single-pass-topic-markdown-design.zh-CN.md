# Newsi Gemini Single-Pass Topic Markdown 设计

日期：2026-03-25

## 背景

当前已经验证到一个明确的 API 能力边界：

- Gemini 支持 `googleSearch`
- Gemini 支持 structured outputs
- 但 `googleSearch + application/json` 这一组合当前不被支持

因此，想要同时获得：

- 实时搜索
- 完全结构化 JSON

在单次 Gemini 调用里不可行。

与此同时，当前产品最需要解决的问题不是数据库建模，而是：

- 生成稳定
- 内容新鲜
- 页面可读
- 不再反复因 JSON 结构漂移失败

在这种约束下，最合理的收敛方式是：

- 放弃两阶段
- 放弃单次 structured outputs
- 保留 `googleSearch`
- 直接输出 topic 级 markdown

## 目标

把 Gemini provider 改成：

- 单次 Gemini 调用
- 开启 Google Search grounding
- 直接返回最终 `DigestResponse`
- `DigestResponse` 继续使用：

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

也就是说：

- topic 仍然分组
- 每个 topic 下仍然是一段 markdown
- 不再有中间 evidence 阶段

## 非目标

这次不做：

- 重新引入两阶段 evidence pipeline
- 使用 Gemini 原生 structured outputs
- 修改 UI 页面结构
- 修改数据库 schema
- 修改 OpenAI provider

## 推荐方案

### 方案 A：单次 Gemini + Google Search + Topic Markdown（推荐）

Gemini provider 直接：

- 基于 standing brief 搜索最近信息
- 一次生成最终 digest
- 返回 topic 级 markdown

优点：

- 最简单
- 与 Gemini API 当前能力边界一致
- 不再有 Stage 1 / Stage 2 两套失败面
- 仍然保留 topic 层阅读结构

缺点：

- 外层 JSON 仍需要手工解析
- 排版灵活性不如最终结构化 JSON

### 方案 B：保留两阶段

优点：

- 更强的中间控制层

缺点：

- 复杂度高
- 当前产品最痛的不是缺控制，而是稳定性不足

### 方案 C：整篇单 markdown

优点：

- 更自由

缺点：

- topic 层消失
- Today / History 的阅读组织变差

结论：采用方案 A。

## 最终设计

### 数据结构

继续沿用：

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

### Prompt

Gemini 只保留一个 prompt。

要求：

- 搜索最近 24 小时内最相关的信息
- 输出最终 digest
- 每个 topic 的 markdown 遵循固定结构：

```md
### Top Events

1. **标题**
   客观事实。
   Insight: 简短判断。
   [来源：媒体名 · YYYY-MM-DD](https://...)

### Summary

一句或一小段总结。
```

约束：

- 每个 topic 最多 7 条事件
- 不强凑满
- 先事实，再 insight
- 最后用 Summary 收口

### Provider

Gemini provider 改成：

- 一次 `generateContent()`
- `tools: [{ googleSearch: {} }]`
- 不使用 `responseMimeType: "application/json"`
- 继续读取 `response.text`
- 解析为最终 `DigestResponse`

### 可删除逻辑

可以删除：

- 两阶段相关逻辑
- `EvidenceBundle`
- `buildEvidencePrompt()`
- `buildDigestSynthesisPrompt()`
- Stage 1 / Stage 2 错误分支

保留：

- `extractGeminiJsonCandidate()` 或等效文本抽取逻辑
- `normalizeGeminiDigest()`
- 最终 `digestResponseSchema.parse(...)`

### 测试

`tests/unit/digest-provider.test.ts` 需要改成：

1. Gemini 只调用一次 `generateContent`
2. 请求里包含：
   - `googleSearch`
3. 不再要求：
   - `responseMimeType`
   - `responseJsonSchema`
4. 成功路径直接返回最终 digest
5. 失败路径统一为：
   - `Gemini did not return valid JSON digest output.`

## 错误处理

失败语义收敛为：

- `Gemini did not return any digest output.`
- `Gemini did not return valid JSON digest output.`

不再区分 evidence / digest 两阶段。
