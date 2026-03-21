# Newsi（知新）MVP PRD

## Document Info

- Product: Newsi（知新）
- Version: MVP v1.0
- Status: Approved for planning
- Date: 2026-03-21
- Platform: Web

## 1. Product Overview

### 1.1 One-line Definition

Newsi is a web product for individual knowledge workers. A user writes, in natural language, what domains they want to keep up with. The system then automatically generates a daily in-app digest around those interests instead of relying on mass-market recommendations, algorithmic feeds, or generic trending topics.

### 1.2 Background

In the AI era, the core information problem is no longer lack of access. It is overload, distortion by recommendation systems, and the mismatch between what is globally trending and what a specific person actually needs to know.

Knowledge workers often care about a narrow and evolving set of topics such as AI agents, design tools, developer platforms, startup ecosystems, or specific industries. Existing products optimize for engagement and broad popularity. Newsi should optimize for self-defined relevance.

### 1.3 Core Value Proposition

Newsi lets users actively define what matters to them, then uses an AI-driven daily workflow to summarize what changed in those areas. The product replaces passive feed consumption with a quiet, personal daily synthesis.

## 2. Target Users

### 2.1 Primary User Segment

Individual knowledge workers, including:

- Product managers
- Designers
- Developers
- Researchers
- Investors
- Indie hackers
- Founders

### 2.2 User Characteristics

- Track information for work, learning, or decision-making
- Care more about signal quality than volume
- Do not want to manually search every day
- Are dissatisfied with generic news apps and social feeds
- Prefer a focused reading experience over a noisy stream

### 2.3 Core User Problem

Users do not need more news. They need a reliable daily answer to:

"What changed today in the areas I care about?"

## 3. Product Goals and Non-goals

### 3.1 MVP Goals

The MVP should validate one core hypothesis:

> Users are willing to delegate ongoing information monitoring to AI if the system can produce a relevant daily in-app digest based on their own interest description.

Specific MVP goals:

- Let a user define their long-term interests in one natural-language input
- Automatically generate one daily digest inside the product
- Provide a calm reading experience for the current day
- Preserve past digests in an archive
- Keep the product minimal, understandable, and habit-forming

### 3.2 Non-goals

The MVP will not include:

- Email delivery
- Push notifications
- Social sharing
- Team collaboration
- Multiple interest profiles per user
- Manual confirmation of AI topic decomposition
- Custom source management
- Internal crawling or RSS ingestion systems
- Trend charts, analytics, or insight dashboards
- Search across historical digests
- Export to PDF or Markdown

## 4. Product Principles

- User-defined relevance over platform-defined popularity
- Reading experience over information density
- Daily synthesis over infinite feed
- Minimal setup over granular controls
- AI-assisted interpretation over raw result aggregation

## 5. MVP Scope Summary

The MVP includes three user-facing surfaces:

- `Today`: read today's digest
- `Archive`: browse historical digests by date
- `Topics`: create or edit the user's interest description

The system behavior is:

- User writes one natural-language interest description
- System stores that description as the user's standing brief
- System calls a real-time web-capable LLM once per day
- System generates one digest for that day
- User reads the result in-app

## 6. User Stories

### 6.1 Primary Stories

- As a knowledge worker, I want to describe what I care about in plain language so I do not need to configure a complex monitoring system.
- As a user, I want the product to automatically prepare a daily digest so I do not need to manually search every day.
- As a reader, I want today's digest to feel curated and readable so I can understand the important changes quickly.
- As a returning user, I want to browse previous digests so I can track what happened over time.
- As a user, I want to update my interest description whenever my focus changes.

### 6.2 Edge Stories

- As a new user, I want to understand what happens after I save my interests if today's digest is not ready yet.
- As a user, I want the product to show a clear state when digest generation is still running or has failed.
- As a user, I want changes to my interests to affect future digests without rewriting past ones.

## 7. Information Architecture

### 7.1 Navigation

Persistent left navigation with three destinations:

- Today
- Archive
- Topics

### 7.2 Page Roles

#### Today

Primary consumption surface. Shows the current day's digest with a quiet, long-form reading layout.

#### Archive

Historical list of previously generated digests, organized by date.

#### Topics

Single-purpose configuration surface where the user writes and updates the natural-language interest description.

## 8. Core User Flow

### 8.1 First-time Setup

1. User enters the product.
2. User reaches `Topics`.
3. User writes a natural-language description of ongoing interests.
4. User saves the description.
5. System stores it as the user's active interest profile.
6. If no digest exists yet for the current day, the product explains when the first digest will appear.

### 8.2 Daily Use

1. At a fixed time each day, the system starts digest generation.
2. The system reads the saved interest description.
3. The system calls a web-capable LLM and requests a same-day synthesis based on that description.
4. The system writes the output as the day's digest.
5. The user opens `Today` and reads it.

Digest scheduling rules for MVP:

- The digest day is defined by the user's stored account timezone.
- The first account timezone should be inferred from the browser on first use and stored server-side.
- The stored account timezone is not user-editable in MVP.
- `Today` rolls over at 00:00 in that stored timezone.
- The automatic digest run should start once per day at 07:00 in that stored timezone.
- If a user saves their first interest profile after that day's scheduled run has already passed, the first guaranteed digest is the next calendar day in the stored timezone.

### 8.3 Ongoing Management

1. User edits the interest description in `Topics`.
2. The updated description becomes the new standing brief for future runs.
3. Existing archive entries remain unchanged.

## 9. Functional Requirements

### 9.1 Interest Profile

#### Description

Each user has one active interest profile expressed as natural language.

#### Requirements

- The system must allow the user to create an interest description.
- The system must allow the user to edit and overwrite the interest description.
- The system must persist the latest saved version.
- The system must use the latest saved version for future digest generation.

#### Out of Scope

- Multiple saved profiles
- Profile version history exposed to the user
- Keyword weights
- Include/exclude filters
- Source preferences
- Topic-level configuration UI

### 9.2 Daily Digest Generation

#### Description

The system automatically generates one digest per day using the user's saved interest description and a web-capable LLM.

#### Requirements

- The system must run generation automatically once per day at a fixed time.
- The system must create at most one official digest entry per user per calendar day.
- The system must store generation status separately from the rendered content.
- The system must retry failed generations automatically.
- The system must not require user action to trigger daily generation.
- The calendar day and generation schedule must be based on the user's stored account timezone.

#### Assumptions

- The external model can perform real-time web research or search-backed synthesis.
- The product does not own the retrieval layer in MVP.
- The system can infer and persist a timezone value during the user's first session without exposing timezone settings in MVP.

#### Out of Scope

- Manual rerun by the user
- Multiple digest versions in the same day
- User-visible source configuration

### 9.3 Today Page

#### Description

The Today page is the main reading surface for the current day's digest.

#### Required States

- No interest profile yet
- Interest profile saved, digest not yet generated
- Digest generation in progress
- Digest generation failed
- Digest generation succeeded

#### Requirements

- When no interest profile exists, the page must direct the user to `Topics`.
- When a digest is not yet available for the day, the page must explain that generation runs automatically at a fixed time.
- When generation is in progress, the page must show a clear in-progress state.
- When generation fails, the page must show a clear failure state and indicate that the system will retry.
- When generation succeeds, the page must render the full digest content.

### 9.4 Archive Page

#### Description

The Archive page lists historical digests by date for later reading.

#### Requirements

- The system must display a chronological list of past digest entries.
- Each list item must include at least the date and digest title.
- Each list item should include an estimated reading length or similar metadata.
- Clicking an item must open the corresponding digest detail view.

#### Out of Scope

- Search
- Filtering
- Topic clustering
- Trend comparison across dates

### 9.5 Topics Page

#### Description

The Topics page is the single configuration surface for the user's standing interest brief.

#### Requirements

- The page must display the current interest description if one exists.
- The page must provide a text input area for editing.
- The page must provide a save action.
- The empty state must explain that the text entered here drives future daily digests.

## 10. Digest Content Specification

### 10.1 Content Objective

The digest should answer:

- What changed today in the user's areas of interest?
- Why does it matter?
- What are the most relevant signals worth remembering?

### 10.2 Content Structure

Recommended structure for each daily digest:

#### Header

- Date
- Digest title, such as `Today's Synthesis`
- One short framing sentence for the day

#### Body

3 to 5 thematic sections. Each section should include:

- A section title
- Two to four short paragraphs of synthesis
- A small set of key points
- Optional one-line explanation of why the section matters

#### Footer

- End marker or closing line

### 10.3 Content Rules

- Prioritize summary over exhaustive listing
- Prioritize relevance over breadth
- Focus on changes, signals, and developments
- Avoid sounding like a generic news feed
- Avoid sensational tone
- Optimize for a 5 to 8 minute reading session

### 10.4 Sources

MVP is summary-first. Source linking is not a hard requirement.

Implications:

- The product may show source references if the model returns them in a stable way, but the UI and acceptance criteria do not depend on that.
- The product should not position itself as a verified citation tool in MVP.

## 11. System States and Failure Handling

### 11.1 User-visible States

For the Today page, the system must support:

- `unconfigured`
- `scheduled`
- `generating`
- `failed`
- `ready`

### 11.2 Failure Principles

- Failure should not result in a blank page.
- Historical digests must remain accessible regardless of today's failure.
- The user-facing message should be simple and non-technical.
- Retries should happen automatically in the background.

### 11.3 Retry Policy

- After an initial failed run, the system should retry automatically up to 3 times.
- Retries should complete within the same digest day whenever possible.
- If all retries fail, that day's digest remains in `failed` state and is not silently backfilled into a different date.
- A later successful run may update the same day's failed entry only if it still belongs to the same digest date in the user's stored timezone.

## 12. Data Model

### 12.0 Account Model

MVP assumes authenticated users. Newsi stores one active interest profile and one digest history per user account.

### 12.1 User

Minimal account identity needed to tie data to an individual user.

Fields may include:

- `user_id`
- `account_timezone`

### 12.2 InterestProfile

Fields may include:

- `user_id`
- `interest_text`
- `updated_at`

### 12.3 DailyDigest

Fields may include:

- `user_id`
- `digest_date`
- `status`
- `title`
- `intro`
- `content`
- `reading_time`
- `created_at`
- `updated_at`

## 13. Design and UX Direction

### 13.1 Product Feel

The experience should feel quiet, editorial, and intentional. It should not resemble a social feed, dashboard overload, or trading terminal.

### 13.2 UX Principles

- Minimal navigation
- Strong typography and whitespace
- Calm empty states
- Reading-first layout
- Low interaction density

### 13.3 Relationship to Provided Prototype

The provided prototype establishes the right direction for MVP:

- Left rail navigation
- Large reading canvas
- Sparse archive list
- Simple interest input page
- Strong emphasis on calm, focused synthesis

## 14. Success Metrics

### 14.1 Activation Metrics

- Interest description save rate
- First digest generation success rate
- First digest open rate

### 14.2 Retention Metrics

- 7-day return rate
- Percentage of users who open multiple daily digests within one week
- Archive revisit rate

### 14.3 Product Quality Signals

- Interest description edit rate
- Failed generation rate
- Average digest read completion proxy, such as time on page or scroll depth

## 15. Risks and Trade-offs

### 15.1 Black-box Risk

Because the user does not review topic decomposition, the system may feel opaque when the digest misses the mark.

Mitigation:

- Keep interest editing easy
- Explain that the digest is driven by the saved interest description
- Avoid pretending the system is more controllable than it is

### 15.2 External Model Quality Risk

The MVP depends on an external LLM for real-time research quality. Coverage, freshness, and synthesis quality may vary.

Mitigation:

- Frame the product as a daily synthesis tool, not a comprehensive intelligence platform
- Keep the MVP narrow
- Revisit retrieval architecture only if quality becomes the core blocker

### 15.3 Habit Risk

If the daily digest feels repetitive or shallow, users may stop checking it.

Mitigation:

- Emphasize recent changes
- Reduce repeated background context
- Keep sections concise and signal-oriented

## 16. Acceptance Criteria

The MVP is considered complete when all of the following are true:

- A user can create and save one interest description in natural language.
- The system stores that description as the active brief for future generation.
- The system automatically generates one in-app digest per day.
- The Today page displays correct states for unconfigured, scheduled, generating, failed, and ready.
- A successful digest is readable on the Today page.
- Past digests are visible in the Archive.
- The user can edit the interest description in Topics.
- Editing the interest description affects future digests only and does not overwrite historical entries.

## 17. Open Questions Deferred Beyond MVP

These are intentionally deferred and should not block planning for MVP:

- Should future versions allow multiple topic sets or profiles?
- Should source references become first-class UI elements?
- Should users be able to trigger a manual rerun?
- Should the product support notifications or email delivery?
- Should archive browsing support search and filtering?

## 18. Final Scope Statement

Newsi MVP is not a full news platform and not a general-purpose knowledge management system. It is a minimal web product that validates one job clearly: a user defines what they care about once, and the system turns that brief into a daily, in-app AI synthesis they can quietly read and revisit over time.
