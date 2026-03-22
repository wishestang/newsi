# Sidebar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the app navigation so desktop uses an editorial-style sidebar with optional collapse, while mobile uses a top bar plus drawer without squeezing the reading surface.

**Architecture:** Split the current all-in-one `SideNav` responsibility into shared navigation metadata plus separate desktop and mobile navigation surfaces. Keep desktop collapse state client-side and persistent, while mobile drawer state stays local to the mobile shell. Update `AppShell` so mobile and desktop render different layout structures instead of compressing the same sidebar across breakpoints.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, existing design tokens in `src/app/globals.css`, Vitest + React Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-03-22-sidebar-redesign-design.zh-CN.md`

---

### Task 1: Introduce shared navigation metadata and responsive shell boundaries

**Files:**
- Create: `src/components/layout/navigation-items.ts`
- Modify: `src/components/layout/app-shell.tsx`
- Modify: `tests/integration/app-shell.test.tsx`

- [ ] **Step 1: Write the failing shell tests**

Update `tests/integration/app-shell.test.tsx` so it checks for the new structural boundary instead of only text presence. Add assertions for:
- desktop navigation renders `Today`, `History`, and `Topics`
- a mobile menu button exists with an accessible name like `Open navigation`
- the main content area still renders children

Use queries shaped like:

```tsx
expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Open navigation" })).toBeInTheDocument();
expect(screen.getByRole("main")).toHaveTextContent("Body");
```

- [ ] **Step 2: Run the focused shell test to verify it fails**

Run: `pnpm exec vitest run tests/integration/app-shell.test.tsx`
Expected: FAIL because the current shell does not expose a mobile menu button or split navigation surfaces.

- [ ] **Step 3: Create the shared navigation metadata module**

Create `src/components/layout/navigation-items.ts` with one exported array and one active-state helper. Keep the shape small and reusable:

```ts
import {
  CalendarOutlined,
  InboxOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";

export const navigationItems = [
  { href: "/today", label: "Today", shortLabel: "T", Icon: CalendarOutlined },
  { href: "/history", label: "History", shortLabel: "H", Icon: InboxOutlined },
  { href: "/topics", label: "Topics", shortLabel: "P", Icon: AppstoreOutlined },
];

export function isNavigationItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
```

Do not add extra metadata that the current UI does not need.

- [ ] **Step 4: Refactor the app shell structure**

Update `src/components/layout/app-shell.tsx` so it:
- renders a mobile top bar area above `main` for small screens
- renders a desktop rail alongside `main` for `md` and up
- keeps `main` as the only growing region with `min-w-0`
- uses `flex-col md:flex-row` rather than a single row layout at all breakpoints

Shape the shell roughly like:

```tsx
<div className="min-h-screen bg-background text-foreground">
  <div className="mx-auto min-h-screen max-w-[1600px] bg-surface md:flex">
    <div className="md:hidden">
      <MobileTopBar />
    </div>
    <div className="hidden shrink-0 border-r border-nav-rail-border md:block">
      <DesktopSideNav />
    </div>
    <main className="min-w-0 flex-1">{children}</main>
  </div>
</div>
```

It is fine for `MobileTopBar` and `DesktopSideNav` to be temporary stubs in this step if they return minimal markup.

- [ ] **Step 5: Re-run the focused shell test**

Run: `pnpm exec vitest run tests/integration/app-shell.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/navigation-items.ts src/components/layout/app-shell.tsx tests/integration/app-shell.test.tsx
git commit -m "refactor: split app shell navigation surfaces"
```

---

### Task 2: Build the desktop editorial sidebar with persistent collapse state

**Files:**
- Modify: `src/components/layout/side-nav.tsx`
- Modify: `tests/integration/app-shell.test.tsx`
- Create: `tests/integration/side-nav.test.tsx`

- [ ] **Step 1: Write the failing desktop navigation tests**

Create `tests/integration/side-nav.test.tsx` covering:
- active item gets `aria-current="page"`
- collapse toggle has accessible names for both states
- collapsed state still shows a current-item marker and not just an unlabeled icon
- saved collapse preference is read from `localStorage`

Use test structure like:

```tsx
it("marks the current route with aria-current", () => {
  render(<SideNav />);
  expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
});

it("restores collapsed state from localStorage", () => {
  window.localStorage.setItem("newsi.sidebar.collapsed", "true");
  render(<SideNav />);
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused desktop navigation tests to verify they fail**

Run: `pnpm exec vitest run tests/integration/side-nav.test.tsx tests/integration/app-shell.test.tsx`
Expected: FAIL because the current component has no `aria-current`, no accessible toggle labels, and no persisted state.

- [ ] **Step 3: Rebuild `src/components/layout/side-nav.tsx` around editorial navigation primitives**

Keep the file focused on desktop responsibilities only. Implement:
- `navigationItems` import from the new shared module
- a small brand row
- a collapse toggle button with `aria-label="Collapse sidebar"` / `aria-label="Expand sidebar"`
- full-row link containers with active pill styling
- `aria-current="page"` on the active link

Use a client component with a stable persistence key:

```tsx
const STORAGE_KEY = "newsi.sidebar.collapsed";

useEffect(() => {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "true") setCollapsed(true);
}, []);

function handleToggle() {
  setCollapsed((current) => {
    const next = !current;
    window.localStorage.setItem(STORAGE_KEY, String(next));
    return next;
  });
}
```

Expanded link shape should look like:

```tsx
<Link
  aria-current={isActive ? "page" : undefined}
  className={cn(
    "group flex items-center gap-3 rounded-[10px] px-3 py-2.5 transition-[background-color,color,border-color]",
    isActive
      ? "bg-nav-active text-nav-active-foreground"
      : "text-nav-foreground hover:bg-nav-hover hover:text-foreground",
  )}
>
  <span className={cn("h-2 w-2 rounded-full", isActive ? "bg-accent" : "bg-nav-marker")} />
  <span className={cn("font-mono text-[11px] uppercase tracking-[0.18em]", isActive && "font-bold")}>
    {item.label}
  </span>
</Link>
```

Collapsed state should still render:
- one visible brand marker
- one current-item marker container
- the expand button

Do not rely on `title` alone as the comprehension path.

- [ ] **Step 4: Keep transitions explicit and reduced-motion-safe**

Replace `transition-all` with a narrow property list. Add motion classes shaped like:

```tsx
className="transition-[width,padding,background-color,color] duration-200 motion-reduce:transition-none"
```

- [ ] **Step 5: Re-run the desktop navigation tests**

Run: `pnpm exec vitest run tests/integration/side-nav.test.tsx tests/integration/app-shell.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/side-nav.tsx tests/integration/side-nav.test.tsx tests/integration/app-shell.test.tsx
git commit -m "feat: add editorial desktop sidebar"
```

---

### Task 3: Add the mobile top bar and drawer navigation

**Files:**
- Create: `src/components/layout/mobile-top-bar.tsx`
- Create: `src/components/layout/mobile-nav-drawer.tsx`
- Modify: `src/components/layout/app-shell.tsx`
- Create: `tests/integration/mobile-navigation.test.tsx`

- [ ] **Step 1: Write the failing mobile navigation tests**

Create `tests/integration/mobile-navigation.test.tsx` covering:
- top bar renders brand plus current page label
- menu button opens the drawer
- drawer exposes `Today`, `History`, and `Topics`
- current route is still marked with `aria-current="page"`
- close button closes the drawer

Use interaction patterns like:

```tsx
await user.click(screen.getByRole("button", { name: "Open navigation" }));
expect(screen.getByRole("dialog", { name: "Navigation" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
await user.click(screen.getByRole("button", { name: "Close navigation" }));
expect(screen.queryByRole("dialog", { name: "Navigation" })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused mobile navigation tests to verify they fail**

Run: `pnpm exec vitest run tests/integration/mobile-navigation.test.tsx`
Expected: FAIL because the mobile top bar and drawer components do not exist yet.

- [ ] **Step 3: Create the mobile top bar**

Implement `src/components/layout/mobile-top-bar.tsx` as a client component that receives:

```ts
type MobileTopBarProps = {
  defaultLabel?: string;
};
```

Render:
- brand name `Newsi`
- current section label derived from `usePathname()` plus `navigationItems`
- menu button with `aria-label="Open navigation"`
- internal `open` state for `MobileNavDrawer`

Keep the surface compact and aligned with the rail tone:

```tsx
<header className="flex items-center justify-between border-b border-nav-rail-border bg-nav-rail px-4 py-3 md:hidden">
  <div className="font-heading text-lg font-bold">Newsi</div>
  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-nav-foreground">{currentLabel}</div>
  <button type="button" aria-label="Open navigation" ... />
</header>
```

- [ ] **Step 4: Create the mobile drawer**

Implement `src/components/layout/mobile-nav-drawer.tsx` as a client component with props:

```ts
type MobileNavDrawerProps = {
  open: boolean;
  pathname: string;
  onClose: () => void;
};
```

Render a drawer dialog only when open:

```tsx
<div className="fixed inset-0 z-50 md:hidden">
  <button className="absolute inset-0 bg-black/20" aria-label="Close navigation" onClick={onClose} />
  <div
    role="dialog"
    aria-label="Navigation"
    className="relative h-full w-[280px] max-w-[85vw] bg-nav-rail px-4 py-5 shadow-xl"
  >
```

Inside the drawer, reuse `navigationItems` and `isNavigationItemActive()` so desktop and mobile cannot drift apart.

- [ ] **Step 5: Wire the mobile top bar into `AppShell`**

Update `src/components/layout/app-shell.tsx` so it:
- stays a server component
- renders `<MobileTopBar />` only for small screens
- renders the desktop sidebar only for `md` and up

Keep drawer state and pathname lookup strictly inside `MobileTopBar`. Do not merge them with desktop collapse state.

- [ ] **Step 6: Re-run the focused mobile navigation tests**

Run: `pnpm exec vitest run tests/integration/mobile-navigation.test.tsx tests/integration/app-shell.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/mobile-top-bar.tsx src/components/layout/mobile-nav-drawer.tsx src/components/layout/app-shell.tsx tests/integration/mobile-navigation.test.tsx tests/integration/app-shell.test.tsx
git commit -m "feat: add mobile navigation drawer"
```

---

### Task 4: Add navigation-specific tokens and verify responsive behavior end to end

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tests/e2e/newsi-smoke.spec.ts`
- Modify: `tests/integration/side-nav.test.tsx`
- Modify: `tests/integration/mobile-navigation.test.tsx`

- [ ] **Step 1: Write the failing style-sensitive assertions**

Extend the integration tests so they verify class-level semantics rather than snapshots:
- active desktop item carries the active background/text classes
- inactive desktop item carries hoverable foreground classes
- mobile drawer current item uses the same `aria-current="page"` path

Use assertions like:

```tsx
expect(screen.getByRole("link", { name: "Today" }).className).toMatch(/bg-nav-active/);
expect(screen.getByRole("link", { name: "History" }).className).toMatch(/hover:bg-nav-hover/);
```

- [ ] **Step 2: Run the targeted integration tests to verify they fail**

Run:
- `pnpm exec vitest run tests/integration/side-nav.test.tsx tests/integration/mobile-navigation.test.tsx`

Expected: FAIL because the new token-backed class names do not exist yet.

- [ ] **Step 3: Add navigation-specific tokens to `src/app/globals.css`**

Extend `:root` and `@theme inline` with a small token set:

```css
:root {
  --nav-rail: #f3f1ec;
  --nav-rail-border: #e5e4e2;
  --nav-foreground: #5f5e5b;
  --nav-marker: #c8c4bb;
  --nav-hover: rgba(26, 26, 26, 0.04);
  --nav-active: #ffffff;
  --nav-active-foreground: #1a1a1a;
  --focus-ring: rgba(234, 89, 72, 0.35);
}

@theme inline {
  --color-nav-rail: var(--nav-rail);
  --color-nav-rail-border: var(--nav-rail-border);
  --color-nav-foreground: var(--nav-foreground);
  --color-nav-marker: var(--nav-marker);
  --color-nav-hover: var(--nav-hover);
  --color-nav-active: var(--nav-active);
  --color-nav-active-foreground: var(--nav-active-foreground);
  --color-focus-ring: var(--focus-ring);
}
```

Do not remove the existing global tokens.

- [ ] **Step 4: Apply the new tokens to desktop and mobile navigation**

Update the navigation components so:
- desktop rail background uses `bg-nav-rail`
- divider uses `border-nav-rail-border`
- inactive items use `text-nav-foreground`
- active items use `bg-nav-active text-nav-active-foreground`
- focus treatment uses a visible ring such as `focus-visible:ring-2 focus-visible:ring-focus-ring`

- [ ] **Step 5: Add a mobile e2e path to `tests/e2e/newsi-smoke.spec.ts`**

Add a second test or sub-step using a mobile viewport:

```ts
test("mobile navigation uses a drawer instead of squeezing the sidebar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Today" })).toBeVisible();
});
```

If the existing smoke flow already reaches `/today` in preview mode, reuse that path rather than introducing a second setup flow.

- [ ] **Step 6: Run the full verification set**

Run:
- `pnpm exec vitest run tests/integration/app-shell.test.tsx tests/integration/side-nav.test.tsx tests/integration/mobile-navigation.test.tsx`
- `pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts`

Expected: PASS

- [ ] **Step 7: Run final project checks**

Run:
- `pnpm exec eslint src/components/layout src/app/globals.css tests/integration/app-shell.test.tsx tests/integration/side-nav.test.tsx tests/integration/mobile-navigation.test.tsx tests/e2e/newsi-smoke.spec.ts`
- `pnpm exec tsc --noEmit`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/app/globals.css src/components/layout tests/integration/side-nav.test.tsx tests/integration/mobile-navigation.test.tsx tests/e2e/newsi-smoke.spec.ts
git commit -m "feat: redesign app navigation shell"
```

---

## Manual Review Notes

- Before touching Next.js layout code, read the relevant guide under `node_modules/next/dist/docs/` for the APIs used by this change.
- Because this session cannot dispatch plan-review subagents under the current tool policy, replace the plan reviewer loop with a manual review against the spec before implementation starts.
