# Sign-In Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `/signin` page from a bare dark screen to a warm-white, editorial-style landing with product value preview.

**Architecture:** Two files change — the page component gets a full rewrite (left-right layout with brand/headline/login + digest preview card), and the Google sign-in button component gets restyled (white bg, border, Google color logo SVG). No new files. Existing tests updated to match new copy.

**Tech Stack:** Next.js (App Router), React, Tailwind CSS 4, existing design tokens (`--background`, `--foreground`, `--text-muted`, `--accent`, `--border-solid`), existing font variables (`--font-heading`, `--font-sans`, `--font-mono`).

**Spec:** `docs/superpowers/specs/2026-03-22-signin-redesign-design.md`

---

### Task 1: Restyle GoogleSignInButton Component

**Files:**
- Modify: `src/components/auth/google-sign-in-button.tsx`
- Test: `tests/integration/signin-page.test.tsx` (existing, button text unchanged — "Continue with Google")

- [ ] **Step 1: Update the button styling and add Google SVG logo**

Replace the entire content of `src/components/auth/google-sign-in-button.tsx`:

```tsx
"use client";

import { signIn } from "next-auth/react";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function GoogleSignInButton() {
  return (
    <button
      className="inline-flex items-center gap-3 rounded-lg border border-border-solid bg-white px-6 py-3 text-sm font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_2px_4px_rgba(0,0,0,0.08)] md:w-auto w-full justify-center"
      onClick={() => signIn("google", { callbackUrl: "/today" })}
      type="button"
    >
      <GoogleLogo />
      Continue with Google
    </button>
  );
}
```

- [ ] **Step 2: Run existing tests to verify button still renders correctly**

Run: `npx vitest run tests/integration/signin-page.test.tsx`
Expected: All 4 tests pass (button text "Continue with Google" unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/google-sign-in-button.tsx
git commit -m "feat(signin): restyle Google sign-in button with logo and new styling"
```

---

### Task 2: Rewrite Sign-In Page Layout

**Files:**
- Modify: `src/app/signin/page.tsx`

- [ ] **Step 1: Rewrite the sign-in page**

Replace the entire content of `src/app/signin/page.tsx`:

```tsx
import Image from "next/image";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { isAuthConfigured, isLocalPreviewMode } from "@/lib/env";

function DigestPreviewCard() {
  const now = new Date();
  const dateStr = now
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    .toUpperCase();

  return (
    <div className="hidden md:block flex-shrink-0 w-[340px]">
      <div className="rounded-[10px] bg-white px-8 py-9 shadow-[0_2px_12px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)]">
        {/* Date header */}
        <div className="mb-6 flex items-center gap-3">
          <span className="whitespace-nowrap font-mono text-[10px] font-bold uppercase tracking-[2.2px] text-text-muted">
            {dateStr}
          </span>
          <div className="h-px flex-1 bg-border-solid" />
        </div>

        {/* Title */}
        <h2 className="mb-3 font-heading text-[22px] font-bold leading-[1.2] tracking-[-0.6px] text-foreground">
          AI Agents Reshape Developer Workflows
        </h2>

        {/* Intro */}
        <p className="mb-6 font-sans text-[13px] leading-[1.75] text-text-body">
          The latest wave of AI coding tools moves beyond autocomplete into
          autonomous task execution, changing how developers plan, write, and
          review code.
        </p>

        {/* Section heading */}
        <h3 className="mb-3.5 font-heading text-[15px] font-bold tracking-[-0.2px] text-foreground">
          Key Points
        </h3>

        {/* Key points */}
        <div className="mb-6 flex flex-col gap-2.5">
          {[
            {
              keyword: "Claude Code",
              text: "ships multi-file editing with context-aware refactoring",
            },
            {
              keyword: "Cursor",
              text: "raises Series C at $2.5B valuation, plans enterprise push",
            },
            {
              keyword: "GitHub",
              text: "reports 40% of new code now AI-assisted across its platform",
            },
          ].map((item) => (
            <div key={item.keyword} className="flex items-start gap-2.5">
              <div className="mt-[6px] h-1.5 w-1.5 flex-shrink-0 bg-accent" />
              <p className="font-sans text-[13px] leading-[1.65] text-text-body">
                <span className="font-semibold text-foreground">
                  {item.keyword}
                </span>{" "}
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 border-t border-border-solid pt-4">
          <Image
            src="/icon-sparkle.svg"
            alt=""
            width={12}
            height={12}
            className="[--fill-0:var(--accent)]"
            aria-hidden="true"
          />
          <span className="font-mono text-[9px] font-bold uppercase tracking-[2.2px] text-text-muted">
            End of Digest
          </span>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  const authConfigured = isAuthConfigured() && !isLocalPreviewMode();

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-7 py-12 md:px-12">
      <div className="flex w-full max-w-[960px] flex-col items-start gap-16 md:flex-row md:items-center">
        {/* Left column */}
        <div className="flex-1">
          {/* Brand mark */}
          <div className="mb-12 flex items-center gap-2.5">
            <Image
              src="/icon-sparkle.svg"
              alt=""
              width={22}
              height={22}
              aria-hidden="true"
            />
            <span className="font-heading text-xl font-bold tracking-[-0.5px] text-foreground">
              Newsi
            </span>
          </div>

          {/* Headline */}
          <h1 className="mb-4 font-heading text-[32px] font-bold leading-[1.08] tracking-[-1.2px] text-foreground md:text-[38px]">
            Your daily
            <br className="hidden md:inline" /> knowledge synthesis
          </h1>

          {/* Subline */}
          <p className="mb-10 font-sans text-[15px] leading-[1.65] text-text-muted md:text-base">
            One brief, one digest, every day.
            <br />
            Cut through the noise, focus on what matters.
          </p>

          {/* Auth actions */}
          {authConfigured ? <GoogleSignInButton /> : null}
          {!authConfigured ? (
            <div className="md:text-left text-center">
              <p className="text-sm text-text-muted">
                Auth is not configured in this environment.
              </p>
              <Link
                href="/today"
                className="mt-4 inline-block font-mono text-xs tracking-[0.5px] text-text-muted hover:underline"
              >
                or explore a preview →
              </Link>
            </div>
          ) : null}
        </div>

        {/* Right column — digest preview card */}
        <DigestPreviewCard />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run existing tests**

Run: `npx vitest run tests/integration/signin-page.test.tsx`
Expected: Tests for "Open preview" link will fail because the link text changed to "or explore a preview →".

- [ ] **Step 3: Update tests to match new copy**

Update `tests/integration/signin-page.test.tsx` — change link queries from `"Open preview"` to match the new text:

```tsx
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("SignInPage", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.FORCE_LOCAL_PREVIEW;
  });

  it("shows a preview entry when auth is not configured", async () => {
    const { default: SignInPage } = await import("@/app/signin/page");

    render(<SignInPage />);

    expect(
      screen.getByRole("link", { name: /explore a preview/ }),
    ).toBeInTheDocument();
  });

  it("hides the preview entry when auth is configured", async () => {
    process.env.DATABASE_URL = "postgres://localhost/newsi";
    process.env.AUTH_SECRET = "secret";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";

    const { default: SignInPage } = await import("@/app/signin/page");

    render(<SignInPage />);

    expect(
      screen.queryByRole("link", { name: /explore a preview/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  it("hides the google login button when auth is not configured", async () => {
    const { default: SignInPage } = await import("@/app/signin/page");

    render(<SignInPage />);

    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
  });

  it("shows the preview entry when local preview mode is forced", async () => {
    process.env.DATABASE_URL = "postgres://localhost/newsi";
    process.env.AUTH_SECRET = "secret";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.FORCE_LOCAL_PREVIEW = "1";

    const { default: SignInPage } = await import("@/app/signin/page");

    render(<SignInPage />);

    expect(
      screen.getByRole("link", { name: /explore a preview/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run all tests to verify everything passes**

Run: `npx vitest run tests/integration/signin-page.test.tsx`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/signin/page.tsx tests/integration/signin-page.test.tsx
git commit -m "feat(signin): redesign page with left-right layout and digest preview card"
```

---

### Task 3: Visual Verification

**Files:** None (manual check)

- [ ] **Step 1: Start dev server and verify desktop layout**

Run: `npx next dev`
Open `http://localhost:3000/signin` in browser.
Verify: Warm white background, left column with brand/headline/subline/button, right column with digest preview card.

- [ ] **Step 2: Verify mobile layout**

Resize browser to < 768px width.
Verify: Single column, digest card hidden, headline smaller (32px), button full width.

- [ ] **Step 3: Verify auth-configured vs preview mode**

Set `FORCE_LOCAL_PREVIEW=1` and restart.
Verify: "or explore a preview →" link visible, no Google button.
Unset and set full auth env vars.
Verify: Google button visible, no preview link.
