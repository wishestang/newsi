# Digest Sharing Feature

## Overview

Allow users to share their generated digests with others via a permanent public link. Anyone with the link can view the full digest content without authentication.

## Requirements

- Users can share today's digest or any historical digest
- Shared links are permanent and cannot be revoked
- Viewers see the complete digest page (title, intro, topics) without navigation
- Share action is triggered by a button on the digest view

## Data Model

Add a `shareSlug` field to the existing `DailyDigest` table:

```prisma
model DailyDigest {
  // ... existing fields ...
  shareSlug  String?   @unique   // null = not shared; set once, permanent
}
```

- **Type**: `String?` — nullable, null means not shared
- **Constraint**: `@unique` — creates a B-tree index, sufficient for slug lookups
- **Generation**: `crypto.randomUUID()` sliced to a URL-safe prefix (no new dependency needed)
- **Lifecycle**: once set, never removed or changed

## API

### POST /api/digests/share

Creates or returns an existing share link for a digest.

- **Auth**: required (session)
- **Request body**: `{ digestDayKey: string }`
- **Validation**: return 400 if `digestDayKey` is missing or not a string (following the pattern in `src/app/api/digests/retry/route.ts`)
- **Logic**:
  1. Guard `if (!db)` and return error (following existing project pattern)
  2. Query the user's digest for the given `digestDayKey`
  3. If digest not found, return `{ ok: false, error: "Digest not found" }` with 404
  4. If `shareSlug` exists, return it (idempotent)
  5. Otherwise, generate a new slug, persist it, return the full URL
- **Response**: `{ ok: true, shareUrl: string }`
- **Error responses**: `{ ok: false, error: "..." }` (following existing `{ ok: boolean }` envelope pattern)
- **Errors**: 400 for invalid input, 401 if unauthenticated, 404 if digest not found

## Public Page: /public/[slug]

A new public route outside the `(app)` layout group — no sidebar, no navigation, no auth required.

### Page Structure

1. **Header**: digest date using the existing `formatDigestDate()` function (consistent with authenticated views)
2. **Body**: reuse `DigestView` component to render the full digest
3. **Footer**: "由 Newsi 生成 · 创建你的每日简报" linking to the homepage

### Behavior

- Guard `if (!db)` and return not-found (following existing project pattern)
- Query `DailyDigest` by `shareSlug`
- If found, status is `ready`, and `contentJson` is non-null and parseable (using `parseStoredDigestContent`), render the digest
- If not found, status is not `ready`, or `contentJson` is null/unparseable, show "简报不存在或链接已失效"
- Set appropriate `<title>` and `<meta>` tags for SEO (digest title + date)

### Retry/Regeneration Edge Case

If a user has shared a digest and then retries it:
- During regeneration (status changes to `generating`), the public page shows "简报不存在或链接已失效"
- Once regeneration completes and status returns to `ready`, the link becomes valid again with the new content
- The share button is disabled when digest status is not `ready`

## Share Button

A new `ShareButton` client component (`src/components/digest/share-button.tsx`) — `DigestView` remains a server component.

### Component Architecture

- `ShareButton` is a `"use client"` component that accepts `digestDayKey` as a prop
- `DigestView` renders `<ShareButton digestDayKey={...} />` in the title area
- No toast library needed — use a lightweight inline state indicator: button text briefly changes to "已复制" after clicking, then reverts after 2 seconds

### Interaction

1. User clicks the share button (ghost button with share icon)
2. Client calls `POST /api/digests/share` with the current `digestDayKey`
3. On success, copy the returned `shareUrl` to clipboard via `navigator.clipboard.writeText()`
4. Button text changes to "已复制" for 2 seconds, then reverts to share icon
5. If the digest already has a `shareSlug`, the API returns the existing link (no duplicate generation)

### States

- **Default**: share icon
- **Loading**: disabled state while API call is in progress
- **Success**: "已复制" text for 2 seconds
- **Disabled**: when digest status is not `ready` (button not rendered)

## File Changes

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `shareSlug` field to `DailyDigest` |
| `prisma/migrations/` | New migration for `shareSlug` column |
| `src/app/public/[slug]/page.tsx` | New public digest view page |
| `src/app/api/digests/share/route.ts` | New share API endpoint |
| `src/components/digest/share-button.tsx` | New client component for share button |
| `src/components/digest/digest-view.tsx` | Render `ShareButton` in title area |
| `src/lib/digest/service.ts` | Add share-related service functions |

## Non-Goals

- Share link revocation or expiration
- Share analytics (view counts, referrer tracking)
- Social media preview cards (Open Graph images)
- Password-protected shares
- Bulk sharing (multiple digests at once)
