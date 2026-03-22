# Sidebar Redesign — Design Spec

**Date:** 2026-03-22
**Scope:** `AppShell` 导航结构、桌面侧边栏、移动端导航模式
**Status:** Draft

## Problem

当前侧边栏存在三个核心问题：

1. 结构问题：应用壳层在移动端仍然保持横向布局，侧栏会持续占用横向空间，正文阅读区被压缩。
2. 设计问题：当前导航更像通用后台菜单，而不是服务阅读体验的编辑式索引。
3. 交互问题：激活态主要靠颜色区分，折叠按钮缺少可访问名称与焦点样式，折叠态退化成纯图标菜单。

## Design Decision

采用 **Editorial Navigation** 方向，目标不是把导航做成产品中枢，而是把它做成阅读产品的目录页边栏。

### 结论

- 桌面端：侧边栏默认展开，允许用户主动折叠成窄轨。
- 移动端：不复用桌面侧边栏，改为顶部栏 + 抽屉。
- 视觉基调：暖灰纸面、克制层级、低噪声标签、柔和而明确的当前页状态。
- 导航表达：标签优先，图形辅助，避免通用 SaaS 图标主导整体气质。

## Alternatives Considered

### A. Editorial Navigation（采用）

特征：
- 侧栏像目录索引，而不是功能面板
- 标签优先，图形极弱化
- 当前页通过容器形状、标记点与字重共同表达

优点：
- 最符合 Newsi 当前“阅读 / 编辑部 / 日报”气质
- 不会抢正文注意力
- 允许后续扩展更多栏目时仍保持秩序感

缺点：
- 导航感比传统产品菜单更弱，需要用版式和节奏来建立清晰度

### B. Product Control Center（未采用）

特征：
- 卡片化导航，强按钮感，强状态感

不采用原因：
- 容易把 Newsi 推向“效率工具 / 后台产品”视觉语言
- 侧栏会压过 digest 内容，破坏阅读中心

### C. Brand-Led Rail（未采用）

特征：
- 更强调品牌图形、装饰色块、情绪氛围

不采用原因：
- 品牌表达会与正文竞争
- 适合营销入口，不适合作为高频内页导航主结构

## Specification

### 1. Information Architecture

当前一级导航保持不变：

- `Today`
- `History`
- `Topics`

要求：

- 桌面与移动复用同一份导航数据配置。
- 导航数据至少包含 `href`、`label`、`shortLabel`、激活判定规则。
- 桌面展开态显示完整标签；桌面折叠态显示简化标记；移动抽屉显示完整标签。

### 2. Desktop Layout

#### App Shell

桌面应用壳层采用左右结构：

- 左侧为固定宽度 rail
- 右侧为主内容区
- rail 与正文之间有稳定分隔，不随页面内容变化

建议参数：

| Property | Value |
|----------|-------|
| Rail width (expanded) | `240-252px` |
| Rail width (collapsed) | `72-80px` |
| Rail background | 暖灰纸面色，区别于正文白色阅读面 |
| Divider | `1px` 浅边线 |

#### Expanded State

展开态为桌面默认主态。

结构顺序：

1. 品牌区
2. 折叠控制
3. 一级导航列表
4. 可选的轻说明区或留白收尾

设计要求：

- 品牌区不需要大图标装饰，只保留小型品牌标记 + `Newsi`
- 一级导航上下节奏要宽松，避免密集菜单感
- 导航项使用整行点击容器，不是“裸文字 + 单独图标”

#### Collapsed State

折叠态是用户主动触发的次级状态，不是默认体验。

设计要求：

- 折叠后保留 rail 的存在感，不退化成一列悬空图标
- 保留品牌标记
- 保留当前页可识别状态
- 保留明确的展开入口
- 折叠态更像“窄轨索引”，而不是“图标工具栏”

### 3. Mobile Layout

移动端不使用桌面侧栏的压缩版本。

采用：

- 顶部栏
- 侧向抽屉

#### Top Bar

顶部栏只承担三个元素：

1. 品牌名 `Newsi`
2. 当前页面名
3. 菜单入口按钮

设计要求：

- 高度紧凑但不拥挤
- 背景延续 rail 的暖灰色
- 不在顶部栏平铺全部导航项

#### Drawer

抽屉打开后展示完整一级导航：

- `Today`
- `History`
- `Topics`

设计要求：

- 与桌面展开态共用视觉语义
- 当前页仍然使用容器 + 标记点 + 字重表达
- 打开时覆盖内容，不挤压主阅读区
- 关闭逻辑清晰，支持键盘与触屏操作

### 4. Navigation Item Design

一级导航项采用“标签优先”的设计。

#### Expanded Item

组成：

- 小型辅助标记（推荐点、短线或极简符号）
- 导航标签

风格要求：

- 标签为主要信息
- 辅助标记只服务辨识，不抢视觉重心
- 不使用通用产品图标作为主表达

#### Active State

当前页不能只靠颜色变化表达。

必须同时具备：

- 柔和容器背景或浅色 pill
- 辅助标记强调（例如 accent dot）
- 更高字重或更高对比文字

目标：

- 用户余光扫过 rail 时也能快速确认当前位置

#### Inactive State

未激活项应是“可点击但克制”，不是“禁用灰”。

要求：

- 默认文字颜色高于当前 `--text-muted`
- hover 后进一步增强对比
- 允许轻微背景变化，但不能像主按钮

### 5. Iconography

当前实现中使用了较通用的产品图标（calendar / inbox / app grid）。

改造方向：

- 优先弱化图标权重
- 若保留图形辅助，建议使用更抽象、更编辑化的标记
- 在折叠态中也不应出现“只剩通用图标”的情况

### 6. Interaction Rules

#### Collapse Toggle

折叠按钮是版式控制，不是功能按钮。

要求：

- 放在品牌区附近
- 命中区足够大
- 始终提供 `aria-label`
- 始终提供清晰 `focus-visible`
- hover / active 状态克制，不做强按钮化处理

#### State Persistence

桌面折叠状态应持久化：

- 推荐存储于 `localStorage`
- 刷新后保留用户选择

边界：

- 仅桌面端使用该持久化状态
- 移动端抽屉开关不复用桌面折叠状态

#### Motion

过渡应保持克制。

要求：

- 不使用 `transition: all`
- 只过渡必要属性，例如 `width`、`padding`、`opacity`
- 动画时长建议 `150-200ms`
- 需要兼顾 `prefers-reduced-motion`

### 7. Accessibility

该改造必须补齐当前可访问性缺口。

要求：

- 折叠 / 展开按钮必须有 `aria-label`
- 当前页建议设置 `aria-current="page"`
- 交互元素必须有清晰 `focus-visible`
- 折叠态不能只依赖 `title` 作为理解方式
- 移动抽屉需要合理焦点管理与关闭路径

### 8. Implementation Structure

建议拆分为三个展示单元：

1. `DesktopSideNav`
2. `MobileTopBar`
3. `MobileNavDrawer`

同时抽出共享导航配置：

- `navigation-items.ts` 或同等职责模块

不建议继续把所有断点和所有状态都塞进单个 `SideNav` 组件。

### 9. Styling Tokens

新增导航专用 token，避免继续直接复用正文弱化色：

- rail 背景色
- rail 边框色
- nav 默认文字色
- nav hover 文字 / 背景
- nav active 背景
- nav active 文字
- focus ring 色

这些 token 可以继续挂在 `globals.css` 的变量体系中。

## Files to Modify

| File | Change |
|------|--------|
| `src/components/layout/app-shell.tsx` | 改为移动端顶部栏 / 桌面 rail 的壳层结构 |
| `src/components/layout/side-nav.tsx` | 拆分或重构为桌面侧栏职责 |
| `src/app/globals.css` | 增加导航专用颜色与交互 token |
| `tests/integration/app-shell.test.tsx` | 补导航可访问性与状态相关断言 |
| `tests/e2e/newsi-smoke.spec.ts` | 增加移动端导航结构与交互覆盖 |

## Files to Create

建议新增：

- `src/components/layout/mobile-top-bar.tsx`
- `src/components/layout/mobile-nav-drawer.tsx`
- `src/components/layout/navigation-items.ts`

是否最终拆成独立文件，可在实现阶段根据复杂度确认，但职责边界应保持一致。

## Verification

验收标准：

1. 桌面端默认呈现展开侧栏，气质接近阅读产品目录而非后台菜单。
2. 桌面端折叠后仍能清楚识别当前页，并可一键恢复展开。
3. 移动端不再出现侧栏横向挤压正文的情况。
4. 键盘导航可以访问折叠按钮、导航链接和移动抽屉。
5. 当前页状态不再只依赖颜色表达。

测试覆盖：

- 集成测试：导航文案、当前页标识、按钮 `aria-label`
- 交互测试：折叠状态持久化
- E2E：移动视口下顶部栏 + 抽屉流程

## Out of Scope

- 新增二级导航层级
- 新增用户菜单或账户中心
- 深色模式
- 动态个性化导航排序
- 大范围重做正文页视觉系统

## Notes

- 本 spec 基于本轮视觉评审中确认的方向：`Editorial Navigation`
- 由于当前会话工具限制，未派发 spec review 子代理；后续以人工 spec review 作为替代检查步骤
