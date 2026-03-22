# Sidebar Account Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current sidebar footer user menu with a bottom-anchored account summary bar and an upward-opening lightweight account panel that shows avatar, name, email, and `Sign Out`.

**Architecture:** Keep the change isolated to the sidebar shell. Split the existing footer user block into a persistent `UserSummaryBar` and a shared `UserAccountPopover`, both rendered from `SideNav` so the rest of the app shell, auth flow, and route structure stay untouched. Use test-first updates to lock expanded/collapsed layout, popover content, and sign-out behavior before refactoring the current footer code.

**Tech Stack:** Next.js App Router, React 19 client components, NextAuth `signOut`, `next/image`, Vitest + Testing Library, ESLint.

---

## File Map

**Modify**
- `src/components/layout/side-nav.tsx`
  - Extract the current footer user area into smaller internal units.
  - Keep `collapsed` state in `SideNav`.
  - Add dedicated account popover open/close state.
- `tests/integration/app-shell.test.tsx`
  - Extend coverage for expanded/collapsed footer rendering and popover behavior.

**Optional split if `side-nav.tsx` gets too large**
- `src/components/layout/user-summary-bar.tsx`
  - Bottom-anchored summary row for expanded and collapsed states.
- `src/components/layout/user-account-popover.tsx`
  - Popover content with avatar, name, email, and `Sign Out`.

Keep the split optional. If the refactor is still readable inside `side-nav.tsx`, do not add files just for ceremony.

### Task 1: Lock Footer Account Behavior With Tests

**Files:**
- Modify: `tests/integration/app-shell.test.tsx`
- Reference: `src/components/layout/side-nav.tsx`

- [ ] **Step 1: Write the failing tests for the expanded footer summary**

Add assertions that when `AppShell` receives a user:

```tsx
render(
  <AppShell
    user={{ name: "Ada Lovelace", email: "ada@example.com", image: null }}
  >
    <div>Body</div>
  </AppShell>,
);

expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
expect(screen.getByText("ada@example.com")).toBeInTheDocument();
```

Also assert the footer container remains present at the end of the sidebar.

- [ ] **Step 2: Run the focused test file and confirm failure**

Run:

```bash
pnpm exec vitest run tests/integration/app-shell.test.tsx
```

Expected: FAIL because the current footer only exposes the old clickable avatar/menu structure and does not match the new summary bar expectations.

- [ ] **Step 3: Write the failing tests for collapsed and popover states**

Add tests that:
- collapse the sidebar,
- assert only the avatar trigger remains visible in the footer,
- click the footer trigger,
- assert the popover contains:
  - avatar
  - display name
  - email
  - `Sign Out`

Use a user fixture such as:

```tsx
const user = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  image: null,
};
```

- [ ] **Step 4: Run the focused test file and confirm failure again**

Run:

```bash
pnpm exec vitest run tests/integration/app-shell.test.tsx
```

Expected: FAIL on missing popover structure and/or incorrect collapsed footer behavior.

- [ ] **Step 5: Commit the failing-test checkpoint**

```bash
git add tests/integration/app-shell.test.tsx
git commit -m "test: define sidebar account panel behavior"
```

### Task 2: Refactor Sidebar Footer Into Summary Bar + Popover

**Files:**
- Modify: `src/components/layout/side-nav.tsx`
- Test: `tests/integration/app-shell.test.tsx`

- [ ] **Step 1: Add a dedicated footer summary component shape**

Inside `side-nav.tsx`, introduce a focused summary renderer:

```tsx
function UserSummaryBar({
  user,
  collapsed,
  onClick,
}: {
  user: SideNavUser;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}>
      {/* avatar only when collapsed */}
      {/* avatar + name + email when expanded */}
    </button>
  );
}
```

Keep the footer slot always mounted with `mt-auto`.

- [ ] **Step 2: Add a focused account popover component**

Implement a popover renderer with one clear responsibility:

```tsx
function UserAccountPopover({
  user,
  collapsed,
  onSignOut,
}: {
  user: SideNavUser;
  collapsed: boolean;
  onSignOut: () => void;
}) {
  return (
    <div role="dialog">
      {/* avatar */}
      {/* name */}
      {/* email */}
      {/* divider */}
      {/* Sign Out */}
    </div>
  );
}
```

Anchor it above the footer trigger in both expanded and collapsed states.

- [ ] **Step 3: Replace the current `UserAvatar`-driven footer interaction**

Remove the old inline footer menu behavior and wire `SideNav` to:
- track `accountPopoverOpen`,
- toggle it from the bottom summary bar,
- close on outside click,
- keep `collapsed` independent from account popover state.

Use the existing `signOut({ callbackUrl: "/signin" })` path as the popover’s sole action.

- [ ] **Step 4: Preserve fallback rendering for partial user data**

Implement these fallbacks:

```tsx
const primaryLabel = user.name ?? user.email ?? "Account";
const secondaryLabel = user.name && user.email ? user.email : null;
```

If `image` is missing, keep the initials avatar path.

- [ ] **Step 5: Run the focused sidebar tests and make them pass**

Run:

```bash
pnpm exec vitest run tests/integration/app-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the sidebar refactor**

```bash
git add src/components/layout/side-nav.tsx tests/integration/app-shell.test.tsx
git commit -m "feat: add sidebar account summary panel"
```

### Task 3: Polish Layout, Interaction, and Visual Boundaries

**Files:**
- Modify: `src/components/layout/side-nav.tsx`
- Reference: `src/components/layout/app-shell.tsx`
- Test: `tests/integration/app-shell.test.tsx`

- [ ] **Step 1: Tune expanded footer spacing and hierarchy**

Make the expanded footer read as a summary bar, not a generic menu row:

```tsx
className="mt-auto rounded-xl px-2 py-2 text-left"
```

Apply subdued styling:
- avatar on the left,
- name in foreground,
- email in muted text,
- no heavy shadow on the summary bar itself.

- [ ] **Step 2: Tune collapsed footer alignment**

Ensure the collapsed footer trigger visually aligns with the 60px rail:

```tsx
className="mt-auto flex w-full justify-center"
```

Popover should still open upward and remain centered relative to the avatar trigger.

- [ ] **Step 3: Verify click-outside and repeated toggle behavior**

Make sure these interactions work:
- click trigger -> opens
- click trigger again -> closes
- click outside -> closes
- collapse/expand while closed does not reopen it

- [ ] **Step 4: Re-run integration tests after polish**

Run:

```bash
pnpm exec vitest run tests/integration/app-shell.test.tsx
```

Expected: PASS with the same behavioral assertions after the layout polish.

- [ ] **Step 5: Commit the polish pass**

```bash
git add src/components/layout/side-nav.tsx tests/integration/app-shell.test.tsx
git commit -m "style: polish sidebar account footer"
```

### Task 4: Full Verification

**Files:**
- Verify only

- [ ] **Step 1: Run focused linting for touched files**

Run:

```bash
pnpm exec eslint src/components/layout/side-nav.tsx tests/integration/app-shell.test.tsx
```

Expected: PASS or only the pre-existing `@next/next/no-img-element` warning if the user avatar still uses a raw `<img>`.

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Run the existing smoke e2e**

Run:

```bash
pnpm exec playwright test tests/e2e/newsi-smoke.spec.ts
```

Expected: PASS with no regression to sidebar navigation.

- [ ] **Step 4: Manual browser verification**

Check these cases in the browser:
- signed-in expanded sidebar shows avatar, name, email at bottom
- signed-in collapsed sidebar shows only avatar at bottom
- clicking either footer trigger opens an upward popover
- popover contains account info plus only `Sign Out`
- `Today / History / Topics` still navigate correctly

- [ ] **Step 5: Commit the verified final state**

```bash
git add src/components/layout/side-nav.tsx tests/integration/app-shell.test.tsx
git commit -m "test: verify sidebar account panel flow"
```
