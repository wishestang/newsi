# Gemini 双阶段证据流设计说明

## 背景

当前 `Newsi` 的 Gemini 日报生成链路已经接入 Google Search grounding，但仍然存在结构化输出不稳定的问题：

- 返回内容常被包裹在 ```json 代码块中
- 字段名不稳定，例如 `intro` / `introduction`
- 可能出现额外字段，例如 `date`、`data`
- section 数量不稳定
- 一次调用需要同时完成“搜索、筛选、分析、严格 JSON 输出”四件事

这导致 provider 层需要不断适配 Gemini 的自由输出格式，系统稳定性较差。

本次设计的目标是把 Gemini 的职责拆成两个更稳定的阶段：

1. 搜索并整理“证据包”
2. 基于证据包生成最终日报

## 目标

- 保持 `Preview / Today / History` 页面不变
- 保持最终 `DigestResponse` 数据结构不变
- 降低 Gemini 单次调用同时完成多种任务带来的不稳定性
- 让日报建立在更清晰的“近期证据”之上

## 非目标

- 不做页面改版
- 不新增来源链接展示
- 不修改数据库 schema 持久化 evidence
- 不同步重构 OpenAI provider
- 不在本次引入新的外部搜索服务

## 方案对比

### 方案 A：Gemini 双阶段证据流

第一阶段：Gemini + Google Search grounding 产出结构化 `EvidenceBundle`  
第二阶段：Gemini 基于 `EvidenceBundle` 产出最终 `DigestResponse`

优点：

- 任务边界更清晰
- 结构化输出稳定性更高
- 更容易控制 freshness 和来源质量

缺点：

- 两次模型调用，成本与延迟更高

### 方案 B：继续单次调用，增强本地归一化

保持一次 Gemini 调用，只在 provider 层继续扩展兼容逻辑。

优点：

- 不增加调用次数
- 改动较小

缺点：

- 需要不断追着模型输出修补
- 长期维护成本高
- 结构稳定性依然依赖模型偶然配合

### 方案 C：独立搜索层 + Gemini 写作层

完全不依赖 Gemini grounding，自己构建搜索/抓取层，再将结果交给 Gemini。

优点：

- 控制力最高

缺点：

- 对当前 MVP 过重
- 实现成本显著增加

### 推荐方案

采用 **方案 A：Gemini 双阶段证据流**。

## 总体架构

新的 Gemini 生成链路：

```text
Standing brief
  -> Stage 1: Evidence Search (Gemini + googleSearch)
  -> EvidenceBundle
  -> Stage 2: Digest Synthesis (Gemini, no search)
  -> DigestResponse
```

其中：

- 第一阶段负责“找”
- 第二阶段负责“写”

调用方仍只看到：

```ts
provider.generate({ prompt }): Promise<DigestResponse>
```

## Stage 1：Evidence Search

### 目标

第一阶段不直接产出日报，而是产出结构化证据包。

### 输出结构

建议定义：

```ts
type EvidenceBundle = {
  topic: string;
  generatedAt: string;
  searchQueries: string[];
  signals: Array<{
    headline: string;
    summary: string;
    whyRelevant: string;
    sourceTitle: string;
    sourceUrl: string;
    publishedAt?: string;
  }>;
};
```

### 语义说明

- `topic`
  本次证据聚类主题
- `generatedAt`
  证据生成时间
- `searchQueries`
  Gemini 实际使用的搜索词
- `signals`
  最近 24 小时内值得纳入日报的核心变化

每条 `signal` 的重点是：

- 新发生了什么
- 为什么跟 standing brief 相关
- 它来自哪里

### 生成要求

第一阶段 prompt 只要求：

- 使用 Google Search 获取最近 24 小时的相关信息
- 输出结构化证据包
- 不要写长篇总结
- 每个 signal 必须有来源标题与 URL

## Stage 2：Digest Synthesis

### 目标

第二阶段只负责把 evidence 整理成最终日报。

输入：

- `standing brief`
- `dateLabel`
- `EvidenceBundle`

输出：

- 现有 `DigestResponse`

### 规则

第二阶段不使用搜索工具。  
它只基于第一阶段已筛好的证据进行整理、聚合与分析。

### 优势

- 不再需要模型一边联网一边满足严格 JSON schema
- 结构稳定性高于当前单次调用方案
- 证据与最终摘要之间的关系更可解释

## 代码边界

### 新增文件

建议新增：

- `src/lib/digest/evidence-schema.ts`
  - 定义 `EvidenceBundle`
- `src/lib/digest/evidence-provider.ts`
  - 负责第一阶段 Evidence Search

### 修改文件

- `src/lib/digest/provider.ts`
  - Gemini provider 从单阶段改为两阶段
  - OpenAI provider 暂不调整

### 不改的文件

- `src/lib/digest/service.ts`
- `src/lib/preview-digest/service.ts`
- `src/app/(app)/preview/page.tsx`
- `src/app/(app)/today/page.tsx`
- `src/app/(app)/history/page.tsx`

也就是说，本次改动只发生在 digest 生成内部。

## Provider 设计

### 对外接口不变

仍然保持：

```ts
generate(input: { prompt: string }): Promise<DigestResponse>
```

### 内部实现变化

Gemini provider 内部变成：

1. `generateEvidenceBundle(prompt)`
2. `generateDigestFromEvidenceBundle(bundle, prompt)`

最终仍然返回 `DigestResponse`。

## 错误处理

### 第一阶段失败

- 抛出 evidence generation 错误
- preview 和 digest 继续沿用现有失败状态流

### 第二阶段失败

- 抛出 digest synthesis 错误
- 调用方仍按当前失败路径处理

### 本次不做的事

- 不对第一阶段和第二阶段分别暴露 UI 状态
- 不对数据库存储每一步失败明细

## 测试策略

### 单元测试

新增或修改测试覆盖：

- 第一阶段可以从 Gemini grounding 返回中产出合法 `EvidenceBundle`
- 第二阶段可以从 `EvidenceBundle` 生成合法 `DigestResponse`
- Gemini provider 两阶段串起来仍能返回现有 digest shape
- 任一阶段返回非法 JSON 时抛出明确错误

### 回归测试

- `preview-digest service` 相关测试继续通过
- `digest service` 相关测试继续通过
- 全量 `vitest` 与 `tsc` 通过

## 验收标准

满足以下条件可视为完成：

- Gemini provider 不再直接单次产出最终 digest
- Gemini provider 改为两阶段：evidence -> digest
- UI 与最终 `DigestResponse` 结构保持不变
- preview 与正式 digest 都能继续工作
- 回归测试通过

## 风险与后续

### 风险

- 两次调用带来更长的生成时间
- 第一阶段 evidence 结构如果设计过重，可能增加维护成本

### 后续优先方向

如果两阶段方案跑通，后续可再考虑：

1. 在页面中展示来源链接
2. 在数据库中保存 evidence 以支持审计和调试
3. 为 OpenAI provider 做同样的两阶段拆分
