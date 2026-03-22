# Newsi 预览确认流设计

- 日期：2026-03-22
- 状态：Ready for Planning
- 关联项目：Newsi MVP
- 背景：现有 MVP 在用户于 `Topics` 页面保存兴趣描述后，会直接进入站内待生成/定时生成逻辑。新的需求要求用户先看到一篇基于当前 Topics 生成的真实日报预览，并在确认效果满意后，才开启后续每日 Cron 自动生成。

## 1. 目标

本次改动要验证的核心命题从：

“用户是否愿意填写 Topics 并等待 Newsi 每日自动生成日报”

改为：

“用户是否认可基于当前 Topics 生成出来的真实日报效果，并愿意在确认后开启每日自动生成”

本次改动的目标是：

- 用户在 `Topics` 保存后，立即进入一个真实预览日报生成流
- 预览日报必须使用真实 LLM provider 生成，不使用 mock digest
- 用户确认预览满意后，才开启后续每日 Cron
- 未确认前，不进入 `Archive`，也不参与 Cron

## 2. 非目标

本次不做：

- 多次预览版本对比
- 用户对预览结果打分
- 预览内容进入 `Archive`
- 预览确认后的邮件或站外通知
- 单独的“以后再开启自动生成”设置项

## 3. 用户流程

### 3.1 首次配置

1. 用户进入 `Topics`
2. 用户填写兴趣描述并点击保存
3. 系统保存当前 Topics 为待确认配置，并创建一条预览日报生成任务
4. 页面跳转到 `/preview`
5. `/preview` 先展示 `Generating preview...`
6. 系统调用真实 provider 生成一篇日报预览
7. 生成完成后，`/preview` 展示完整预览日报
8. 用户点击 `Confirm and start daily digests`
9. 系统将当前 Topics 配置标记为正式激活
10. 后续每日 Cron 才开始为该用户生成正式日报

### 3.2 未确认时的行为

- `Today` 不显示 scheduled digest
- `Today` 显示“你有一篇待确认的日报预览，请先完成确认”
- `Archive` 保持空
- Cron 跳过该用户

### 3.3 已激活后再次修改 Topics

1. 用户修改 `Topics`
2. 系统将当前配置重新置为待确认
3. 旧的自动生成资格暂停
4. 系统重新生成新的预览日报
5. 用户再次确认后，才恢复每日 Cron

这条规则保证“用户看到并确认过的效果”与“后续自动生成依据的配置”一致。

补充规则：

- 已有的正式 `Archive` 继续保留可见
- 仅暂停新的正式日报生成
- `Today` 在这段时间切换为“请先完成预览确认”的引导状态

## 4. 页面与路由设计

### 4.1 `Topics`

职责：

- 编辑兴趣描述
- 提交后不再直接进入正式 `Today` 流程
- 保存后立即跳转 `/preview`

按钮文案：

- `Save interests`
- 已有内容时保留 `Clear interests`

`Clear interests` 行为：

- 删除当前 `InterestProfile`
- 删除当前 `PreviewDigest`
- 立即停止后续 Cron 资格
- 已有正式 `Archive` 历史继续保留
- `Today` 回到无配置 empty state

### 4.2 `Preview`

新增独立路由：`/preview`

页面状态：

- `generating`
  - 标题：`Generating preview...`
  - 文案说明：Newsi 正在根据当前 Topics 生成一篇真实日报预览
- `ready`
  - 展示完整日报阅读页
  - 操作按钮：
    - `Confirm and start daily digests`
    - `Back to Topics`
- `failed`
  - 提示生成失败
  - 操作按钮：
    - `Try again`
    - `Back to Topics`

无效访问处理：

- 若用户没有 `pending_preview` 配置，也没有当前 `PreviewDigest`，则访问 `/preview` 时直接跳回 `Topics`

### 4.3 `Today`

增加一个新状态：`pending_preview_confirmation`

展示逻辑：

- 无 Topics：保留现有 empty state
- 有 Topics 且 `pending_preview`：渲染一个引导 panel，不自动重定向，提供明确 CTA：`Continue preview`
- 已 `active`：走现有正式日报逻辑

### 4.4 `Archive`

未确认前：

- 不显示预览日报
- 若用户此前从未进入过 `active`，则保持空状态
- 若用户此前已经产生过正式 `DailyDigest`，则旧的正式 `Archive` 继续保留可见

已确认后：

- 仍只展示正式 `DailyDigest`

## 5. 数据模型设计

### 5.1 `InterestProfile`

新增字段：

- `status`
  - `pending_preview`
  - `active`

字段语义：

- `pending_preview`：当前 Topics 还没有被用户用真实日报效果确认
- `active`：当前 Topics 已被用户确认，可以进入后续每日 Cron

补充说明：

- `none` 不是持久化状态，不写入数据库
- `none` 仅表示该用户当前没有 `InterestProfile` 记录，是页面层的展示态
- 对已存在于旧版本中的 `InterestProfile`，migration 回填 `status = active`
- 回填为 `active` 的原因是保持旧版本用户的既有每日生成行为，不因本次需求改动被整体中断

`firstEligibleDigestDayKey` 的含义调整为：

- 仅在 `active` 后用于正式 `DailyDigest`
- 不再用于控制预览生成

### 5.2 `PreviewDigest`

新增独立对象，不复用 `DailyDigest`

建议字段：

- `id`
- `userId`
- `generationToken`
- `interestTextSnapshot`
- `status`
  - `generating`
  - `failed`
  - `ready`
- `title`
- `intro`
- `contentJson`
- `readingTime`
- `providerName`
- `providerModel`
- `failureReason`
- `createdAt`
- `updatedAt`

设计原则：

- 每个用户同一时刻只保留一份当前预览日报
- 预览日报是“待确认资产”，不是正式归档内容
- 用户重新改 Topics 时，旧预览可被覆盖
- 确认完成后，当前 `PreviewDigest` 直接删除，不保留在前台系统中
- `generationToken` 用于防止旧的 provider 结果回写覆盖当前最新预览

## 6. 生成链路设计

### 6.1 保存 Topics

`saveInterestProfile()` 的职责调整为：

1. 校验输入
2. 更新 `InterestProfile.interestText`
3. 将 `InterestProfile.status` 设为 `pending_preview`
4. 创建或覆盖该用户的 `PreviewDigest(status=generating)`，并刷新新的 `generationToken`
5. 跳转 `/preview`

这里不直接同步调用 LLM provider。

### 6.2 生成预览日报

预览日报与正式日报应尽量复用同一套 provider 和 digest schema。

建议新增独立服务，例如：

- `createPreviewDigest()`
- `generatePreviewDigest()`
- `confirmPreviewDigest()`

预览生成输出：

- 使用真实 LLM provider
- 使用真实结构化 digest schema
- 写入 `PreviewDigest`

### 6.3 `/preview` 的生成行为

不在 `Topics` 提交动作中同步等待 LLM 返回。

推荐流程：

- `Topics` 保存后先写入 `PreviewDigest(generating)`
- 跳转 `/preview`
- `/preview` 在加载时：
  - 若 `ready`，直接展示
  - 若 `generating`，显示等待态并通过明确的 server action 或 route handler 启动生成
  - 若 `failed`，允许重试

生成所有权约束：

- `Topics` 保存只负责创建/覆盖 `PreviewDigest(generating)` 记录
- 真正的 provider 调用由 `/preview` 对应的独立生成入口触发
- 该生成入口必须保证同一条 `PreviewDigest` 只会被启动一次，避免重复 provider 调用
- `failed` 状态下的重试复用同一条 `PreviewDigest` 记录，而不是创建新记录

陈旧结果失效规则：

- provider 调用启动时，必须读取并携带当前 `generationToken`
- provider 返回写回时，必须再次校验 token 仍然匹配当前 `PreviewDigest`
- 若用户在生成过程中再次修改 `Topics` 或点击 `Clear interests`，则旧 token 立即失效
- 失效 token 对应的旧结果必须被直接丢弃，不允许覆盖当前最新状态

原因：

- 真实 provider 延迟不可控
- 避免用户卡在表单提交
- 更符合“先进入 Generating preview 状态页”的需求

## 7. 确认与正式激活

当用户点击 `Confirm and start daily digests` 时：

1. 校验当前 `PreviewDigest.status = ready`
2. 校验 `PreviewDigest.interestTextSnapshot` 仍然等于当前 `InterestProfile.interestText`
3. 若快照不一致，则拒绝确认，并要求用户基于最新 Topics 重新生成预览
4. 将 `InterestProfile.status` 更新为 `active`
5. 根据用户时区重新计算 `firstEligibleDigestDayKey`
6. 删除当前 `PreviewDigest`
7. 重新验证 `/today` 与 `/archive` 的正式状态

确认后不要求立即生成一条正式 `DailyDigest`。正式日报仍由后续每日 Cron 按规则执行。

## 8. Cron 改造

`runDigestGenerationCycle()` 只处理：

- `InterestProfile.status = active`

明确跳过：

- `pending_preview`

这样可以保证：

- 用户未确认前不会进入正式日报系统
- `Archive` 中不会混入未确认配置生成的内容

## 9. Preview Mode 改造

当前本地 preview mode 使用 cookie 和 mock digest。

这部分需要同步调整：

- 保存 `Topics` 后进入 `/preview`
- `/preview` 的本地模式继续允许 mock digest，但页面结构要与正式模式一致
- 在本地 preview mode 下，也必须保留“确认后才进入正式自动生成”的状态机

目的不是让本地 preview mode 变成真实联网，而是让交互流一致。

## 10. 状态机

### 10.1 InterestProfile 状态

- `none`
  - 用户尚未填写 Topics
- `pending_preview`
  - 用户已填写/修改 Topics
  - 已进入预览确认流
  - Cron 不处理
- `active`
  - 用户已确认预览效果
  - Cron 正式处理

### 10.2 PreviewDigest 状态

- `generating`
- `ready`
- `failed`

## 11. 测试策略

### 11.1 单元测试

- `InterestProfile.status` 状态切换
- `confirmPreviewDigest()` 会正确激活 profile 并计算 `firstEligibleDigestDayKey`
- Cron 只处理 `active` 用户
- 重新编辑 Topics 会将 `active` 退回 `pending_preview`

### 11.2 集成测试

- `Topics` 保存后跳转 `/preview`
- `/preview` 在 `generating / ready / failed` 三种状态下的渲染
- 用户确认后，`Today` 从“先去预览”状态切换到正式逻辑
- 未确认前 `Archive` 为空

### 11.3 E2E

主路径：

1. `signin`
2. `topics`
3. `/preview` generating
4. `/preview` ready
5. confirm
6. `/today`
7. `/archive`

补充路径：

1. 用户已 `active`
2. 再次修改 `Topics`
3. 回到 `pending_preview`
4. Cron 暂停
5. 再次确认后恢复正式生成

## 12. 实现顺序

1. 数据模型扩展
   - `InterestProfile.status`
   - `PreviewDigest`
2. Preview service
   - 创建预览
   - 生成预览
   - 确认预览
3. 页面与路由
   - `Topics` 保存跳转
   - 新增 `/preview`
   - `Today` 分流
4. Cron 过滤 `active`
5. Preview mode 同步调整
6. 测试补齐

## 13. 风险与约束

### 13.1 风险：首次体验变慢

真实预览需要真实 LLM 调用，用户首次保存 Topics 后会经历一次明显等待。

应对：

- 明确展示 `Generating preview...`
- 避免在提交动作中同步阻塞
- 允许失败重试

### 13.2 风险：用户反复改 Topics 导致系统频繁重跑预览

应对：

- 每次 Topics 变更只保留当前最新预览
- 不保留多版本
- 确认动作必须校验 `interestTextSnapshot` 与当前 profile 一致，拒绝旧预览被误确认

### 13.3 风险：正式日报与预览日报在时效上存在差异

预览生成发生在用户操作时，正式日报生成发生在 Cron 时点，结果不可能完全一致。

这不是缺陷，但产品文案应明确：

- 预览用于验证日报风格与相关性
- 正式日报将按每日运行时的实时信息生成

## 14. 验收标准

- 用户保存 `Topics` 后进入 `/preview`
- `/preview` 先显示 `Generating preview...`
- 系统可生成一篇真实预览日报
- 用户确认前不进入 `Archive`
- 用户确认前 Cron 不处理该用户
- 用户确认后，profile 进入 `active`
- 后续 Cron 才开始生成正式 `DailyDigest`
- 用户再次修改 `Topics` 后，必须重新走预览确认流
