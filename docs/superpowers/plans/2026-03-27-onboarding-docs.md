# Newsi Onboarding 业务文档 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Newsi 项目编写一套面向新团队成员的 onboarding 文档，覆盖核心业务流程和代码结构。

**Architecture:** 混合式文档组织——1 个 README 入口 + 1 个核心流程全景文档 + 7 个模块详解 + 1 个数据模型文档，共 10 个文件。core-flows.md 描述"发生了什么"（端到端流程），modules/ 描述"为什么这样做"和"怎么实现的"（细节与决策）。

**Tech Stack:** Markdown + Mermaid diagrams

**Spec:** `docs/superpowers/specs/2026-03-27-onboarding-docs-design.zh-CN.md`

**编写规范：**
- 中文为主，技术术语保留英文（Provider、Schema、Cron、Standing Brief 等）
- 代码引用格式：`src/lib/digest/service.ts:generateDigest()` — 引用函数名，不粘贴大段代码
- Mermaid 图类型：`flowchart`（模块内部）、`sequenceDiagram`（跨模块交互）、`erDiagram`（数据模型）
- 每个模块文档 1500-3000 字（digest-generation.md 允许 3000-4500 字）
- core-flows.md 3000-5000 字，README.md 1000-1500 字

---

## File Structure

```
docs/onboarding/                    # 新建目录
├── README.md                       # 创建：项目简介 + 技术栈 + 目录结构 + 术语表 + 阅读指引
├── core-flows.md                   # 创建：3 条端到端核心流程 + Mermaid 序列图
├── modules/                        # 新建子目录
│   ├── auth.md                     # 创建：认证与用户模型
│   ├── topics.md                   # 创建：兴趣配置
│   ├── digest-generation.md        # 创建：摘要生成核心逻辑（最大文档）
│   ├── preview.md                  # 创建：预览流程（含双路径）
│   ├── cron.md                     # 创建：定时任务与批量生成
│   ├── datasources.md              # 创建：外部数据源
│   └── frontend.md                 # 创建：前端组件与页面路由
└── data-model.md                   # 创建：Prisma Schema + ER 图 + 表结构
```

---

### Task 1: 创建目录结构

**Files:**
- Create: `docs/onboarding/` directory
- Create: `docs/onboarding/modules/` directory

- [ ] **Step 1: 创建目录**

```bash
mkdir -p docs/onboarding/modules
```

---

### Task 2: 编写 data-model.md

基础文档，其他模块文档会引用数据表结构。

**Files:**
- Create: `docs/onboarding/data-model.md`
- Reference: `prisma/schema.prisma`

**覆盖内容：**
- Mermaid erDiagram 展示所有表的关系
- 7 张表：User、Account、Session、VerificationToken、InterestProfile、PreviewDigest、DailyDigest
- 每张表列出字段、类型、约束、索引
- 3 个 enum：DigestStatus、InterestProfileStatus、PreviewDigestStatus
- 关键关系说明：User 1:1 InterestProfile、User 1:N DailyDigest、User 1:1 PreviewDigest
- InterestProfile 的 `@default(active)` vs `saveInterestProfile` 显式设为 `pending_preview` 的差异说明
- `firstEligibleDigestDayKey` 的业务含义
- Migration 历史摘要（init_auth_and_digest + add_preview_confirmation）

- [ ] **Step 1: 读取 Prisma schema 获取精确字段定义**

读取 `prisma/schema.prisma` 全文和 `prisma/migrations/` 目录结构。

- [ ] **Step 2: 编写 data-model.md**

按模板编写完整文档，包含 Mermaid erDiagram。

- [ ] **Step 3: 检查文档完整性**

确认所有 7 张表都已覆盖，字段描述准确，ER 图语法正确。

- [ ] **Step 4: Commit**

```bash
git add docs/onboarding/data-model.md
git commit -m "docs(onboarding): add data model documentation"
```

---

### Task 3: 编写 README.md

项目入口文档，包含阅读指引。

**Files:**
- Create: `docs/onboarding/README.md`
- Reference: `package.json`（技术栈版本）

**覆盖内容：**
- 一句话介绍 Newsi
- 技术栈清单（含具体版本号，从 package.json 获取）：
  - Next.js 16.2.1 / React 19.2.4 / TypeScript 5 / TailwindCSS 4 / Prisma 7.5 / PostgreSQL / Auth.js 4.24 / OpenAI / Gemini
- 顶层目录结构说明：`src/app/`、`src/lib/`、`src/components/`、`prisma/`
- 术语表（6 个术语：Standing Brief、Digest Day Key、First Eligible Digest Day Key、Generation Token、Preview Mode、Grounding）
- 阅读路径建议：core-flows → modules → data-model
- 本地开发快速启动：环境变量配置、Preview Mode 说明
- 暂不覆盖的模块说明（i18n、timezone、db）
- 维护策略（3 条规则）

- [ ] **Step 1: 读取 package.json 获取版本号**

- [ ] **Step 2: 编写 README.md**

- [ ] **Step 3: 检查链接正确性**

确认所有相对链接（指向 core-flows.md、modules/、data-model.md）路径正确。

- [ ] **Step 4: Commit**

```bash
git add docs/onboarding/README.md
git commit -m "docs(onboarding): add README with project overview and reading guide"
```

---

### Task 4: 编写 core-flows.md

全景流程文档，3 条核心端到端流程。

**Files:**
- Create: `docs/onboarding/core-flows.md`
- Reference:
  - `src/lib/topics/service.ts` — saveInterestProfile 流程
  - `src/lib/preview-digest/service.ts` — preview 生成和确认流程
  - `src/lib/digest/service.ts` — daily digest 生成循环
  - `src/lib/digest/view-state.ts` — today 页面状态决策
  - `src/app/api/cron/digests/route.ts` — cron 入口
  - `src/app/api/preview/generate/route.ts` — preview API
  - `vercel.json` — cron schedule

**覆盖内容：**

**流程一：注册 → 配置兴趣 → 预览 → 确认**（Mermaid sequenceDiagram）
- 参与者：User、Browser、/signin、Auth.js、/topics、saveInterestProfile、/preview、/api/preview/generate、LLM Provider、confirmPreviewDigest、/today
- 关键步骤标注代码路径 + `→ 详见 modules/xxx.md` 链接
- 注意双路径：数据库模式 vs cookie-based preview 模式

**流程二：每日摘要生成**（Mermaid sequenceDiagram）
- 参与者：Vercel Cron、/api/cron/digests、runDigestGenerationCycle、DataSources、LLM Provider、Database
- 关键节点：CRON_SECRET 验证、active profile 筛选、幂等检查、重试逻辑（>= 3 放弃）
- 标注 `→ 详见 modules/cron.md`、`modules/digest-generation.md`

**流程三：摘要阅读与历史归档**（Mermaid flowchart）
- /today 页面状态决策树：getTodayDigestState → unconfigured/pending_preview/scheduled/generating/failed/ready
- /history 列表 → /history/[digestDayKey] 详情
- 标注 `→ 详见 modules/frontend.md`

- [ ] **Step 1: 读取关键源文件确认流程细节**

读取 `src/lib/topics/service.ts`、`src/lib/preview-digest/service.ts`、`src/lib/digest/service.ts`、`src/lib/digest/view-state.ts`、`src/app/api/cron/digests/route.ts`、`vercel.json`。

- [ ] **Step 2: 编写流程一的 Mermaid sequenceDiagram 和说明**

- [ ] **Step 3: 编写流程二的 Mermaid sequenceDiagram 和说明**

- [ ] **Step 4: 编写流程三的 Mermaid flowchart 和说明**

- [ ] **Step 5: 添加文档间交叉链接**

在每个流程的关键步骤添加 `→ 详见 [modules/xxx.md](modules/xxx.md)` 链接。

- [ ] **Step 6: Commit**

```bash
git add docs/onboarding/core-flows.md
git commit -m "docs(onboarding): add core flows with Mermaid diagrams"
```

---

### Task 5: 编写 modules/auth.md

**Files:**
- Create: `docs/onboarding/modules/auth.md`
- Reference:
  - `src/lib/auth.ts` — authOptions 配置（line 7-33）
  - `src/lib/env.ts` — 6 个环境检测函数
  - `src/app/api/auth/[...nextauth]/route.ts` — NextAuth 路由处理
  - `src/app/(app)/layout.tsx` — 鉴权守卫
  - `src/app/signin/page.tsx` — 登录页

**按统一模板编写，覆盖内容：**

**概述**：Auth.js (NextAuth.js) + Google OAuth 认证体系，支持生产模式和 Preview 模式双轨运行。

**架构图**：Mermaid flowchart 展示请求 → 鉴权守卫 → session 检查 → 重定向逻辑。

**核心逻辑：**
1. Google OAuth 流程：Auth.js 配置、PrismaAdapter、session 策略（DB vs JWT）
2. 运行模式检测：`src/lib/env.ts` 的 6 个检测函数（isLocalPreviewForced、isPersistenceConfigured、isAuthSecretConfigured、isGoogleAuthConfigured、isAuthConfigured、isLocalPreviewMode）及其组合逻辑
3. 鉴权守卫：`(app)/layout.tsx` 中的 session 检查和重定向
4. Preview 模式 fallback：无需 DB/Auth 的完整体验

**关键设计决策：**
- 为什么用 DB session 而非 JWT（生产环境）
- 为什么需要 Preview 模式（降低开发门槛）

**注意事项：**
- `AUTH_SECRET` 必须配置，否则 Auth.js 无法工作
- Preview 模式下 session 策略自动降级为 JWT

- [ ] **Step 1: 读取源文件**

读取 `src/lib/auth.ts`、`src/lib/env.ts`、`src/app/api/auth/[...nextauth]/route.ts`、`src/app/(app)/layout.tsx`、`src/app/signin/page.tsx`。

- [ ] **Step 2: 编写 auth.md**

- [ ] **Step 3: Commit**

```bash
git add docs/onboarding/modules/auth.md
git commit -m "docs(onboarding): add auth module documentation"
```

---

### Task 6: 编写 modules/topics.md

**Files:**
- Create: `docs/onboarding/modules/topics.md`
- Reference:
  - `src/lib/topics/service.ts` — saveInterestProfile (line 12-70), clearInterestProfile (line 72-84)
  - `src/lib/topics/schema.ts` — interestProfileSchema
  - `src/components/topics/topics-form.tsx` — TopicsForm 组件

**按统一模板编写，覆盖内容：**

**概述**：用户兴趣配置模块，管理 Standing Brief 的创建、修改和清除。

**架构图**：Mermaid flowchart 展示 TopicsForm → saveInterestProfile → InterestProfile + PreviewDigest 创建。

**核心逻辑：**
1. Zod schema 校验：interestText（2-1000 字符）、browserTimezone（可选）
2. saveInterestProfile 完整流程：校验 → 时区处理 → firstEligibleDigestDayKey 计算 → DB upsert
3. InterestProfile 状态机：`pending_preview` → `active`
4. clearInterestProfile：删除 PreviewDigest + InterestProfile，保留 DailyDigest
5. 语言检测：standing brief 内容语言自动传递到 LLM prompt
6. 时区处理：浏览器检测 → normalizeTimezone → User.accountTimezone → 影响 digestDayKey

**关键设计决策：**
- 为什么 saveInterestProfile 同时创建 PreviewDigest（触发预览生成）
- 为什么 clearInterestProfile 不删除 DailyDigest（保留历史记录）

**注意事项：**
- firstEligibleDigestDayKey 取决于是否已过北京时间 07:00
- interestText 变更后 preview 需要重新生成

- [ ] **Step 1: 读取源文件**

读取 `src/lib/topics/service.ts`、`src/lib/topics/schema.ts`、`src/components/topics/topics-form.tsx`。

- [ ] **Step 2: 编写 topics.md**

- [ ] **Step 3: Commit**

```bash
git add docs/onboarding/modules/topics.md
git commit -m "docs(onboarding): add topics module documentation"
```

---

### Task 7: 编写 modules/digest-generation.md

系统最核心的模块，允许 3000-4500 字。

**Files:**
- Create: `docs/onboarding/modules/digest-generation.md`
- Reference:
  - `src/lib/digest/service.ts` — generateDigest, runDigestGenerationCycle, MAX_DIGEST_RETRIES
  - `src/lib/digest/provider.ts` — DigestProvider 接口, createOpenAIDigestProvider, createGeminiDigestProvider
  - `src/lib/digest/prompt.ts` — buildDigestPrompt（主导出）、buildBasePrompt、TOPIC_MARKDOWN_FORMAT、buildDataSourcePromptSection（内部 helper）
  - `src/lib/digest/schema.ts` — digestResponseSchema, DigestResponse
  - `src/lib/digest/view-state.ts` — TodayDigestState, getTodayDigestState
  - `src/lib/digest/format.ts` — formatDigestDate, formatTodayDate

**按统一模板编写，覆盖内容：**

**概述**：Newsi 的核心引擎——将用户的 Standing Brief 转化为结构化的每日简报。

**架构图**：Mermaid flowchart 展示 generateDigest 内部流程：interest text → fetchMatchingDataSources → buildBasePrompt → provider.generate → DigestResponse。

**核心逻辑：**

1. **DigestProvider 接口**：`name?`、`model?`、`generate(input)` → Promise\<DigestResponse\>
2. **OpenAI Provider**：
   - structured outputs + zodTextFormat
   - web_search_preview 工具调用
   - 默认模型 gpt-5.4，可通过 LLM_MODEL 覆盖
   - 直接解析结构化响应
3. **Gemini Provider**：
   - Google Search grounding
   - 默认模型 gemini-2.5-flash
   - extractGeminiJsonCandidate：从 markdown fence 或纯文本提取 JSON
   - normalizeGeminiDigest：灵活字段解析（introduction → intro）
   - estimateReadingTimeFromDigest：words/180，clamp 3-20
4. **Prompt 设计**：
   - buildBasePrompt：角色设定、日期、standing brief、数据源上下文
   - 语言自适应：输出语言匹配 standing brief 语言
   - TOPIC_MARKDOWN_FORMAT：Format A（Event Briefing）vs Format B（Leaderboard）详细格式规范
5. **DigestResponse Schema**：title、intro?、readingTime(3-20)、topics[](1-3 个，每个含 topic + markdown)
6. **View State**：
   - TodayDigestState 6 种状态：unconfigured / pending_preview_confirmation / scheduled / generating / failed / ready
   - getTodayDigestState 状态决策逻辑
   - formatScheduledDigestMessage / formatFailedDigestMessage
7. **Date 工具**：formatDigestDate（day key → uppercase date）、formatTodayDate

**关键设计决策：**
- 为什么用 Provider 抽象（支持切换 LLM 供应商）
- OpenAI vs Gemini 的技术差异（结构化输出 vs JSON 提取）
- 为什么限制 1-3 个 topics（阅读体验）
- 为什么 readingTime 限定 3-20 分钟

**注意事项：**
- Gemini 的 JSON 提取可能不稳定，需要 fallback 解析
- TOPIC_MARKDOWN_FORMAT 的两种格式由 LLM 自行选择，无需显式指定
- provider 选择通过 LLM_PROVIDER 环境变量控制

- [ ] **Step 1: 读取所有 6 个 digest 目录下的源文件**

读取 `src/lib/digest/service.ts`、`provider.ts`、`prompt.ts`、`schema.ts`、`view-state.ts`、`format.ts`。

- [ ] **Step 2: 编写 digest-generation.md（Provider 和 Prompt 部分）**

先写 Provider 抽象、OpenAI/Gemini 两条路径、Prompt 设计。

- [ ] **Step 3: 编写 digest-generation.md（Schema、View State、Format 部分）**

补充 DigestResponse schema、TodayDigestState、日期工具函数。

- [ ] **Step 4: 检查篇幅在 3000-4500 字范围内**

- [ ] **Step 5: Commit**

```bash
git add docs/onboarding/modules/digest-generation.md
git commit -m "docs(onboarding): add digest generation module documentation"
```

---

### Task 8: 编写 modules/preview.md

**Files:**
- Create: `docs/onboarding/modules/preview.md`
- Reference:
  - `src/lib/preview-digest/service.ts` — startPreviewDigestGeneration, confirmPreviewDigest, retryPreviewDigest
  - `src/lib/preview-state.ts` — cookie-based 状态机全套函数
  - `src/app/api/preview/generate/route.ts` — API 入口（双模式分支）
  - `src/components/preview/preview-generation-kickoff.tsx` — 轮询组件
  - `src/components/preview/preview-actions.tsx` — 确认/重试按钮

**按统一模板编写，覆盖内容：**

**概述**：Preview 流程是用户确认 AI 生成质量的关键门槛，支持数据库驱动和 cookie-based 两条独立路径。

**架构图**：Mermaid flowchart 展示双路径分叉：isLocalPreviewMode → cookie 路径 / DB 路径。

**核心逻辑：**

1. **数据库路径**（生产模式）：
   - startPreviewDigestGeneration：非阻塞异步生成（fire-and-forget）
   - generationToken + updatedAt 并发控制
   - PreviewDigest 状态流转：generating → ready / failed
   - confirmPreviewDigest：事务性操作（创建 DailyDigest + 更新 InterestProfile + 删除 PreviewDigest）
   - retryPreviewDigest：重置状态 + 新 token
2. **Cookie 路径**（Preview Mode）：
   - PREVIEW_INTEREST_COOKIE 加密 HTTP-only cookie
   - buildPreviewInterestProfile：初始化 profile
   - completePreviewGeneration：生成 mock digest（基于 interest text 解析 focus areas）
   - confirmPreviewInterestProfile：设置 active + 计算 next eligible day
   - getLocalTodayState / getLocalArchiveItems：本地状态管理
3. **API 入口 /api/preview/generate**：
   - 根据 isLocalPreviewMode 分流到不同路径
   - cookie 路径：同步完成，更新 cookie
   - DB 路径：异步触发，立即返回 `{ ok: true }`
4. **前端轮询**：
   - PreviewGenerationKickoff：POST 触发 → 每 3 秒 router.refresh 检查状态
   - 防重复请求：Map 追踪 generationToken

**关键设计决策：**
- 为什么需要双路径（降低开发门槛 vs 生产可靠性）
- 为什么用 fire-and-forget（避免请求超时）
- 为什么 confirmPreviewDigest 校验 interestText 是否变更（防止过期 preview）

**注意事项：**
- cookie 路径生成的是 mock digest，不调用真正的 LLM
- 并发控制依赖 generationToken 匹配，token 不匹配的请求会被忽略
- confirm 操作会删除 PreviewDigest 记录

- [ ] **Step 1: 读取源文件**

读取 `src/lib/preview-digest/service.ts`、`src/lib/preview-state.ts`、`src/app/api/preview/generate/route.ts`、`src/components/preview/preview-generation-kickoff.tsx`、`src/components/preview/preview-actions.tsx`。

- [ ] **Step 2: 编写 preview.md**

- [ ] **Step 3: Commit**

```bash
git add docs/onboarding/modules/preview.md
git commit -m "docs(onboarding): add preview module documentation"
```

---

### Task 9: 编写 modules/cron.md

**Files:**
- Create: `docs/onboarding/modules/cron.md`
- Reference:
  - `src/app/api/cron/digests/route.ts` — GET handler (line 4-24)
  - `src/lib/digest/service.ts` — runDigestGenerationCycle (line 113-236)
  - `vercel.json` — cron 配置

**按统一模板编写，覆盖内容：**

**概述**：每日定时任务，07:00 北京时间批量为所有活跃用户生成摘要。

**架构图**：Mermaid sequenceDiagram 展示 Vercel Cron → API → runDigestGenerationCycle → per-profile 处理。

**核心逻辑：**
1. Vercel cron 配置：`0 23 * * *`（23:00 UTC = 07:00 北京时间）
2. API 认证：CRON_SECRET Bearer token；persistence 或 auth 未配置时跳过（直接检查 isPersistenceConfigured + isAuthConfigured，而非 isLocalPreviewMode）
3. runDigestGenerationCycle 处理流程：
   - 查询所有 active InterestProfile
   - hasBeijingDailyRunPassed 时间检查
   - Per-profile 处理：
     - 跳过条件：digest 已存在 / retryCount >= 3 / 未到 firstEligibleDigestDayKey
     - 正常流程：创建 DailyDigest(generating) → generateDigest → 更新结果
   - 返回统计：processed / ready / failed / skipped

**关键设计决策：**
- 为什么用 23:00 UTC（对应北京 07:00，用户早间阅读）
- 为什么 max retries = 3（平衡可靠性和成本）
- 幂等设计：同用户同日不重复生成

**注意事项：**
- Vercel cron 有执行时间限制，大量用户时需关注超时
- 调试时可直接 curl 调用 API（携带 CRON_SECRET）
- retryCount >= 3 时摘要被永久标记失败，不再重试

- [ ] **Step 1: 读取源文件**

读取 `src/app/api/cron/digests/route.ts`、`src/lib/digest/service.ts`（line 113-236）、`vercel.json`。

- [ ] **Step 2: 编写 cron.md**

- [ ] **Step 3: Commit**

```bash
git add docs/onboarding/modules/cron.md
git commit -m "docs(onboarding): add cron module documentation"
```

---

### Task 10: 编写 modules/datasources.md

**Files:**
- Create: `docs/onboarding/modules/datasources.md`
- Reference:
  - `src/lib/datasources/types.ts` — DataSource, DataSourceResult 接口
  - `src/lib/datasources/registry.ts` — fetchMatchingDataSources
  - `src/lib/datasources/index.ts` — barrel export
  - `src/lib/datasources/github-trending.ts` — GitHubTrending 数据源
  - `src/lib/datasources/us-stock-movers.ts` — USStockMovers 数据源

**按统一模板编写，覆盖内容：**

**概述**：可扩展的外部数据源系统，为 LLM 提供实时数据支撑。

**架构图**：Mermaid flowchart 展示 fetchMatchingDataSources → matches 过滤 → Promise.allSettled 并行获取 → markdown 结果。

**核心逻辑：**
1. DataSource 接口：id、name、matches(interestText) → boolean、fetch() → DataSourceResult
2. DataSourceResult：sourceName + markdown 字符串
3. Registry 模式：注册所有数据源 → fetchMatchingDataSources 过滤匹配 → 并行获取
4. 容错机制：Promise.allSettled，单个失败不影响整体
5. Barrel export 模式：`index.ts` 导出 fetchMatchingDataSources

**现有数据源：**

| 数据源 | 触发关键词 | 数据来源 | 输出格式 |
|--------|-----------|---------|---------|
| GitHub Trending | github trending/趋势/热门/热榜 | cheerio 爬取 github.com/trending | markdown 表格（rank, repo, desc, stars） |
| US Stock Movers | 美股/US stock/nasdaq/S&P 500/道琼斯/纳斯达克/标普/wall street | Yahoo Finance screener API | 涨跌幅表格 + {{FILL}} 占位符 |

6. 如何扩展新数据源：实现 DataSource 接口 → 添加到 registry 数组

**关键设计决策：**
- 为什么用 matches 模式匹配（自动根据用户兴趣选择数据源，无需手动配置）
- 为什么输出 markdown（直接注入 prompt，LLM 友好）
- 为什么 US Stock 用 {{FILL}} 占位符（让 LLM 补充分析，而非纯数据展示）

**注意事项：**
- GitHub Trending 依赖 HTML 结构，GitHub 改版时可能失效
- Yahoo Finance API 无官方文档，属于非公开接口
- 新增数据源时需要同时更新中英文关键词匹配

- [ ] **Step 1: 读取源文件**

读取 `src/lib/datasources/` 目录下所有文件。

- [ ] **Step 2: 编写 datasources.md**

- [ ] **Step 3: Commit**

```bash
git add docs/onboarding/modules/datasources.md
git commit -m "docs(onboarding): add datasources module documentation"
```

---

### Task 11: 编写 modules/frontend.md

**Files:**
- Create: `docs/onboarding/modules/frontend.md`
- Reference:
  - `src/app/(app)/layout.tsx` — AppLayout 鉴权守卫
  - `src/app/(app)/today/page.tsx` — Today 页面
  - `src/app/(app)/history/page.tsx` — History 列表页
  - `src/app/signin/page.tsx` — 登录页
  - `src/components/layout/app-shell.tsx` — AppShell 布局
  - `src/components/layout/side-nav.tsx` — SideNav 导航
  - `src/components/digest/digest-view.tsx` — DigestView
  - `src/components/digest/digest-markdown.tsx` — DigestMarkdown（GFM 渲染）
  - `src/components/digest/digest-skeleton.tsx` — DigestSkeleton
  - `src/components/states/` — EmptyState, StatusPanel

**按统一模板编写，覆盖内容：**

**概述**：Next.js App Router 驱动的前端，采用 Server Components 为主、Client Components 按需的混合渲染策略。

**架构图**：Mermaid flowchart 展示路由结构树（App Router hierarchy）。

**核心逻辑：**
1. 路由结构：
   - `/signin` — 登录页 + Preview 模式入口
   - `/(app)` route group — 鉴权守卫包裹
   - `/(app)/topics` — 兴趣配置表单
   - `/(app)/preview` — 预览生成 + 确认
   - `/(app)/today` — 当日摘要
   - `/(app)/history` — 归档列表
   - `/(app)/history/[digestDayKey]` — 历史详情
2. 布局层级：RootLayout → AppLayout(鉴权) → AppShell(SideNav + main)
3. 核心组件：
   - DigestView：title + intro + topics 渲染
   - DigestMarkdown：react-markdown + remark-gfm
   - DigestSkeleton：加载骨架屏
   - StatusPanel：状态面板（scheduled/generating/failed）
   - EmptyState：空状态引导
   - PreviewActions / PreviewGenerationKickoff（→ 详见 preview.md）
4. Today 页面双模式渲染（preview mode vs DB mode）

**关键设计决策：**
- 为什么用 `(app)` route group（集中鉴权，避免每个页面重复检查）
- 为什么 DigestView 是 Server Component（无需客户端交互）
- 为什么 PreviewGenerationKickoff 是 Client Component（需要轮询和状态管理）

**注意事项：**
- `(app)/layout.tsx` 在 preview mode 下跳过 session 检查
- Today 页面逻辑较复杂，preview mode 和 DB mode 的渲染路径完全不同
- 字体使用 Manrope（正文）+ IBM Plex Sans/Mono（代码）

- [ ] **Step 1: 读取源文件**

读取 `src/app/(app)/layout.tsx`、`src/app/(app)/today/page.tsx`、`src/components/layout/app-shell.tsx`、`src/components/digest/digest-view.tsx`、`src/components/states/` 目录。

- [ ] **Step 2: 编写 frontend.md**

- [ ] **Step 3: Commit**

```bash
git add docs/onboarding/modules/frontend.md
git commit -m "docs(onboarding): add frontend module documentation"
```

---

### Task 12: 交叉链接检查与最终 Commit

**Files:**
- Modify: 所有 10 个文档文件（检查和修复交叉链接）

- [ ] **Step 1: 检查所有文档间的交叉链接**

确认以下链接格式正确且指向存在的锚点：
- README.md → core-flows.md、modules/*.md、data-model.md
- core-flows.md → modules/*.md（每个流程步骤的 "详见" 链接）
- modules/*.md → data-model.md（引用表结构时）
- modules/*.md → 其他 modules/*.md（相关模块交叉引用）

- [ ] **Step 2: 检查 Mermaid 图语法**

确认所有 Mermaid 图块使用正确的语法，可以被标准 Mermaid 渲染器解析。

- [ ] **Step 3: 修复发现的问题**

如有断链或语法错误，逐一修复。

- [ ] **Step 4: Final commit（如有修改）**

```bash
git add docs/onboarding/
git commit -m "docs(onboarding): fix cross-links and Mermaid syntax"
```

---

## 并行执行建议

以下任务可以并行执行（无依赖关系）：

- **Group A**（无依赖）：Task 2 (data-model) + Task 3 (README)
- **Group B**（依赖 Task 1 目录创建完成）：Task 5-11 的所有模块文档可并行
- **Sequential**：Task 4 (core-flows) 建议在模块文档之后编写，以便准确添加交叉链接
- **Final**：Task 12 (交叉链接检查) 必须在所有文档完成后执行
