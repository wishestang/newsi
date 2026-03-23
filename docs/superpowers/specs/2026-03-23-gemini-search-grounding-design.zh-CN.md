# Gemini Search Grounding 设计说明

## 背景

当前 `Newsi` 的日报质量问题主要表现为“信息不够新，像旧闻或泛化总结”。

结合现有实现，根因不是页面展示，而是 `Gemini` provider 目前没有接入真实搜索能力：

- `OpenAI` provider 使用了 `web_search_preview`
- `Gemini` provider 目前仅通过 OpenAI compatibility 接口做普通 completion
- 因此当 `LLM_PROVIDER=gemini` 时，模型更容易依赖已有知识和泛化背景来补足日报内容

本次改动只针对这个缺口：为 `Gemini` 接入 Google Search grounding，先验证“真实搜索”对日报新鲜度的提升，不顺手扩改 UI、schema 或 citation 展示。

## 目标

- 保持当前产品交互不变
- 保持当前 `DigestResponse` 数据结构不变
- 让 `Gemini` 在生成 preview 和正式 digest 时具备真实搜索能力
- 优先验证内容是否明显更接近“最近发生的变化”

## 非目标

- 不改 `Today / Preview / History` UI
- 不新增来源引用展示
- 不修改 digest schema 的 section 数量下限
- 不做双阶段检索-生成编排
- 不调整 `OpenAI` provider 行为

## 方案对比

### 方案 A：Gemini 原生 Google Search grounding

为 `Gemini` provider 改用 Google 官方 Gemini API，并显式启用 `google_search` 工具。

优点：

- 最贴近 Google 官方能力模型
- 能真正接入实时网页内容
- 改动集中在 provider 层，对调用方透明

缺点：

- 需要替换当前 Gemini 的兼容调用方式
- 需要重新适配 structured output 解析

### 方案 B：Gemini 双阶段检索后再生成

第一步仅产出最近 24 小时候选信号，第二步再生成日报。

优点：

- 对 freshness 控制更强
- 质量上限更高

缺点：

- 调用次数、成本、时延都更高
- 对当前 MVP 来说过重

### 方案 C：OpenAI 搜索 + Gemini 写作

检索层用 OpenAI，写作层用 Gemini。

优点：

- 可能较快拿到效果

缺点：

- 双 provider 耦合增加
- 成本与调试复杂度更高
- 不符合当前以 Gemini 为主的方向

### 推荐方案

采用 **方案 A**。先让 `Gemini` 真正具备搜索 grounding 能力，再观察日报质量变化。

## 现有架构与改动边界

当前上层调用关系已经足够清晰：

- `src/lib/digest/service.ts`
- `src/lib/preview-digest/service.ts`

它们只依赖：

- `createDigestProvider()`
- `provider.generate({ prompt })`

因此本次只需要修改 `src/lib/digest/provider.ts`，尽量不触碰调用方。

## 目标架构

保留现有 provider 抽象：

- `createDigestProvider()`
- `createOpenAIDigestProvider()`
- `createGeminiDigestProvider()`

调整后的行为：

- `OpenAI` 路径：继续使用 `web_search_preview`
- `Gemini` 路径：改用 Google 官方 Gemini API，并开启 `google_search`

上层服务无需感知搜索能力差异，仍然只消费统一的 `DigestResponse`。

## Gemini Provider 设计

### 接口保持不变

`DigestProvider` 接口维持：

```ts
generate(input: { prompt: string }): Promise<DigestResponse>
```

这样 preview、正式 digest、cron 等调用链全部不需要改动。

### 请求方式

`Gemini` provider 不再通过 OpenAI compatibility `chat.completions.parse()` 生成结构化输出，而是改为调用 Google 官方 Gemini API。

请求中显式传入：

- `model`
- `contents`
- `tools: [{ google_search: {} }]`

目标是让模型在需要时自动检索实时网页内容，并基于检索结果生成回答。

### 输出解析

第一版不强依赖“grounding + 原生 structured output”同时成立。

更稳妥的实现方式是：

1. 要求 Gemini 只输出一段合法 JSON
2. 本地执行 `JSON.parse`
3. 再用现有 `digestResponseSchema` 做 zod 校验

这样可以把外部 provider 的响应波动，尽量隔离在 provider 层内部。

### 元数据处理

Google Search grounding 会返回额外 metadata，例如搜索查询、网页来源与 grounding 信息。

第一版策略：

- 不写入 UI
- 不扩展数据库 schema
- 可在 provider 层保留原始响应供调试，但不进入正式产品输出

## 配置设计

维持现有环境变量约定：

- `LLM_PROVIDER=gemini`
- `GEMINI_API_KEY`
- `LLM_MODEL`

默认 Gemini 模型继续优先使用：

- `gemini-2.5-flash`

不引入新的必填环境变量。

## 失败处理

如果 Gemini grounding 请求失败，应继续沿用现有 provider 错误处理方式：

- provider 抛出明确错误
- preview 进入 `failed`
- 正式 digest 走现有失败状态流

不新增 provider fallback 到 OpenAI，避免在这次改动里混入新的策略分支。

## 测试策略

本次重点补以下测试：

### 单元测试

- `Gemini provider` 在启用搜索工具时，仍能返回合法 `DigestResponse`
- `Gemini provider` 在返回非法 JSON 时抛出明确错误
- `Gemini provider` 缺失 API key 时仍返回明确配置错误

### 回归测试

- `createDigestProvider()` 在 `LLM_PROVIDER=gemini` 时仍返回 Gemini provider
- 现有 preview / digest service 测试继续通过

## 验收标准

满足以下条件即可认为本次改动完成：

- `Gemini` provider 已接入 Google Search grounding
- 不修改现有页面与 digest schema
- preview 和正式 digest 仍能正常生成
- 生成链路继续返回当前 `DigestResponse`
- 单测与现有回归测试通过

## 风险与后续

### 已知风险

- 只接搜索，不改 prompt 和 schema，质量提升可能有限
- grounding 元数据第一版未展示，用户无法直接看到来源
- 如果模型仍被要求凑够 section，仍可能保留部分泛化表达

### 后续优先方向

如果接入搜索后效果仍不理想，下一步优先考虑：

1. 加强“最近 24 小时” freshness 约束
2. 放宽 section 下限，避免为了凑数泛化总结
3. 再评估是否需要双阶段检索-生成
