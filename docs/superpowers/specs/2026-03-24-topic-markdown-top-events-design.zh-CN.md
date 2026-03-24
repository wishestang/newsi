# Newsi Topic Markdown Top Events 设计

日期：2026-03-24

## 背景

当前日报输出已经从强结构化事件数组切到 topic 级别的 Markdown blocks：

- `eventsMarkdown`
- `insightsMarkdown`
- `takeawayMarkdown`

这虽然比之前稳定，但阅读层次仍然不符合当前产品目标。现在的主要问题是：

1. `Insights` 单独成块，阅读会打断“先看事实、再看含义”的节奏。
2. `Takeaway` 命名偏抽象，不够像日报中的编辑收束。
3. topic 内仍然有多块结构，用户更希望看到一份更接近“编辑稿”的连续阅读体验。
4. 来源信息目前缺少统一的、可点击的内联表现。

新的目标是把 topic 内内容进一步收拢成一整段 Markdown，由模型在 Markdown 内完成事件排序、事实叙述、简短 insight 和 summary。

## 目标

每个 topic 的阅读结构应变成：

- topic 标题
- 一整段 Markdown 正文

而这段 Markdown 的期望格式由 prompt 约束：

1. `Top Events`
2. 最多 7 条编号事件
3. 每条事件包含：
   - 事件标题
   - 客观事实
   - 一句简短 insight
   - 一条来源链接
4. `Summary`
5. 一句或一小段编辑式总结

也就是说，前端不再控制 `Top Events / Insights / Takeaway` 三块独立区域，而是只负责渲染 topic markdown。结构一致性主要由 prompt 保证。

## 非目标

这次不做：

- 单条事件级别的 JSON 结构恢复
- 事件来源的独立数组或脚注系统
- topic 内的前端二次解析或 Markdown AST 重排
- 数据库存储 search grounding metadata
- 历史 digest 的回填迁移

## 推荐方案

### 方案 A：Topic 单 Markdown（推荐）

每个 topic 只存一个 `markdown` 字段。

数据结构：

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

模型输出示例：

```md
### Top Events

1. **OpenAI 发布新版 agent builder**
   OpenAI 在过去 24 小时内发布了新版 agent builder，重点强化了多步骤工作流编排能力。
   Insight: 这说明 agent tooling 正在从 demo 工具走向可复用的执行层产品。
   [来源：OpenAI · 2026-03-24](https://example.com)

2. **Anthropic 扩展了 tool use 能力**
   Anthropic 在最近一次更新中进一步扩展了工具调用边界。
   Insight: 竞争焦点正在从模型能力本身转向 workflow reliability。
   [来源：Anthropic · 2026-03-24](https://example.com)

### Summary

今天这个 topic 最重要的变化是，agent 基础能力继续向产品化和工作流编排靠拢。
```

优点：

- 最稳，最不容易因为 Gemini 输出轻微漂移而失败
- 最符合用户偏好的日报阅读体验
- 前端实现最简单
- 来源链接天然作为 Markdown 链接渲染

缺点：

- topic 内部结构完全依赖 prompt
- 后续如果要对单条事件做结构化操作，需要重新引入更细数据层

### 方案 B：Topic + 两块 Markdown

每个 topic 只保留：

- `topEventsMarkdown`
- `summaryMarkdown`

优点：

- 比方案 A 更能保证 topic 内大层次稳定

缺点：

- 仍然是轻结构化
- 和用户“不要控制结构”的方向不一致

### 方案 C：完全自由整篇 Markdown

只保留：

- `title`
- `markdown`

优点：

- 最自由

缺点：

- topic 层也失去稳定边界
- Today / Preview / History 的阅读一致性会变差

结论：采用方案 A。

## 最终设计

### 数据结构

`src/lib/digest/schema.ts`

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

约束：

- `topics` 数量：`1-3`
- `markdown` 必填，非空字符串
- `intro` 保持可选

### 生成链路

继续保留 Gemini 两阶段：

1. Stage 1：`EvidenceBundle`
   - Gemini + Google Search
   - 收集 topic 维度证据
2. Stage 2：digest synthesis
   - 不再要求输出 `eventsMarkdown / insightsMarkdown / takeawayMarkdown`
   - 改成 topic 级别的单一 `markdown`

第二阶段 prompt 明确要求：

- 每个 topic 输出一段 Markdown
- Markdown 内必须包含：
  - `Top Events`
  - 最多 7 条编号事件
  - 每条事件都要带一句 `Insight: ...`
  - 每条事件都要带来源链接
  - `Summary`
- 来源必须写成 Markdown 链接，而不是纯文本括号说明

推荐来源格式：

```md
[来源：新浪财经 · 2026-03-24](https://example.com)
```

### 页面渲染

`DigestView` 只负责：

- 渲染 topic 标题
- 渲染 topic markdown

前端不再渲染：

- 独立的 `Top Events` 区块
- 独立的 `Insights` 区块
- 独立的 `Takeaway` 区块

这些层次都由 Markdown 内容本身负责。

### 内容与 Prompt 约束

每个 topic 的 markdown 应尽量遵循：

```md
### Top Events

1. **标题**
   事实描述。
   Insight: 简短判断。
   [来源：媒体名 · YYYY-MM-DD](https://...)

2. **标题**
   事实描述。
   Insight: 简短判断。
   [来源：媒体名 · YYYY-MM-DD](https://...)

### Summary

一句或一小段总结。
```

约束原则：

- 最多 7 条，不强凑满
- 先事实，后 insight
- insight 简短，不写成长段评论
- Summary 负责 topic 收束

## 错误处理

如果 Stage 2 输出不符合新 schema：

- 继续走现有 digest provider 错误链路
- preview 显示失败态
- cron 把 `failureReason` 写入 `DailyDigest`

这次不会额外增加新的 fallback markdown parser；仍然依赖当前 provider 的 JSON 提取与归一化逻辑。

## 测试策略

需要更新：

1. schema tests
   - `topics[].markdown` 结构
2. provider tests
   - Gemini Stage 2 返回 topic markdown
   - OpenAI structured output 改成 topic markdown
3. digest view integration tests
   - 不再断言独立 `Insights` / `Takeaway` 区块
   - 改为断言 topic markdown 里的 `Top Events` / `Summary`
4. preview/today/history fixtures
   - 全部改成 `topic + markdown`
5. e2e smoke
   - 继续验证 preview -> confirm -> today -> history 主路径

## 验收标准

满足以下条件即视为完成：

1. `DigestResponse` 改成 `topics[].markdown`
2. Gemini 两阶段输出可稳定生成 topic markdown
3. `Preview / Today / History` 都能正常渲染新的 topic markdown
4. 来源格式可点击
5. 本地测试、类型检查、smoke e2e 通过
