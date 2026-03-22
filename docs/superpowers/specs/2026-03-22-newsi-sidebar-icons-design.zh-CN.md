# Newsi 侧边栏图标资源替换设计

日期：2026-03-22

## 背景

当前侧边栏在 [src/components/layout/side-nav.tsx](/Users/bytedance/Documents/newsi/src/components/layout/side-nav.tsx) 中混用了：

- 自定义品牌 `SparkleIcon`
- `@ant-design/icons` 的导航图标与折叠按钮图标

本次需求是：

- 品牌 logo 保持不变
- 将侧边栏三个导航图标改为 `public/` 目录中的图片资源
- 将折叠按钮也改为 `public/` 目录中的图片资源

## 目标

- `Today / History / Topics` 三个导航入口全部使用 `public/` 下的 SVG 图标
- 侧边栏折叠按钮使用 `public/icon-panel-toggle.svg`
- 品牌 logo 继续保留现有 `SparkleIcon`
- 不改变现有导航结构、折叠逻辑与 active 路由判断

## 非目标

- 不重做侧边栏整体布局
- 不重做品牌 logo
- 不引入新的图标库
- 不在本次中做全站图标系统抽象

## 方案

采用“最小替换”的资源接入方案：

- 保留 [src/components/layout/side-nav.tsx](/Users/bytedance/Documents/newsi/src/components/layout/side-nav.tsx) 的结构和交互逻辑
- 用 `next/image` 渲染 `public/` 中已有的 SVG
- 只替换以下映射：
  - `Today -> /icon-calendar.svg`
  - `History -> /icon-archive.svg`
  - `Topics -> /icon-topics.svg`
  - `toggle -> /icon-panel-toggle.svg`

这样可以避免对现有 active/collapsed 行为做额外重构。

## 交互与视觉细节

### 1. 品牌区

- `SparkleIcon` 保持不变
- `Newsi` 文案保持不变
- 品牌区不引入 `public/` 新图标

### 2. 导航图标

- 每个导航项不再使用 Ant Design icon 组件
- 改为 `next/image`
- 图标尺寸建议统一为小尺寸固定值，例如 `14-16px`
- active 态与非 active 态继续通过容器 class 控制

建议处理方式：

- active：`opacity-100`
- inactive：`opacity-60`

这样不依赖 SVG 内部是否支持 `currentColor`

### 3. 折叠按钮

- 使用 `public/icon-panel-toggle.svg`
- 展开态和收起态共享同一资源
- 通过容器 `rotate-180` 或 `-scale-x-100` 控制方向变化

这样可以避免维护两份不同方向的资源。

### 4. collapsed 态

- 继续保留当前 `title={item.label}` 行为
- 图标位置保持居中
- 不改变折叠后的宽度与间距逻辑

## 技术影响面

### 修改文件

- [src/components/layout/side-nav.tsx](/Users/bytedance/Documents/newsi/src/components/layout/side-nav.tsx)
  - 移除 `@ant-design/icons` 的导航与折叠图标引用
  - 引入 `next/image`
  - 建立 `href / label / iconSrc` 映射

### 测试文件

- [tests/integration/app-shell.test.tsx](/Users/bytedance/Documents/newsi/tests/integration/app-shell.test.tsx)
  - 保留已有品牌名与导航文案断言
  - 新增图标资源渲染断言，例如检查 `img` 的 `src` 或 `alt`

## 测试策略

### 集成测试

- `AppShell` 渲染后，仍能看到：
  - `Newsi`
  - `Today`
  - `History`
  - `Topics`
- 同时可以断言：
  - `Today` 图标使用 `/icon-calendar.svg`
  - `History` 图标使用 `/icon-archive.svg`
  - `Topics` 图标使用 `/icon-topics.svg`
  - toggle 图标使用 `/icon-panel-toggle.svg`

### 手动验证

- 默认展开态图标显示正常
- 点击折叠按钮后侧边栏收起
- 再次点击后可展开
- active 路由下的图标与文案仍能区分

## 风险

### 风险 1：SVG 本身颜色不可通过 CSS 直接改写

因此本次不依赖 `currentColor`，而是通过整体 `opacity` 和布局状态区分 active/inactive。

### 风险 2：`next/image` 对 SVG 的渲染语义与内联 SVG 不同

这次不追求复杂动画或颜色注入，只做静态资源替换，因此风险可接受。

## 验收标准

- 侧边栏三个导航图标全部改为 `public/` 中的 SVG
- 侧边栏折叠按钮改为 `public/icon-panel-toggle.svg`
- 品牌 logo 保持现状
- 折叠与展开行为不变
- 集成测试通过

