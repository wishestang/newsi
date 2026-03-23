# Newsi Topic Facts-Insights Digest 设计

- 日期：2026-03-24
- 状态：Ready for Planning
- 关联项目：Newsi MVP
- 背景：当前日报输出仍然以通用 `section` 为中心，内容更像连续摘要段落。新的目标是让日报更接近“个人情报简报”：每个 topic 先列客观事实，再给洞察，最后给一句总结。

## 1. 目标

本次改动要把日报阅读结构从：

- 全文 intro
- 若干通用 summary sections

改成：

- 全文 intro
- 按 topic 分组的情报单元
- 每个 topic 内固定呈现：
  - `Top Events`
  - `Insights`
  - `Takeaway`

具体目标：

- 让用户先快速扫到“过去 24 小时发生了什么”
- 让事实与分析明确分层，减少两者混写
- 让每个 topic 都有完整的日报单元，而不是被全局 section 打散
- 让 Gemini 两阶段证据流更贴近最终页面结构

## 2. 非目标

本次不做：

- 页面上新增来源链接展示
- 历史日报的来源追踪界面
- topic 的交互式展开/折叠管理
- topic 数量的用户手动排序能力
- 全局跨 topic 的“Top 5 总榜”

## 3. 预期阅读结构

日报整体仍保留：

- 标题
- 导语 `intro`

正文改为多个 topic blocks：

### 3.1 Topic Block

每个 topic block 包含 3 层：

1. `Top Events`
2. `Insights`
3. `Takeaway`

### 3.2 Top Events

定位：

- 完全偏客观事实
- 帮用户回答“这个 topic 今天到底发生了什么”

每条事件建议包含：

- `title`
- `summary`
- `keyFacts`

其中：

- `title`：一句事实导向标题
- `summary`：1-2 句客观描述
- `keyFacts`：时间、数字、主体、地区、产品名等硬信息

事件数量规则：

- 每个 topic 下 `1-5` 条
- 如果过去 24 小时没有足够多的新变化，允许少于 5 条
- 不允许为了凑数使用陈旧背景信息补齐

### 3.3 Insights

定位：

- 不是重复事实
- 而是基于上面事件提炼出的判断

建议数量：

- 每个 topic 下 `1-3` 条

内容要求：

- 回答这些事实共同说明了什么
- 哪个趋势在增强 / 转弱
- 接下来值得继续盯什么

### 3.4 Takeaway

定位：

- 这个 topic 的一句结论
- 像编辑收尾语，而不是另起一段长文

数量规则：

- 每个 topic 固定 `1` 条

## 4. 数据结构设计

建议把当前 `DigestResponse.sections[]` 改成更明确的 topic 结构：

```ts
type DigestResponse = {
  title: string;
  intro: string;
  readingTime?: number;
  topics: Array<{
    topic: string;
    events: Array<{
      title: string;
      summary: string;
      keyFacts: string[];
    }>;
    insights: string[];
    takeaway: string;
  }>;
};
```

### 4.1 结构约束

- `topics`
  - `1-3` 个
- `events`
  - 每个 topic `1-5` 条
- `insights`
  - 每个 topic `1-3` 条
- `takeaway`
  - 每个 topic `1` 条

### 4.2 保留字段

保留：

- `title`
- `intro`
- `readingTime`

移除：

- 当前通用意义上的 `sections`

## 5. Gemini 两阶段生成链路调整

当前已经有：

- Stage 1: Evidence Search
- Stage 2: Digest Synthesis

本次需要让两阶段都更贴近按 topic 组织的输出。

### 5.1 Stage 1：按 Topic 聚类证据

第一阶段不再只生成平铺的 `signals`，而是改成按 topic 分组的事件池。

建议结构：

```ts
type TopicEvidenceBundle = {
  generatedAt: string;
  topics: Array<{
    topic: string;
    searchQueries: string[];
    events: Array<{
      title: string;
      summary: string;
      sourceTitle: string;
      sourceUrl: string;
      publishedAt?: string;
    }>;
  }>;
};
```

第一阶段职责：

- 用 Google Search grounding 找过去 24 小时的新增信号
- 按 topic 聚类事件
- 为第二阶段准备事实池

### 5.2 Stage 2：从 Topic Evidence 合成日报

第二阶段输入：

- standing brief
- date label
- `TopicEvidenceBundle`

第二阶段输出：

- 新版 `DigestResponse`

第二阶段职责：

- 从每个 topic 的事件池中挑选 `Top Events`
- 基于这些事实提炼 `Insights`
- 生成一句 `Takeaway`
- 输出严格 JSON

## 6. 页面改动

### 6.1 `Preview`

当前按 section 渲染的预览页，需要改为按 topic block 渲染：

- Topic 标题
- `Top Events`
- `Insights`
- `Takeaway`

### 6.2 `Today`

`Today` 阅读页同步采用新结构，和 `Preview` 保持一致。

### 6.3 `History`

历史日报详情页采用同一阅读结构。  
历史列表页本身可暂不改信息摘要样式，只需确保点击进入详情页后能正确渲染 topic blocks。

## 7. 渲染原则

### 7.1 事实优先

视觉层级上应保证：

- 先看到 `Top Events`
- 再看到 `Insights`
- 最后读到 `Takeaway`

### 7.2 内容克制

不要把每个 topic 写成长文 essay。  
这个结构的目标是：

- 高信息密度
- 清晰层级
- 快速扫描

### 7.3 不强凑数量

如果某个 topic 在过去 24 小时确实只有 1-2 条值得写的事实：

- 允许事件数不足 5
- 允许 insight 数量较少
- 不允许用背景知识把事实栏写成百科摘要

## 8. 方案对比

### 方案 A：保留当前 section 结构，只调整 prompt

优点：

- 改动最小

缺点：

- 页面层级仍然不清晰
- 事实 / 洞察无法真正分层
- 很难稳定得到目标阅读体验

### 方案 B：改成 topic -> events -> insights -> takeaway（推荐）

优点：

- 与用户预期一致
- 更像真正日报
- 与两阶段 evidence pipeline 更匹配

缺点：

- 需要改 schema、provider 输出和 digest view

### 方案 C：全局 Top 5 + 全局洞察

优点：

- 更像头版新闻

缺点：

- 会稀释 topic 维度
- 不符合用户希望“每个 topic 分开”的要求

### 推荐方案

采用 **方案 B：topic -> events -> insights -> takeaway**。

## 9. 验收标准

本次设计完成后的目标状态：

- 日报数据结构不再使用通用 `sections`
- 每个 topic 都有 `events / insights / takeaway`
- Preview / Today / History 详情页都能按 topic block 渲染
- 每个 topic 的事实与洞察明确分层
- Gemini 两阶段链路能够按 topic 组织证据与输出
- 当过去 24 小时缺少足够新增时，页面允许较短内容，而不是凑数
