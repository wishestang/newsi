# Digest Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to share their digests via permanent public links that anyone can view without authentication.

**Architecture:** Add a `shareSlug` column to `DailyDigest`, a `POST /api/digests/share` endpoint to create/retrieve share links, and a public `/public/[slug]` page that renders shared digests. A new `ShareButton` client component handles the copy-to-clipboard interaction.

**Tech Stack:** Next.js 16 App Router, Prisma 7.5, PostgreSQL, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-28-digest-sharing-design.md`

---

### Task 1: Database Migration — Add shareSlug to DailyDigest

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_share_slug/migration.sql`

- [ ] **Step 1: Add shareSlug field to Prisma schema**

In `prisma/schema.prisma`, add `shareSlug` to the `DailyDigest` model, after the `failureReason` field:

```prisma
  shareSlug     String?   @unique
```

- [ ] **Step 2: Generate and apply the migration**

Run: `pnpm db:generate && pnpm db:migrate:dev --name add_share_slug`

This will create the migration SQL and apply it to the local database. The migration should add a nullable `shareSlug` column with a unique constraint.

- [ ] **Step 3: Verify the migration**

Run: `pnpm db:generate`

Expected: Prisma client generates successfully with no errors.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add shareSlug column to DailyDigest"
```

---

### Task 2: Service Layer — Share Digest Function

**Files:**
- Modify: `src/lib/digest/service.ts`
- Create: `tests/unit/share-digest-service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/share-digest-service.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    dailyDigest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

import { shareDigest, getSharedDigest } from "@/lib/digest/service";

describe("shareDigest", () => {
  it("returns existing shareUrl if shareSlug is already set", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue({
      userId: "user1",
      digestDayKey: "2026-03-28",
      status: "ready",
      shareSlug: "existing-slug",
    });

    const result = await shareDigest("user1", "2026-03-28");

    expect(result).toBe("http://localhost:3000/public/existing-slug");
    expect(dbMock.dailyDigest.update).not.toHaveBeenCalled();
  });

  it("generates a new slug and returns the shareUrl", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue({
      userId: "user1",
      digestDayKey: "2026-03-28",
      status: "ready",
      shareSlug: null,
    });
    dbMock.dailyDigest.update.mockResolvedValue({});

    const result = await shareDigest("user1", "2026-03-28");

    expect(result).toMatch(/^http:\/\/localhost:3000\/public\/[a-z0-9]+$/);
    expect(dbMock.dailyDigest.update).toHaveBeenCalledOnce();
  });

  it("throws if digest not found", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue(null);

    await expect(shareDigest("user1", "2026-03-28")).rejects.toThrow(
      "Digest not found.",
    );
  });
});

describe("getSharedDigest", () => {
  it("returns the digest if found with ready status", async () => {
    const digestData = {
      id: "digest1",
      userId: "user1",
      digestDayKey: "2026-03-28",
      status: "ready" as const,
      title: "Today's Synthesis",
      intro: "Intro text",
      contentJson: {
        title: "Today's Synthesis",
        intro: "Intro text",
        readingTime: 5,
        topics: [{ topic: "AI", markdown: "Content" }],
      },
      readingTime: 5,
      shareSlug: "abc123",
    };
    dbMock.dailyDigest.findUnique.mockResolvedValue(digestData);

    const result = await getSharedDigest("abc123");

    expect(result).not.toBeNull();
    expect(result!.digest.title).toBe("Today's Synthesis");
    expect(result!.content).not.toBeNull();
  });

  it("returns null if slug not found", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue(null);

    const result = await getSharedDigest("nonexistent");

    expect(result).toBeNull();
  });

  it("returns null if digest status is not ready", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue({
      id: "digest1",
      userId: "user1",
      digestDayKey: "2026-03-28",
      status: "generating",
      shareSlug: "abc123",
    });

    const result = await getSharedDigest("abc123");

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/unit/share-digest-service.test.ts`

Expected: FAIL — `shareDigest` and `getSharedDigest` are not exported from service.

- [ ] **Step 3: Implement the service functions**

Add to `src/lib/digest/service.ts`:

```ts
export async function shareDigest(
  userId: string,
  digestDayKey: string,
): Promise<string> {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const digest = await db.dailyDigest.findUnique({
    where: { userId_digestDayKey: { userId, digestDayKey } },
    select: { shareSlug: true },
  });

  if (!digest) {
    throw new Error("Digest not found.");
  }

  if (digest.shareSlug) {
    return `${process.env.APP_URL || "http://localhost:3000"}/public/${digest.shareSlug}`;
  }

  const slug = crypto.randomUUID().replace(/-/g, "").slice(0, 21);

  await db.dailyDigest.update({
    where: { userId_digestDayKey: { userId, digestDayKey } },
    data: { shareSlug: slug },
  });

  return `${process.env.APP_URL || "http://localhost:3000"}/public/${slug}`;
}

export async function getSharedDigest(
  slug: string,
): Promise<StoredDigest | null> {
  if (!db) {
    throw new Error("Persistence is not configured.");
  }

  const digest = await db.dailyDigest.findUnique({
    where: { shareSlug: slug },
  });

  if (!digest || digest.status !== "ready") {
    return null;
  }

  return {
    digest,
    content: parseStoredDigestContent(digest.contentJson),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/unit/share-digest-service.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/digest/service.ts tests/unit/share-digest-service.test.ts
git commit -m "feat: add shareDigest and getSharedDigest service functions"
```

---

### Task 3: Share API Endpoint

**Files:**
- Create: `src/app/api/digests/share/route.ts`

- [ ] **Step 1: Create the share API route**

Create `src/app/api/digests/share/route.ts`:

```ts
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { shareDigest } from "@/lib/digest/service";

export async function POST(request: Request) {
  if (!db) {
    return NextResponse.json(
      { ok: false, error: "Persistence is not configured." },
      { status: 500 },
    );
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { digestDayKey } = await request.json();

  if (!digestDayKey || typeof digestDayKey !== "string") {
    return NextResponse.json(
      { ok: false, error: "digestDayKey is required." },
      { status: 400 },
    );
  }

  try {
    const shareUrl = await shareDigest(user.id, digestDayKey);
    return NextResponse.json({ ok: true, shareUrl });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Share failed.";
    const status = message === "Digest not found." ? 404 : 400;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
```

This follows the exact same pattern as `src/app/api/digests/retry/route.ts` — db guard, session auth, user lookup, input validation, service call, `{ ok: boolean }` response envelope.

- [ ] **Step 2: Verify the route compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "share/route" || echo "No errors in share route"`

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/digests/share/route.ts
git commit -m "feat: add POST /api/digests/share endpoint"
```

---

### Task 4: ShareButton Client Component

**Files:**
- Create: `src/components/digest/share-button.tsx`
- Create: `tests/integration/share-button.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/integration/share-button.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ShareButton } from "@/components/digest/share-button";

describe("ShareButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders a share button", () => {
    render(<ShareButton digestDayKey="2026-03-28" />);

    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("copies share URL to clipboard on click", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, shareUrl: "https://example.com/public/abc123" }),
    });

    render(<ShareButton digestDayKey="2026-03-28" />);

    const button = screen.getByRole("button", { name: /share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/digests/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestDayKey: "2026-03-28" }),
      });
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://example.com/public/abc123",
    );
  });

  it("shows 已复制 state after successful share", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, shareUrl: "https://example.com/public/abc123" }),
    });

    render(<ShareButton digestDayKey="2026-03-28" />);

    const button = screen.getByRole("button", { name: /share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("已复制")).toBeInTheDocument();
    });
  });

  it("disables button while API call is in progress", async () => {
    let resolvePromise: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    render(<ShareButton digestDayKey="2026-03-28" />);

    const button = screen.getByRole("button", { name: /share/i });
    fireEvent.click(button);

    expect(button).toBeDisabled();

    resolvePromise!({
      ok: true,
      json: async () => ({ ok: true, shareUrl: "https://example.com/public/abc123" }),
    });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it("returns to idle state on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "Digest not found." }),
    });

    render(<ShareButton digestDayKey="2026-03-28" />);

    const button = screen.getByRole("button", { name: /share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run tests/integration/share-button.test.tsx`

Expected: FAIL — `ShareButton` component does not exist.

- [ ] **Step 3: Implement the ShareButton component**

Create `src/components/digest/share-button.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";

export function ShareButton({ digestDayKey }: { digestDayKey: string }) {
  const [state, setState] = useState<"idle" | "loading" | "copied">("idle");

  const handleShare = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/digests/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestDayKey }),
      });

      const data = await res.json();

      if (data.ok && data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
        setState("copied");
        setTimeout(() => setState("idle"), 2000);
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  }, [digestDayKey]);

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-foreground disabled:opacity-50"
      aria-label="Share this digest"
    >
      {state === "copied" ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          已复制
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run tests/integration/share-button.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/digest/share-button.tsx tests/integration/share-button.test.tsx
git commit -m "feat: add ShareButton client component"
```

---

### Task 5: Integrate ShareButton into DigestView

**Files:**
- Modify: `src/components/digest/digest-view.tsx`
- Modify: `tests/integration/digest-view.test.tsx`

- [ ] **Step 1: Update DigestView to accept and render ShareButton**

In `src/components/digest/digest-view.tsx`:

1. Import `ShareButton` at the top:
```tsx
import { ShareButton } from "@/components/digest/share-button";
```

2. Add `digestDayKey` to the props type (optional, only used when sharing is enabled):
```tsx
export function DigestView({
  title,
  intro,
  digestDate,
  topics,
  digestDayKey,
}: {
  title: string;
  intro?: string;
  digestDate: string;
  topics: DigestTopic[];
  digestDayKey?: string;
}) {
```

3. Add the share button next to the date header, inside the `flex items-center gap-4 pb-8` div, after the `h-px flex-1` div:
```tsx
<div className="flex items-center gap-4 pb-8">
  <div className="flex flex-col items-start">
    <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase leading-[16.5px] tracking-[2.2px] text-text-muted">
      {digestDate}
    </span>
  </div>
  <div className="h-px flex-1 bg-[var(--border)]" />
  {digestDayKey && <ShareButton digestDayKey={digestDayKey} />}
</div>
```

- [ ] **Step 2: Update existing DigestView tests to pass the new optional prop**

The existing tests in `tests/integration/digest-view.test.tsx` don't pass `digestDayKey`, which is fine since it's optional. No changes needed to existing tests.

- [ ] **Step 3: Add a test for the share button rendering**

Add to `tests/integration/digest-view.test.tsx`:

```tsx
it("renders share button when digestDayKey is provided", () => {
  render(<DigestView {...defaultProps} digestDayKey="2026-03-28" />);

  expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
});

it("does not render share button when digestDayKey is not provided", () => {
  render(<DigestView {...defaultProps} />);

  expect(screen.queryByRole("button", { name: /share/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run tests to verify**

Run: `pnpm vitest run tests/integration/digest-view.test.tsx`

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/digest/digest-view.tsx tests/integration/digest-view.test.tsx
git commit -m "feat: integrate ShareButton into DigestView"
```

---

### Task 6: Pass digestDayKey to DigestView in Today and History Pages

**Files:**
- Modify: `src/app/(app)/today/page.tsx`
- Modify: `src/app/(app)/history/[digestDayKey]/page.tsx`

- [ ] **Step 1: Pass digestDayKey in Today page**

In `src/app/(app)/today/page.tsx`, find the two `<DigestView>` renders and add `digestDayKey`:

1. The local preview mode render (around line with `previewState.status === "ready"`):
```tsx
<DigestView
  title={previewState.digest.title}
  intro={previewState.digest.intro}
  topics={previewState.digest.topics}
  digestDate={formatTodayDate()}
/>
```
No change here — local preview mode doesn't have a shareable digest in the database.

2. The authenticated render at the bottom of the file:
```tsx
<DigestView
  title={digest.title ?? content.title}
  intro={digest.intro ?? content.intro}
  topics={content.topics}
  digestDate={formatDigestDate(digest.digestDayKey)}
  digestDayKey={digest.digestDayKey}
/>
```

- [ ] **Step 2: Pass digestDayKey in History detail page**

In `src/app/(app)/history/[digestDayKey]/page.tsx`, find the two `<DigestView>` renders:

1. The local preview mode render — no change (same reasoning as Today page).

2. The authenticated render at the bottom:
```tsx
<DigestView
  title={digest.title ?? content.title}
  intro={digest.intro ?? content.intro}
  topics={content.topics}
  digestDate={formatDigestDate(digestDayKey)}
  digestDayKey={digestDayKey}
/>
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit 2>&1 | head -20`

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/today/page.tsx src/app/\(app\)/history/\[digestDayKey\]/page.tsx
git commit -m "feat: pass digestDayKey to DigestView for share button"
```

---

### Task 7: Public Digest Page and Not-Found Page

**Files:**
- Create: `src/app/public/[slug]/page.tsx`
- Create: `src/app/public/not-found.tsx`

- [ ] **Step 1: Create the public not-found page**

Create `src/app/public/not-found.tsx`:

```tsx
export default function PublicNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-[var(--text-muted)]">简报不存在或链接已失效</p>
    </div>
  );
}
```

This renders the spec-required message "简报不存在或链接已失效" when `notFound()` is called from the public page.

- [ ] **Step 2: Create the public digest page**

Create `src/app/public/[slug]/page.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DigestView } from "@/components/digest/digest-view";
import { db } from "@/lib/db";
import { getSharedDigest } from "@/lib/digest/service";
import { formatDigestDate } from "@/lib/digest/format";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!db) {
    return { title: "Digest Not Found" };
  }

  const result = await getSharedDigest(slug);

  if (!result || !result.content) {
    return { title: "Digest Not Found" };
  }

  const { digest, content } = result;
  const date = formatDigestDate(digest.digestDayKey);

  return {
    title: `${digest.title ?? content.title} — ${date}`,
    description: digest.intro ?? content.intro ?? "A shared Newsi digest.",
  };
}

export default async function PublicDigestPage({ params }: PageProps) {
  const { slug } = await params;

  if (!db) {
    notFound();
  }

  const result = await getSharedDigest(slug);

  if (!result) {
    notFound();
  }

  const { digest, content } = result;

  if (!content) {
    notFound();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <DigestView
          title={digest.title ?? content.title}
          intro={digest.intro ?? content.intro}
          topics={content.topics}
          digestDate={formatDigestDate(digest.digestDayKey)}
        />
      </main>

      <footer className="border-t border-[var(--border-solid)] py-8 text-center">
        <p className="font-sans text-sm text-[var(--text-muted)]">
          由{" "}
          <Link
            href="/"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Newsi
          </Link>{" "}
          生成 · 创建你的每日简报
        </p>
      </footer>
    </div>
  );
}
```

Key points:
- Outside `(app)` layout group → no sidebar, no auth redirect
- No `digestDayKey` passed to `DigestView` → no share button on the public page (viewers can't re-share)
- Uses `notFound()` for all error cases (slug not found, status not ready, content unparseable) → renders `public/not-found.tsx` with the spec-required Chinese message
- `generateMetadata` for SEO with digest title + date
- Footer with brand text "由 Newsi 生成 · 创建你的每日简报" linking to homepage

- [ ] **Step 3: Verify the page compiles**

Run: `npx tsc --noEmit 2>&1 | grep -i "public" || echo "No errors"`

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/public/
git commit -m "feat: add public digest page at /public/[slug] with not-found"
```

---

### Task 8: Run Full Test Suite and Verify

- [ ] **Step 1: Run all unit and integration tests**

Run: `pnpm test`

Expected: All tests pass (existing + new share tests).

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`

Expected: No errors.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address test or type issues from full suite run"
```
