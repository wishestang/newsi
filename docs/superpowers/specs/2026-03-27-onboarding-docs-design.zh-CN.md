# Newsi 团队 Onboarding 业务文档设计

## 背景与目标

Newsi 项目需要一套面向新团队成员的 onboarding 文档，帮助他们快速理解项目的业务全貌、核心流程和代码结构。

**目标受众**：新加入团队的开发者
**语言**：中文为主，技术术语保留英文
**组织方式**：混合式（全景流程 + 模块详解）

## 文档结构

```
docs/onboarding/
├── README.md                    # 阅读指引 + 项目简介 + 技术栈 + 目录结构
├── core-flows.md                # 3 条端到端核心流程（Mermaid 全景图）
├── modules/
│   ├── auth.md                  # 认证与用户模型
│   ├── topics.md                # 兴趣配置
│   ├── digest-generation.md     # 摘要生成核心逻辑
│   ├── preview.md               # 预览流程
│   ├── cron.md                  # 定时任务与批量生成
│   ├── datasources.md           # 外部数据源
│   └── frontend.md              # 前端组件与页面路由
└── data-model.md                # Prisma Schema、ER 图、表结构
```

共 10 个文件：1 README + 1 核心流程 + 7 模块文档 + 1 数据模型。

## README.md

内容规划：

1. **一句话介绍**：Newsi 是一个"个人每日情报简报"应用——用户写一段自然语言描述的兴趣（standing brief），系统每天自动基于 AI 生成一份围绕该兴趣的综合简报。
2. **技术栈清单**：Next.js 16 / React 19 / TypeScript / TailwindCSS 4 / Prisma 7 / PostgreSQL / Auth.js / OpenAI & Gemini
3. **顶层目录结构说明**：
   - `src/app/` — Next.js App Router 路由
   - `src/lib/` — 业务逻辑与工具函数
   - `src/components/` — React 组件
   - `prisma/` — 数据库 Schema 与迁移
4. **阅读路径建议**：
   - 先看 `core-flows.md` 建立全局认知
   - 按兴趣深入 `modules/` 各模块
   - 数据层细节看 `data-model.md`
5. **本地开发快速启动**：PostgreSQL 数据库配置、环境变量配置、preview 模式说明（无需数据库也可通过 preview 模式体验）

## core-flows.md — 核心流程

覆盖三条端到端流程，每条配 Mermaid 序列图/流程图，关键步骤标注代码路径。

### 流程一：注册 → 配置兴趣 → 预览 → 确认

完整的用户首次使用链路：

```
用户访问 /signin
  → Google OAuth 认证
  → 创建 User 记录
  → 跳转 /topics
  → 填写 standing brief，提交
  → saveInterestProfile()：创建 InterestProfile (pending_preview) + PreviewDigest (generating)
  → 跳转 /preview
  → 前端轮询 /api/preview/generate
  → 后端异步生成：获取数据源 → 构建 Prompt → 调用 LLM → 更新 PreviewDigest (ready)
  → 用户查看预览，点击确认
  → confirmPreviewDigest()：创建 DailyDigest (ready) + InterestProfile → active
  → 跳转 /today
```

关键代码路径：
- `src/lib/topics/service.ts` — saveInterestProfile
- `src/lib/preview-digest/service.ts` — startPreviewDigestGeneration, confirmPreviewDigest
- `src/lib/digest/service.ts` — generateDigest
- `src/app/api/preview/generate/route.ts` — API 入口

### 流程二：每日摘要生成

Cron 触发的批量生成链路：

```
Vercel Cron 23:00 UTC (07:00 北京时间)
  → GET /api/cron/digests（Bearer token 验证）
  → runDigestGenerationCycle()
  → 查询所有 active 的 InterestProfile
  → 对每个 profile：
    → 检查当日是否已有 digest（幂等）
    → 检查失败次数是否 > 3（放弃）
    → 创建 DailyDigest (generating)
    → 获取匹配数据源 → 构建 Prompt → 调用 LLM
    → 成功 → status: ready
    → 失败 → status: failed, retryCount++
```

关键代码路径：
- `src/app/api/cron/digests/route.ts` — Cron 入口
- `src/lib/digest/service.ts` — runDigestGenerationCycle, generateDigest
- `src/lib/datasources/` — fetchMatchingDataSources（通过 `index.ts` barrel export 导出，实现在 `registry.ts`）

### 流程三：摘要阅读与历史归档

```
/today → 获取当日 DailyDigest
  → ready → DigestView 渲染（title, intro, topics[].markdown）
  → generating/scheduled → StatusPanel
  → 无 profile → EmptyState

/history → 查询所有 DailyDigest 按日期倒序 → ArchiveList
/history/[digestDayKey] → 获取指定日期 digest → DigestView
```

关键代码路径：
- `src/app/(app)/today/page.tsx`
- `src/app/(app)/history/page.tsx`
- `src/lib/digest/view-state.ts` — getTodayDigestState()，决定 /today 页面渲染什么状态
- `src/components/digest/digest-view.tsx` — DigestView

## 模块文档统一模板

每个模块文档遵循以下结构：

```markdown
# 模块名称

## 概述
一段话说明该模块的职责和在整体系统中的位置。

## 架构图
Mermaid 图展示模块内部结构或与其他模块的交互关系。

## 核心逻辑
按功能点逐一说明，每个功能点包含：
- 业务规则说明
- 关键代码路径（file:line 引用）
- 输入输出 / 数据结构

## 关键设计决策
为什么这样设计，有什么 trade-off。

## 注意事项
容易踩的坑、常见误解、调试技巧。
```

## 各模块重点内容

### modules/auth.md — 认证与用户模型

- Google OAuth 完整流程（Auth.js 配置、回调处理）
- 双模式 session 策略：生产环境用 DB session，preview 模式用 JWT
- Preview 模式 fallback 机制：无需数据库/认证即可体验核心功能
- 运行模式检测：`src/lib/env.ts` 中的 `isLocalPreviewMode()`、`isPersistenceConfigured()`、`isAuthConfigured()` 是判断双模式架构的核心
- `(app)` layout 中的鉴权守卫逻辑
- 关键文件：`src/lib/auth.ts`、`src/lib/env.ts`、`src/app/api/auth/[...nextauth]/route.ts`、`src/app/signin/page.tsx`

### modules/topics.md — 兴趣配置

- TopicsForm 表单交互与 Zod schema 校验
- InterestProfile 状态机：`pending_preview` → `active`
- 语言检测逻辑：根据 standing brief 内容自动判断中/英文
- 时区处理：浏览器检测 → 存储到 User.accountTimezone → 影响 digest 日期计算
- 清除兴趣时的删除行为：`clearInterestProfile` 删除 PreviewDigest 和 InterestProfile，DailyDigest 记录保留（仅在 User 被删除时通过 Prisma onDelete: Cascade 级联删除）
- 关键文件：`src/lib/topics/service.ts`、`src/lib/topics/schema.ts`、`src/components/topics/topics-form.tsx`

### modules/digest-generation.md — 摘要生成核心逻辑

这是系统最核心的模块，重点覆盖：

- **Provider 抽象**：DigestProvider 接口设计，OpenAI 和 Gemini 两条路径
- **OpenAI 路径**：structured outputs + web_search_preview 工具，gpt-5.4 默认模型
- **Gemini 路径**：Google Search grounding，gemini-2.5-flash 默认模型，JSON 从 markdown fence 中提取，schema 字段归一化
- **Prompt 设计**：模板结构、语言自适应、数据源上下文注入方式
- **Topic Markdown 格式**：
  - Format A（Event Briefing）：开篇 → 事件（h4 + `---` 分隔）→ "Today's takeaway" blockquote
  - Format B（Leaderboard）：开篇 → markdown 表格 → 可选 highlights → "Today's takeaway"
- **DigestResponse schema**：title / intro / readingTime / topics[]
- **View State**：`getTodayDigestState()` 决定 /today 页面渲染的状态，是数据层与 UI 层的桥梁
- 关键文件：`src/lib/digest/service.ts`、`src/lib/digest/provider.ts`、`src/lib/digest/prompt.ts`、`src/lib/digest/schema.ts`、`src/lib/digest/view-state.ts`、`src/lib/digest/format.ts`

### modules/preview.md — 预览流程

- 非阻塞异步生成机制：POST /api/preview/generate 立即返回，后台执行
- Generation token 防并发竞态
- 前端轮询机制：PreviewGenerationKickoff 组件定期检查状态
- PreviewDigest 状态流转：`generating` → `ready` / `failed`
- 确认流程：preview 数据转换为 DailyDigest，设置 firstEligibleDigestDayKey
- Cookie-based preview 模式（无需登录）：
  - `src/lib/preview-state.ts` 实现完整的无状态 preview 状态机（基于加密 cookie）
  - 包含 `buildPreviewInterestProfile`、`completePreviewGeneration`、`failPreviewGeneration`、`retryPreviewGeneration`、`confirmPreviewInterestProfile` 等函数
  - 与数据库驱动的 preview 流程是独立的两条路径，需要分别说明
- 关键文件：`src/lib/preview-digest/service.ts`、`src/lib/preview-state.ts`、`src/app/api/preview/generate/route.ts`、`src/components/preview/`

### modules/cron.md — 定时任务与批量生成

- Vercel cron 配置：`0 23 * * *`（23:00 UTC = 07:00 北京时间）
- CRON_SECRET Bearer token 认证
- runDigestGenerationCycle 批量处理逻辑
- 幂等性保证：同一用户同一天不重复生成
- 重试策略：失败后 retryCount++，最多 3 次，超过则永久标记失败
- 北京时间判断逻辑：确保在 07:00 之后才执行
- 返回值：processed / ready / failed / skipped 统计
- 关键文件：`src/app/api/cron/digests/route.ts`、`src/lib/digest/service.ts:runDigestGenerationCycle`

### modules/datasources.md — 外部数据源

- DataSource 接口定义：`matches(interestText)` + `fetch()` → markdown 字符串
- Registry 模式：`fetchMatchingDataSources()` 根据兴趣文本自动匹配
- 并行获取 + 容错：Promise.allSettled，单个数据源失败不影响整体
- **GitHub Trending**：
  - 触发关键词：github trending / github 趋势 / github 热门 / github 热榜
  - 实现：Cheerio 爬取 GitHub trending 页面，输出 markdown 表格
- **US Stock Movers**：
  - 触发关键词：美股 / US stock / nasdaq / S&P 500 / 道琼斯 / 纳斯达克 / 标普
  - 实现：Yahoo Finance API 获取 Top 5 涨跌幅，含占位模板供 LLM 填充
- 如何扩展新数据源：实现 DataSource 接口 → 注册到 registry
- 关键文件：`src/lib/datasources/types.ts`、`src/lib/datasources/registry.ts`、`src/lib/datasources/github-trending.ts`、`src/lib/datasources/us-stock-movers.ts`

### modules/frontend.md — 前端组件与页面路由

- App Router 路由结构图（Mermaid）
- `(app)` route group：鉴权守卫、AppShell 布局（SideNav + 主内容区）
- 页面职责：
  - `/signin` — 登录页 + preview 模式入口
  - `/topics` — 兴趣配置表单
  - `/preview` — 预览生成 + 确认
  - `/today` — 当日摘要展示
  - `/history` — 历史归档列表
  - `/history/[digestDayKey]` — 历史摘要详情
- 核心组件层级：
  - DigestView → DigestMarkdown（GFM 渲染）
  - DigestSkeleton（加载骨架屏）
  - StatusPanel（状态面板：scheduled / generating / failed）
  - EmptyState（空状态引导）
  - PreviewActions（确认 / 重试按钮）
- 关键文件：`src/app/(app)/layout.tsx`、`src/components/layout/`、`src/components/digest/`

## data-model.md — 数据模型

- Mermaid erDiagram 展示表关系
- 核心表结构：

| 表名 | 职责 |
|------|------|
| User | 用户信息、时区设置 |
| Account | OAuth 账号关联（Auth.js） |
| Session | 用户会话（Auth.js） |
| InterestProfile | 兴趣配置，status: pending_preview / active |
| PreviewDigest | 预览摘要，status: generating / ready / failed |
| DailyDigest | 每日摘要，status: scheduled / generating / ready / failed |
| VerificationToken | Auth.js 内部表，应用代码不直接使用 |

- 每张表的字段说明、索引、约束
- 注意 InterestProfile 的 Prisma schema 默认值为 `@default(active)`，但 `saveInterestProfile` 创建时显式设为 `pending_preview`——文档中需说明这一差异
- 关键关系：
  - User 1:1 InterestProfile
  - User 1:N DailyDigest
  - User 1:1 PreviewDigest
  - InterestProfile 的 firstEligibleDigestDayKey 决定每日摘要的起始日期
- Migration 历史摘要

## 编写规范

1. **语言**：中文为主，技术术语保留英文（如 Provider、Schema、Cron、Standing Brief）
2. **代码引用**：`src/lib/digest/service.ts:generateDigest()` 格式，引用函数签名和文件路径，不大段粘贴代码
3. **Mermaid 图类型**：
   - `flowchart` — 模块内部逻辑
   - `sequenceDiagram` — 跨模块交互
   - `erDiagram` — 数据模型
4. **篇幅控制**：
   - 每个模块文档 1500-3000 字（digest-generation.md 因覆盖内容较多，允许 3000-4500 字）
   - core-flows.md 3000-5000 字
   - README.md 1000-1500 字
5. **去重策略**：
   - core-flows.md 描述"什么发生了"（端到端流程全景）
   - modules/ 描述"为什么这样做"和"怎么实现的"（细节与决策）
   - core-flows.md 中每个步骤标注 `→ 详见 modules/xxx.md` 链接

## 术语表

在 README.md 中包含一个术语表，解释以下领域术语：

| 术语 | 含义 |
|------|------|
| Standing Brief | 用户编写的自然语言兴趣描述，系统据此生成每日简报 |
| Digest Day Key | YYYY-MM-DD 格式的日期标识，基于用户时区计算 |
| First Eligible Digest Day Key | 预览确认后的次日，即首次可生成每日摘要的日期 |
| Generation Token | 防止预览生成并发竞态的唯一令牌 |
| Preview Mode | 无需数据库和认证的本地体验模式，基于加密 cookie 存储状态 |
| Grounding | Gemini 的 Google Search grounding 功能，为 LLM 输出提供实时搜索数据支撑 |

## 暂不覆盖的模块

以下模块在首批文档中暂不单独成文，后续按需补充：

- **i18n**（`src/lib/i18n/`）：国际化基础设施，含 locale 配置、消息目录、服务端 i18n helpers
- **timezone**（`src/lib/timezone.ts`）：北京时区工具函数
- **db**（`src/lib/db.ts`）：Prisma client 单例

## 维护策略

写在 README.md 末尾：

1. 修改业务逻辑时同步更新对应模块文档
2. 新增模块时按统一模板创建文档，并在 README.md 中注册
3. 定期检查代码引用的行号是否仍然准确
