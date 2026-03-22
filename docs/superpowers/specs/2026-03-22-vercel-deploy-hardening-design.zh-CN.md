# Newsi Vercel 可部署化收口设计

日期：2026-03-22

## 背景

Newsi 当前已经具备核心 MVP 功能，但仓库的部署路径仍偏向“本地开发可运行”，还没有完全收口成一套对 Vercel 友好的正式部署方案。项目已经使用 Next.js App Router、Prisma、Google OAuth 和每天一次的 Vercel Cron，因此最自然的正式发布路径是 Vercel。

本次工作的目标不是重做架构，而是让仓库达到“可以直接按 README 配置并部署到 Vercel Hobby”的状态。

## 目标

- 让仓库具备明确的 Vercel 构建脚本
- 让数据库迁移在部署路径中有清晰入口
- 让 README 可以单独承担上线说明职责
- 保持当前每天一次的 Vercel Cron 方案
- 不改变现有产品功能和主要运行架构

## 非目标

- 不引入新的部署平台
- 不增加 GitHub Actions 或完整 CI/CD 流程
- 不实现一键创建数据库或一键注入 Secrets
- 不切换认证方案
- 不改变 Cron 的每日一次设计

## 方案对比

### 方案 A：最小部署脚本 + 文档收口

只补 Vercel 所需的构建脚本和 README 部署文档，不进一步强化工程约束。

优点：

- 改动最小
- 可最快进入正式部署

缺点：

- 对交接和后续维护的约束较弱

### 方案 B：面向 Vercel 的工程化收口（采用）

在最小脚本和文档之外，再明确生产 Node 版本、数据库迁移入口、Cron 边界和部署后验收步骤，使仓库更接近正式交付状态。

优点：

- 与当前 MVP 阶段匹配
- 能直接支撑 Vercel Hobby 部署
- 成本低于完整 CI/CD，但明显优于“只有代码能跑”

缺点：

- 仍然需要手动在平台侧完成环境变量和数据库配置

### 方案 C：完整平台化部署

继续延伸到 CI/CD、自动化校验、多环境管理和更强的平台绑定。

优点：

- 自动化程度更高

缺点：

- 对当前 MVP 明显过重
- 引入不必要的维护复杂度

## 最终设计

采用方案 B。

## 设计内容

### 1. 构建与迁移脚本

在 `package.json` 中补齐面向部署的脚本：

- `db:generate`
  - 执行 `prisma generate`
- `db:migrate:deploy`
  - 执行 `prisma migrate deploy`
- `vercel-build`
  - 顺序执行：
    - `pnpm db:generate`
    - `pnpm db:migrate:deploy`
    - `next build`

目标是让 Vercel 的 Build Command 可以直接配置为：

```bash
pnpm vercel-build
```

### 2. README 部署章节

README 新增正式部署章节，至少覆盖以下内容：

- 推荐部署平台：Vercel
- 数据库准备方式：托管 PostgreSQL
- Google OAuth 生产回调地址格式
- 生产环境变量清单
- 推荐 Build Command
- 上线后需要验证的关键路径
- Cron 的产品语义说明

### 3. Node 与环境边界说明

README 中明确说明：

- 项目推荐使用受 Prisma 7 支持的 Node 版本线
- 本地若使用不受支持的 Node 版本，可能在迁移阶段出现问题
- Vercel 项目应对齐仓库中的 Node 版本要求

### 4. Cron 语义说明

保留当前的 `vercel.json` 每日一次任务配置。

同时在文档中明确：

- Newsi 当前使用每天一次的批量生成
- Vercel Hobby 适合这种每日任务
- Cron 的平台触发精度以 Vercel 平台行为为准，产品层应理解为“按天生成”，而不是严格秒级或分钟级准点执行

这是基于 Vercel 官方 Cron 使用说明得出的产品层推断。

### 5. 安全提醒

README 中补充上线前安全提醒：

- 任何在开发或对话过程中暴露过的密钥都应在正式上线前轮换
- 重点包括：
  - Google OAuth Client Secret
  - Gemini / OpenAI API Key
  - `AUTH_SECRET`
  - `CRON_SECRET`

## 文件边界

### 修改

- `package.json`
  - 新增部署相关脚本
- `README.md`
  - 新增或重写 Vercel 部署章节

### 保持不变

- `vercel.json`
  - 保留当前每天一次的 cron 配置
- 应用代码
  - 本次不以修改业务代码为目标，除非为了部署脚本兼容性必须做极小改动

## 验收标准

- `package.json` 中存在明确可用的 Vercel 构建脚本
- README 足以指导一个新接手的人完成上线
- 当前功能验证命令继续可运行：
  - `pnpm exec tsc --noEmit`
  - `pnpm exec vitest run`
  - `pnpm exec eslint .`
- 如果环境允许，补充：
  - `pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts`

## 实施建议

本次只做部署收口，不借机重构应用逻辑。优先保证“部署流程可执行、文档可操作、平台约束清晰”，避免扩张到完整 DevOps 体系。
