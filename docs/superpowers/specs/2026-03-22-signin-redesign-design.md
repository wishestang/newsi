# Sign-In Page Redesign — Design Spec

**Date:** 2026-03-22
**Scope:** `/signin` page only
**Status:** Draft

## Problem

The current sign-in page is visually bare (dark background, "Newsi" + tagline + button) and fails to:
1. Communicate what Newsi does or why a user should sign in
2. Reflect the editorial, warm, premium brand identity established in the app interior

## Design Decision

**Layout:** Left-content / right-preview split (Approach A), switching to single-column on mobile.
**Tone:** Warm white (`#f7f6f3`) matching the app interior, editorial typography, product-value-forward.

## Specification

### Overall Layout

| Property | Value |
|----------|-------|
| Background | `#f7f6f3` (var `--background`) |
| Container | Full viewport height, flex, centered both axes |
| Inner wrapper | `max-width: 960px`, flex row, `gap: 64px`, vertically centered |
| Breakpoint | `md` (768px) — below this, single column |

### Left Column (~55%)

Stacks vertically: brand → headline → subline → login button → preview link.

#### Brand Mark
- Sparkle icon (existing `icon-sparkle.svg`, 22×22) + "Newsi" text
- "Newsi": Manrope Bold, 20px, `#1a1a1a`, `letter-spacing: -0.5px`
- Gap between icon and text: 10px
- Bottom margin: 48px

#### Headline
- Text: "Your daily knowledge synthesis" (with `<br/>` after "daily")
- Font: Manrope Bold, 38px
- Color: `#1a1a1a`
- Line-height: 1.08
- Letter-spacing: -1.2px
- Bottom margin: 16px

#### Subline
- Text: "One brief, one digest, every day. / Cut through the noise, focus on what matters."
- Font: IBM Plex Sans Regular, 16px
- Color: `#8d8d8b` (var `--text-muted`)
- Line-height: 1.65
- Bottom margin: 40px

#### Google Sign-In Button
- Background: white
- Border: `1px solid #e5e4e2` (var `--border-solid`)
- Border-radius: 8px
- Padding: 12px 24px
- Shadow: `0 1px 2px rgba(0,0,0,0.04)`
- Content: Google color logo (18×18 inline SVG, hardcoded in component) + "Continue with Google"
- Text: 14px, font-weight 500, `#1a1a1a`
- Gap between icon and text: 12px
- Hover: shadow increases to `0 2px 4px rgba(0,0,0,0.08)`
- Width: `fit-content` (desktop), `100%` (mobile)

#### Preview Fallback Link
- Shown only when auth is not configured (`!isAuthConfigured() || isLocalPreviewMode()`)
- Text: "or explore a preview →"
- Font: IBM Plex Mono, 12px, `#8d8d8b`
- Letter-spacing: 0.5px
- Top margin: 16px
- Links to `/today`
- Hover: underline

### Right Column (~45%, desktop only)

A white card displaying a static sample digest to preview the product experience.

#### Card Container
- Background: white
- Border-radius: 10px
- Padding: 36px 32px
- Shadow: `0 2px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03)`
- Width: 340px (flex-shrink: 0)
- Hidden below `md` breakpoint (`hidden md:block`)

#### Card Content (static, hardcoded)

**Date header:**
- Format: "SAT, MAR 22, 2026" (computed from current date at build/render time)
- Font: IBM Plex Mono Bold, 10px, uppercase, `letter-spacing: 2.2px`, `#8d8d8b`
- Followed by flex-grow divider line (`1px solid #e5e4e2`)
- Bottom margin: 24px

**Title:**
- Text: "AI Agents Reshape Developer Workflows" (hardcoded sample)
- Font: Manrope Bold, 22px, `letter-spacing: -0.6px`, `line-height: 1.2`, `#1a1a1a`
- Bottom margin: 12px

**Intro paragraph:**
- Text: "The latest wave of AI coding tools moves beyond autocomplete into autonomous task execution, changing how developers plan, write, and review code."
- Font: IBM Plex Sans Regular, 13px, `line-height: 1.75`, `#2b2b2b`
- Bottom margin: 24px

**Section heading:**
- Text: "Key Points"
- Font: Manrope Bold, 15px, `letter-spacing: -0.2px`, `#1a1a1a`
- Bottom margin: 14px

**Key points (3 items):**
- Each: 6×6 red square (`#ea5948`) bullet + text
- Bullet: `margin-top: 6px` to align with first line of text
- Text: 13px IBM Plex Sans, `line-height: 1.65`, `#2b2b2b`
- Bold keyword in each: `font-weight: 600`, `#1a1a1a`
- Gap between items: 10px
- Sample items:
  1. **Claude Code** ships multi-file editing with context-aware refactoring
  2. **Cursor** raises Series C at $2.5B valuation, plans enterprise push
  3. **GitHub** reports 40% of new code now AI-assisted across its platform
- Bottom margin: 24px

**Footer:**
- Top border: `1px solid #e5e4e2`
- Padding-top: 16px
- Centered: sparkle icon (12×12, `#ea5948`) + "END OF DIGEST"
- Text: IBM Plex Mono Bold, 9px, uppercase, `letter-spacing: 2.2px`, `#8d8d8b`
- Gap: 8px

### Responsive Behavior

| Breakpoint | Behavior |
|------------|----------|
| ≥768px (md) | Two-column flex row, gap 64px, card visible |
| <768px | Single column, card hidden, headline 32px, button full-width, left-column text left-aligned |

### Mobile Adjustments
- Headline: 32px (down from 38px), line break after "daily" removed (natural wrap)
- Subline: 15px
- Google button: full width, centered content
- Preview link: centered
- Digest card: `hidden` (display none)
- Padding: 48px 28px

## Files to Modify

| File | Change |
|------|--------|
| `src/app/signin/page.tsx` | Complete rewrite of layout and content |
| `src/components/auth/google-sign-in-button.tsx` | Restyle button (white bg, border, rounded, Google logo SVG) |

## Files to Create

None. All changes are within existing files.

## Out of Scope

- Auth method changes (stays Google OAuth only)
- Other pages (empty state, topics, etc.)
- Dark mode variant
- Animation or transitions
- Dynamic digest content (card uses hardcoded sample)
