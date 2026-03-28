# Newsi 新人上手指南

> 本文档是新成员加入 Newsi 项目的入口文档，帮助你快速建立对项目的全局认知，并找到深入阅读的路径。

---

## 1. 项目简介

Newsi 是一个**个人每日情报简报**应用。核心使用流程非常简洁：

1. 用户编写一段自然语言描述的兴趣，称为 **Standing Brief**（例如"关注 AI 基础设施、Rust 生态和量化交易领域的最新进展"）。
2. 系统每天自动调用 LLM，基于该兴趣描述生成一份**综合简报（Digest）**。
3. 用户打开应用即可阅读当天的简报，也可以回溯历史记录。

项目的设计目标是让信息获取变得**被动化、个性化、结构化**——用户只需定义一次兴趣，后续的信息筛选与整合完全由 AI 完成。

---

## 2. 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.2.1 | 全栈框架（App Router） |
| React | 19.2.4 | UI 渲染 |
| TypeScript | 5 | 类型安全 |
| TailwindCSS | 4 | 样式 |
| Prisma | 7.5 | ORM |
| PostgreSQL | 16 | 数据库 |
| next-auth | 4.24 | 认证（Google OAuth） |
| OpenAI API | - | LLM Provider（gpt-5.4） |
| Google Gemini | - | LLM Provider（gemini-2.5-flash） |
| Zod | 4.3 | Schema 校验 |
| Vitest | 4.1 | 单元/集成测试 |
| Playwright | 1.58 | E2E 测试 |

**补充说明：**

- 项目使用 **App Router** 架构，所有路由定义在 `src/app/` 下，请注意区分 Server Component 与 Client Component 的边界。
- LLM Provider 支持 OpenAI 和 Google Gemini 两种后端，通过 `LLM_PROVIDER` 环境变量切换。Gemini 方案利用了 **Google Search grounding** 能力，为生成内容提供实时搜索数据支撑。
- Zod 用于对 LLM 返回结果和 API 输入做 schema 校验，确保数据结构符合预期。

---

## 3. 目录结构

```
src/
├── app/          # Next.js App Router 路由
│   ├── (app)/    # 需要认证的页面（topics, preview, today, history）
│   ├── api/      # API 路由（auth, cron, preview）
│   └── signin/   # 登录页
├── lib/          # 业务逻辑
│   ├── digest/   # 摘要生成核心（service, provider, prompt, schema）
│   ├── topics/   # 兴趣配置
│   ├── preview-digest/ # 预览流程
│   ├── datasources/    # 外部数据源（GitHub Trending, US Stocks）
│   └── i18n/     # 国际化
├── components/   # React 组件
│   ├── digest/   # 摘要展示（DigestView, DigestMarkdown）
│   ├── layout/   # 布局（AppShell, SideNav）
│   ├── preview/  # 预览相关
│   └── states/   # 状态组件（EmptyState, StatusPanel）
prisma/
├── schema.prisma # 数据库 Schema
└── migrations/   # 数据库迁移
```

**关键目录解读：**

- `src/app/(app)/`：括号表示 Next.js 的 Route Group，不会出现在 URL 路径中，其中的页面均需要用户登录后才能访问。
- `src/lib/digest/`：这是整个项目最核心的模块，包含摘要生成的 service 层、LLM provider 适配、prompt 模板和输出 schema 定义。
- `src/lib/preview-digest/`：Preview Mode 的独立流程，允许用户在未登录、无数据库的情况下体验核心功能。
- `src/lib/datasources/`：外部数据源集成，目前支持 GitHub Trending 和 US Stocks，数据会作为上下文注入到 LLM prompt 中。

---

## 4. 术语表

| 术语 | 含义 |
|------|------|
| Standing Brief | 用户编写的自然语言兴趣描述，系统据此生成每日简报。它是整个产品的核心输入，决定了简报的内容方向 |
| Digest Day Key | `YYYY-MM-DD` 格式的日期标识，基于用户时区计算。每天最多生成一份 Digest，以此 key 去重 |
| First Eligible Digest Day Key | 预览确认后的次日，即首次可生成每日摘要的日期。用于防止用户在预览当天重复生成 |
| Generation Token | 防止预览生成并发竞态的唯一令牌。每次发起预览请求时生成，只有持有最新 token 的请求才会被处理 |
| Preview Mode | 无需数据库和认证的本地体验模式，基于加密 cookie 存储状态。适合新用户快速试用和本地开发调试 |
| Grounding | Gemini 的 Google Search grounding 功能，为 LLM 输出提供实时搜索数据支撑。相比纯 LLM 生成，grounding 能显著提升信息的时效性和准确性 |

---

## 5. 阅读路径

建议按以下顺序循序渐进地阅读文档：

1. **建立全局认知**：先阅读 [core-flows.md](core-flows.md)，理解 3 条核心端到端流程——Preview 流程、Daily Digest 生成流程、历史回溯流程。这是理解整个系统的骨架。
2. **深入模块细节**：根据你负责或感兴趣的领域，进入 [modules/](modules/) 目录阅读对应模块的详解文档。每个模块文档包含职责说明、核心函数、数据流和注意事项。
3. **理解数据层**：阅读 [data-model.md](data-model.md)，了解数据库表结构、实体关系和关键字段的设计考量。

**针对不同角色的快速入口：**

- 如果你主要做**前端**工作：重点关注 `src/components/` 和 `src/app/(app)/` 下的页面组件，理解 DigestView 的渲染逻辑。
- 如果你主要做**后端/AI**工作：重点关注 `src/lib/digest/` 和 `src/lib/datasources/`，理解 prompt 构造和 LLM provider 的适配层。
- 如果你负责**基础设施**：重点关注 `prisma/`、`src/lib/db.ts` 和 `src/app/api/cron/` 的定时任务逻辑。

---

## 6. 本地开发快速启动

### 6.1 环境变量

在项目根目录创建 `.env.local` 文件，需要配置以下环境变量：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `AUTH_SECRET` | next-auth 加密密钥 |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `LLM_API_KEY` 或 `GEMINI_API_KEY` | LLM 服务的 API Key |
| `LLM_PROVIDER` | LLM 提供商选择（`openai` 或 `gemini`） |

### 6.2 Preview Mode（推荐新手首次体验）

如果你暂时没有数据库或 Google OAuth 凭据，可以使用 Preview Mode 快速体验核心功能：

- 设置 `FORCE_LOCAL_PREVIEW=1`，或者不配置 auth 相关变量即可自动进入 Preview Mode。
- 该模式下无需 PostgreSQL，用户状态通过加密 cookie 存储在浏览器端。
- 你可以完整体验 Standing Brief 编写和 Digest 预览生成的全流程。

### 6.3 完整模式启动

```bash
# 1. 安装依赖
pnpm install

# 2. 配置数据库（需要先启动 PostgreSQL）
npx prisma migrate deploy

# 3. 启动开发服务器
pnpm dev
```

启动后访问 `http://localhost:3000` 即可。

### 6.4 测试

```bash
# 单元/集成测试
pnpm test

# E2E 测试
pnpm test:e2e
```

---

## 7. 暂不覆盖的模块

以下模块在首批文档中暂不单独成文，后续按需补充：

- **i18n**（`src/lib/i18n/`）：国际化模块，包含 locale 配置和消息目录。目前支持中英文，通过浏览器语言偏好自动切换。
- **timezone**（`src/lib/timezone.ts`）：北京时区工具函数，用于 Digest Day Key 的计算和日期展示。
- **db**（`src/lib/db.ts`）：Prisma client 单例，确保开发环境下热重载不会创建多余的数据库连接。

如果你在开发过程中需要深入了解这些模块，可以直接阅读源码——它们的实现都比较简洁。

---

## 8. 文档维护策略

为了保持文档与代码的一致性，请遵守以下约定：

1. **修改业务逻辑时同步更新对应模块文档**：如果你修改了某个模块的核心流程或接口，请在同一个 PR 中更新 `docs/onboarding/modules/` 下对应的文档。
2. **新增模块时按统一模板创建文档**：参考已有模块文档的结构（职责、核心函数、数据流、注意事项），在 `modules/` 下创建新文档，并在本文件的目录结构或阅读路径中注册。
3. **定期检查代码引用的准确性**：文档中引用的函数名、文件路径可能因重构而变化，建议在每个 sprint 结束时做一次快速校验。

> 文档的目标不是面面俱到，而是帮助新人在最短时间内建立正确的心智模型。保持简洁、准确、及时更新。
