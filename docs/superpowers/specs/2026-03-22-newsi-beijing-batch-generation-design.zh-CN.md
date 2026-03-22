# Newsi 北京时间批量生成设计

日期：2026-03-22

## 背景

当前 Newsi 的正式日报调度逻辑基于“用户本地时区的每日 07:00”。这与免费部署方案存在冲突：

- 现有 [vercel.json](/Users/bytedance/Documents/newsi/vercel.json) 使用每小时一次的 Cron。
- Vercel Hobby 不适合当前这种高频调度策略。
- 用户当前需求改为：`每天按北京时间批量生成一次`。

本次变更目标是将产品的正式日报调度语义统一为 `Asia/Shanghai` 时区下的每日一次批量生成，同时保留现有 preview confirm 流程的首日即时可读体验。

## 目标

- 所有正式日报按 `北京时间 07:00` 批量生成。
- `Today` 与 `History` 的正式内容日期统一按北京时间归档。
- 用户确认 preview 后，仍然立即获得当天正式日报，不需要等待次日。
- 将部署方案调整为可兼容低频定时任务的平台配置。

## 非目标

- 不修改 Google OAuth 流程。
- 不修改 preview digest 的核心生成结构。
- 不删除用户表中的 `accountTimezone` 字段。
- 不在本次中引入多时区定时生成或“每用户独立调度”。

## 方案概览

采用固定调度时区方案：

- 调度时区固定为 `Asia/Shanghai`
- 调度 cutoff 固定为北京时间 `07:00`
- `DailyDigest.digestDayKey` 基于北京时间日期
- `InterestProfile.firstEligibleDigestDayKey` 基于北京时间日期
- Cron 改为每天一次

用户 `accountTimezone` 仍然保留，但不再参与正式日报调度判断。

## 核心行为

### 1. 正式日报调度

- `runDigestGenerationCycle()` 不再按每个用户的时区分别判断“是否已过 07:00”
- 系统仅基于当前北京时间判断：
  - 若未过 `07:00`，整次批处理不生成正式日报
  - 若已过 `07:00`，开始处理所有 `InterestProfile.status = active` 的用户
- 同一批次中，所有用户共享同一个北京时间 `digestDayKey`

### 2. Topics 保存后的首个可生成日期

保存或更新 Topics 时，`firstEligibleDigestDayKey` 仅依据北京时间计算：

- 若当前北京时间未过 `07:00`，则首个可生成日期为今天
- 若当前北京时间已过 `07:00`，则首个可生成日期为明天

这条规则仅决定“未来 cron 最早会从哪一天开始接手”，不影响 preview confirm 的即时提升行为。

### 3. Preview Confirm

preview confirm 行为保持不变：

- 用户在 `/preview` 点击确认后
- 当前 preview digest 立即提升为当日正式 `DailyDigest`
- `Today` 立即可读
- `History` 立即出现当天这一条

提升后的 `digestDayKey` 改为北京时间当天日期。

### 4. Confirm 后的未来生成

用户确认 preview 后：

- `InterestProfile.status` 变为 `active`
- `firstEligibleDigestDayKey` 被推进到“北京时间的下一天”
- 后续 cron 从第二天开始继续生成

这保证：

- 当天不会被 cron 重复覆盖
- 首日体验仍然是即时可读

## UI 与文案变化

所有用户可见的调度文案不再使用 `local` 或“本地 07:00”：

- `Today` scheduled 态改为明确使用 `Beijing time / 北京时间`
- README 中的运行说明、当前产品说明同步替换

建议文案：

- `Your first digest is scheduled for March 22, 2026 after the Beijing 07:00 run.`
- `Your next digest will appear after the Beijing 07:00 run.`

中文文案在 i18n 收敛时同步使用：

- `你的下一篇日报将在北京时间 07:00 批量生成后出现。`

## 技术影响面

### 1. 调度工具

文件：

- [src/lib/timezone.ts](/Users/bytedance/Documents/newsi/src/lib/timezone.ts)

需要将当前“接收任意 timezone 参数”的正式调度 helper 改造为固定北京时间语义，建议引入常量：

- `DIGEST_TIMEZONE = "Asia/Shanghai"`
- `DIGEST_RUN_HOUR = 7`

保留通用 timezone helper 只在确有需要的地方使用，但正式 digest 逻辑不再依赖用户时区。

### 2. Topics 保存

文件：

- [src/lib/topics/service.ts](/Users/bytedance/Documents/newsi/src/lib/topics/service.ts)

变更点：

- `firstEligibleDigestDayKey` 改为按北京时间计算
- `browserTimezone` 不再参与正式调度日期计算
- `accountTimezone` 可以继续保存，但不决定日报生成日期

### 3. Digest 生成周期

文件：

- [src/lib/digest/service.ts](/Users/bytedance/Documents/newsi/src/lib/digest/service.ts)

变更点：

- 不再读取 `profile.user.accountTimezone` 参与调度判断
- 批次层统一判断北京时间是否过 `07:00`
- 所有 active 用户使用同一个北京时间 `digestDayKey`

### 4. Today 视图文案

文件：

- [src/lib/digest/view-state.ts](/Users/bytedance/Documents/newsi/src/lib/digest/view-state.ts)
- 相关页面和测试

变更点：

- scheduled 文案从 `local 07:00` 改为 `Beijing 07:00`

### 5. 部署配置

文件：

- [vercel.json](/Users/bytedance/Documents/newsi/vercel.json)

变更点：

- Cron 从“每小时一次”调整为“每天一次”

注：Vercel 使用 UTC schedule 时，需要将北京时间 `07:00` 换算成对应 UTC 时间表达式后再写入配置。

## 测试策略

### 单元测试

- `timezone` / 调度 helper：
  - 北京时间 `07:00` 前后的 day key 与 cutoff 判定
- `topics service`：
  - 保存 Topics 时，`firstEligibleDigestDayKey` 改为按北京时间计算
- `digest view state`：
  - scheduled 文案改为北京时间表述
- `digest service`：
  - 批处理不再因用户时区不同而分叉

### 集成与 e2e

- `Preview -> Confirm -> Today -> History` 流程保持通过
- 确认后 Today 和 History 仍即时可读
- 定时任务相关测试改为北京时间批处理语义

## 风险与取舍

### 风险 1：海外用户的“日报出现时间”不再是本地时间

这是有意取舍。当前目标是免费上线与更简单的调度模型，而不是多时区个性化调度。

### 风险 2：`accountTimezone` 留在数据模型中但不参与调度，可能造成歧义

本次允许该字段暂时保留，避免引入数据库迁移和额外清理成本。后续可再决定是否删除或改作展示用途。

### 风险 3：Vercel Cron 的时区表达需要谨慎处理

实现时必须明确使用 UTC cron 表达式换算到北京时间 `07:00`，避免部署后跑在错误时刻。

## 推荐实现顺序

1. 先写失败测试，覆盖北京时间调度语义
2. 改 `timezone` / 调度 helper
3. 改 `topics service`
4. 改 `digest service`
5. 改 `Today` 文案与 README
6. 改 `vercel.json`
7. 运行 `tsc`、`eslint`、`vitest`、相关 smoke test

## 验收标准

- 正式日报调度只基于北京时间 `07:00`
- active 用户在每天北京时间批处理中共享同一 `digestDayKey`
- preview confirm 后 Today 与 History 当天立即可读
- scheduled 文案不再出现 `local 07:00`
- `vercel.json` 不再使用每小时一次调度

