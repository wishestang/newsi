# Newsi Sidebar Icon Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sidebar navigation icons and collapse toggle with SVG assets from `public/`, while keeping the brand logo and sidebar behavior unchanged.

**Architecture:** Keep the current `SideNav` structure, routing, and collapse state logic. Swap Ant Design icon components for `next/image` with static asset paths from `public/`, then update integration tests to assert the expected image resources are rendered.

**Tech Stack:** Next.js App Router, React, TypeScript, next/image, Vitest, React Testing Library

---

## File Structure

- `src/components/layout/side-nav.tsx`
  - Replace Ant Design sidebar icons with `next/image`
  - Keep `SparkleIcon`, route detection, and collapse behavior intact
- `tests/integration/app-shell.test.tsx`
  - Add assertions for sidebar icon image resources

## Task 1: Add Failing Integration Assertions for Sidebar Assets

**Files:**
- Modify: `tests/integration/app-shell.test.tsx`

- [ ] **Step 1: Write the failing test**

Extend the existing integration test file with assertions similar to:

```tsx
expect(screen.getByAltText("Today icon")).toHaveAttribute(
  "src",
  expect.stringContaining("/icon-calendar.svg"),
);
expect(screen.getByAltText("History icon")).toHaveAttribute(
  "src",
  expect.stringContaining("/icon-archive.svg"),
);
expect(screen.getByAltText("Topics icon")).toHaveAttribute(
  "src",
  expect.stringContaining("/icon-topics.svg"),
);
expect(screen.getByAltText("Collapse navigation")).toHaveAttribute(
  "src",
  expect.stringContaining("/icon-panel-toggle.svg"),
);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm exec vitest run tests/integration/app-shell.test.tsx
```

Expected: FAIL because the sidebar still renders Ant Design icons instead of image assets.

- [ ] **Step 3: Write minimal implementation**

Skip for now. This task ends at the failing test.

## Task 2: Replace Sidebar Icons with Public SVG Assets

**Files:**
- Modify: `src/components/layout/side-nav.tsx`

- [ ] **Step 1: Implement the minimal change**

In `src/components/layout/side-nav.tsx`:

- remove Ant Design icon imports used for sidebar navigation and collapse controls
- import `Image` from `next/image`
- change `items` to:

```ts
const items = [
  { href: "/today", label: "Today", iconSrc: "/icon-calendar.svg" },
  { href: "/history", label: "History", iconSrc: "/icon-archive.svg" },
  { href: "/topics", label: "Topics", iconSrc: "/icon-topics.svg" },
];
```

- render each nav icon with `Image`
- keep `SparkleIcon` untouched
- render collapse / expand control with `/icon-panel-toggle.svg`
- use CSS rotation for the expanded/collapsed direction change instead of different icon files
- preserve the current `title`, `collapsed`, and active label behavior

- [ ] **Step 2: Run the focused test to verify it passes**

Run:

```bash
pnpm exec vitest run tests/integration/app-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/side-nav.tsx tests/integration/app-shell.test.tsx
git commit -m "feat: use public assets for sidebar icons"
```

## Task 3: Run Focused Regression Checks

**Files:**
- Verify only

- [ ] **Step 1: Run typecheck**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 2: Run lint**

Run:

```bash
pnpm exec eslint src/components/layout/side-nav.tsx tests/integration/app-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Run app-shell integration test again**

Run:

```bash
pnpm exec vitest run tests/integration/app-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 4: Commit any final cleanup if needed**

If no further code changes were required, skip commit. Otherwise:

```bash
git add <final touched files>
git commit -m "test: finalize sidebar icon asset replacement"
```

