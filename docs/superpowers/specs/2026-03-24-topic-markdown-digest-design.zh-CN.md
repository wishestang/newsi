# Newsi Topic Markdown Digest 设计

- 日期：2026-03-24
- 状态：Ready for Planning
- 关联项目：Newsi MVP
- 背景：当前 Gemini 两阶段链路已经能按 topic 组织日报，但最终结构仍然要求嵌套 JSON，例如 `events[] / insights[] / takeaway`。Gemini 在正式 cron 场景下仍会偶发返回不完全符合 schema 的 JSON，导致整篇日报失败。新的目标是在保留 topic 级结构的前提下，把 topic 内部内容改为 Markdown blocks，以降低结构化失败率。

## 1. 目标

本次改动的核心目标是：

- 保留每篇日报按 topic 分组的阅读结构
- 保留前端固定的 `Top Events / Insights / Takeaway` 版式
- 将 topic 内部内容从细粒度嵌套 JSON 改为 Markdown blocks
- 降低 Gemini 最终阶段对严格 JSON 结构的依赖
- 提高正式 cron 与 preview 的生成稳定性

## 2. 非目标

本次不做：

- 不改首页 / Preview / Today / History 的整体视觉风格
- 不新增来源链接 UI
- 不引入额外的搜索服务
- 不重构 OpenAI provider
- 不放弃 topic 级结构，直接改成整篇自由 Markdown

## 3. 方案对比

### 方案 A：继续严格嵌套 JSON

保留：

- `topics[].events[]`
- `topics[].insights[]`
- `topics[].takeaway`

优点：

- 结构最强
- 后续最容易做事件级交互

缺点：

- Gemini 返回稍微跑偏就整篇失败
- 正式 cron 稳定性不足

### 方案 B：保留 topic 层，topic 内改成 Markdown blocks（推荐）

保留：

- 顶层 `topics[]`

改成：

- `eventsMarkdown`
- `insightsMarkdown`
- `takeawayMarkdown`

优点：

- 比完全自由 Markdown 更可控
- 比严格嵌套 JSON 更稳定
- 与当前产品阅读结构最匹配

缺点：

- 会失去 event 粒度的强结构化能力

### 方案 C：整篇只保留 `title + markdown`

优点：

- 最抗模型格式波动

缺点：

- 产品结构失控
- `History` 阅读一致性变弱
- topic 维度消失

### 推荐方案

采用 **方案 B：保留 topic 层，topic 内改成 Markdown blocks**。

## 4. 新的数据结构

建议新的 `DigestResponse` 为：

```ts
type DigestResponse = {
  title: string;
  intro?: string;
  readingTime: number;
  topics: Array<{
    topic: string;
    eventsMarkdown: string;
    insightsMarkdown: string;
    takeawayMarkdown: string;
  }>;
};
```

### 4.1 字段含义

- `title`
  整篇日报标题
- `intro`
  可选导语
- `readingTime`
  预计阅读时长
- `topics`
  topic 级稳定结构

每个 topic 下：

- `topic`
  topic 标题
- `eventsMarkdown`
  `Top Events` 内容块
- `insightsMarkdown`
  `Insights` 内容块
- `takeawayMarkdown`
  `Takeaway` 内容块

### 4.2 结构约束

- `topics`
  - `1-3` 个
- `eventsMarkdown`
  - 必填
- `insightsMarkdown`
  - 必填
- `takeawayMarkdown`
  - 必填

其中 Markdown 内容不再强制拆成事件数组或 insight 数组。

## 5. 页面渲染结构

页面仍然保持：

- Topic 标题
- `Top Events`
- `Insights`
- `Takeaway`

区别只在于：

- 以前前端自己遍历 `events[]` / `insights[]`
- 现在每个块直接渲染一段 Markdown

### 5.1 `Top Events`

仍显示 `Top Events` 标题。  
内容改为：

- 直接渲染 `eventsMarkdown`

推荐 prompt 引导模型使用：

- bullet list
- 短段落
- 加粗关键数字或主体

### 5.2 `Insights`

仍显示 `Insights` 标题。  
内容改为：

- 直接渲染 `insightsMarkdown`

### 5.3 `Takeaway`

仍显示 `Takeaway` 标题。  
内容改为：

- 直接渲染 `takeawayMarkdown`

## 6. Gemini 两阶段链路调整

### 6.1 Stage 1：Topic Evidence

第一阶段仍然保持 topic 级 evidence 聚类。  
也就是说，继续输出：

- `generatedAt`
- `topics[]`
- 每个 topic 下的原始事件池

第一阶段的职责不变：

- 搜索最近 24 小时内的新变化
- 按 topic 聚类事件
- 为第二阶段准备事实底座

### 6.2 Stage 2：Markdown-first Digest Synthesis

第二阶段从：

- 输出严格嵌套 JSON

改成：

- 输出 topic 级薄结构 JSON

也就是每个 topic 只要求：

- `topic`
- `eventsMarkdown`
- `insightsMarkdown`
- `takeawayMarkdown`

第二阶段 prompt 应明确要求：

- `eventsMarkdown`
  以客观事实为主，优先用列表
- `insightsMarkdown`
  提炼 1-3 条洞察
- `takeawayMarkdown`
  给一句总结，不要写成长 essay
- 输出一个 JSON object，不要包在 markdown fence 中

## 7. 为什么这比当前方案更稳

当前失败点主要在于：

- Gemini 最终阶段要同时满足
  - topic 数组
  - event 数组
  - keyFacts 数组
  - insights 数组
  - takeaway 字段

这会让结构过于脆弱。

改成 Markdown blocks 后：

- 顶层只保留 topic 级结构
- topic 内部不再要求多层嵌套数组
- 模型可以更自然地输出列表与段落

因此：

- JSON 失败率会下降
- 页面结构仍然能保持稳定

## 8. 文件边界

### 需要修改

- `src/lib/digest/schema.ts`
  - 改新 `DigestResponse`
- `src/lib/digest/provider.ts`
  - 调整 Gemini 第二阶段 prompt 与解析逻辑
- `src/components/digest/digest-view.tsx`
  - 改为渲染 markdown blocks
- `src/lib/preview-state.ts`
  - 更新本地 mock digest shape
- `src/app/(app)/preview/page.tsx`
- `src/app/(app)/today/page.tsx`
- `src/app/(app)/history/[digestDayKey]/page.tsx`
  - 传递并渲染新的 digest shape

### 不需要修改

- `src/lib/digest/service.ts`
- `src/lib/digest/view-state.ts`
- `src/app/(app)/history/page.tsx`

## 9. 验收标准

本次设计完成后的目标状态：

- `DigestResponse` 改成 topic 级薄结构
- 页面仍保持 `Top Events / Insights / Takeaway`
- 每个内容块内部使用 Markdown 渲染
- Gemini 最终阶段不再需要返回 event-level 强结构化数组
- Preview 和 cron 正式生成都更不容易因 JSON 轻微跑偏而失败
