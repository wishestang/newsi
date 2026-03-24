import { randomUUID } from "node:crypto";
import { z } from "zod";
import { digestResponseSchema, type DigestResponse } from "@/lib/digest/schema";
import {
  getDigestDayKey,
  getNextDigestDayKey,
  hasDailyRunPassed,
  normalizeTimezone,
} from "@/lib/timezone";

export const PREVIEW_INTEREST_COOKIE = "newsi-preview-interest-profile";

const previewDigestSchema = z.object({
  status: z.enum(["generating", "failed", "ready"]),
  generationToken: z.string().min(1),
  digest: digestResponseSchema.optional(),
  failureReason: z.string().optional(),
});

const activePreviewDigestSchema = z.object({
  digestDayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  digest: digestResponseSchema,
});

const previewInterestProfileSchema = z.object({
  interestText: z.string().min(1),
  timezone: z.string().min(1),
  firstEligibleDigestDayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["pending_preview", "active"]),
  preview: previewDigestSchema,
  activeDigest: activePreviewDigestSchema.optional(),
});

export type PreviewInterestProfile = z.infer<typeof previewInterestProfileSchema>;
export type LocalArchiveItem = {
  digestDayKey: string;
  title: string;
  status?: "scheduled" | "generating" | "failed" | "ready";
  readingTime?: number | null;
};

export function buildPreviewInterestProfile({
  interestText,
  browserTimezone,
  now = new Date(),
}: {
  interestText: string;
  browserTimezone?: string | null;
  now?: Date;
}): PreviewInterestProfile {
  const timezone = normalizeTimezone(browserTimezone);
  const firstEligibleDigestDayKey = hasDailyRunPassed(timezone, now)
    ? getNextDigestDayKey(timezone, now)
    : getDigestDayKey(timezone, now);

  return {
    interestText: interestText.trim(),
    timezone,
    firstEligibleDigestDayKey,
    status: "pending_preview",
    preview: {
      status: "generating",
      generationToken: randomUUID(),
    },
  };
}

export function parsePreviewInterestProfile(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return previewInterestProfileSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}

export function completePreviewGeneration(
  profile: PreviewInterestProfile,
  generationToken: string,
) {
  if (
    profile.status !== "pending_preview" ||
    profile.preview.status !== "generating" ||
    profile.preview.generationToken !== generationToken
  ) {
    return profile;
  }

  return {
    ...profile,
    preview: {
      status: "ready",
      generationToken,
      digest: buildPreviewDigest(profile.interestText),
    },
  } satisfies PreviewInterestProfile;
}

export function failPreviewGeneration(
  profile: PreviewInterestProfile,
  generationToken: string,
  failureReason: string,
) {
  if (
    profile.status !== "pending_preview" ||
    profile.preview.generationToken !== generationToken
  ) {
    return profile;
  }

  return {
    ...profile,
    preview: {
      status: "failed",
      generationToken,
      failureReason,
    },
  } satisfies PreviewInterestProfile;
}

export function retryPreviewGeneration(profile: PreviewInterestProfile) {
  return {
    ...profile,
    preview: {
      status: "generating",
      generationToken: randomUUID(),
    },
  } satisfies PreviewInterestProfile;
}

export function confirmPreviewInterestProfile(
  profile: PreviewInterestProfile,
  now = new Date(),
) {
  const previewDigest = profile.preview.digest;

  if (profile.preview.status !== "ready" || !previewDigest) {
    throw new Error("Preview digest is not ready yet.");
  }

  return {
    ...profile,
    firstEligibleDigestDayKey: getNextDigestDayKey(profile.timezone, now),
    status: "active",
    preview: {
      status: "ready",
      generationToken: profile.preview.generationToken,
    },
    activeDigest: {
      digestDayKey: getDigestDayKey(profile.timezone, now),
      digest: previewDigest,
    },
  } satisfies PreviewInterestProfile;
}

export type LocalTodayState =
  | { status: "unconfigured" }
  | { status: "pending_preview" }
  | { status: "ready"; digestDayKey: string; digest: DigestResponse }
  | { status: "scheduled"; firstEligibleDigestDayKey: string };

export function getLocalTodayState(
  profile: PreviewInterestProfile | null,
): LocalTodayState {
  if (!profile) {
    return { status: "unconfigured" };
  }

  if (profile.status === "pending_preview") {
    return { status: "pending_preview" };
  }

  if (profile.activeDigest) {
    const todayDigestDayKey = getDigestDayKey(profile.timezone);

    if (profile.activeDigest.digestDayKey === todayDigestDayKey) {
      return {
        status: "ready",
        digestDayKey: profile.activeDigest.digestDayKey,
        digest: profile.activeDigest.digest,
      };
    }
  }

  return {
    status: "scheduled",
    firstEligibleDigestDayKey: profile.firstEligibleDigestDayKey,
  };
}

export function getLocalArchiveItems(
  profile: PreviewInterestProfile | null,
): LocalArchiveItem[] {
  if (!profile?.activeDigest) {
    return [];
  }

  return [
    {
      digestDayKey: profile.activeDigest.digestDayKey,
      title: profile.activeDigest.digest.title,
      status: "ready",
      readingTime: profile.activeDigest.digest.readingTime,
    },
  ];
}

function buildPreviewDigest(interestText: string): DigestResponse {
  const focusAreas = getFocusAreas(interestText);

  return {
    title: "Today's Synthesis",
    intro: `Newsi prepared a preview synthesis for your standing brief on ${focusAreas.join(", ")}.`,
    readingTime: 5,
    topics: focusAreas.map((focusArea, index) => ({
      topic: focusArea,
      eventsMarkdown: [
        `- **${focusArea} surfaced as a top tracked event.**`,
        `- Signals around ${focusArea.toLowerCase()} are the most relevant part of this brief right now, so the preview keeps the summary centered on what changed in the last cycle.`,
        `- ${focusArea} remains a first-class topic in the daily synthesis.`,
        "- The preview keeps event summaries concise and fact-led.",
      ].join("\n"),
      insightsMarkdown: [
        "The digest favors concise editorial synthesis over feed-style aggregation.",
        "Each topic separates what happened from what it means.",
      ].map((line) => `- ${line}`).join("\n"),
      takeawayMarkdown:
        index === 0
          ? "This mock digest exists to simulate the final reading surface before live provider output is configured."
          : `${focusArea} would continue to receive a dedicated facts-and-insights block in the live product.`,
    })),
  };
}

function getFocusAreas(interestText: string) {
  const parts = interestText
    .split(/[,\n]/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) {
    return parts.slice(0, 3);
  }

  return [
    parts[0] ?? "Primary Focus",
    parts[1] ?? "Emerging Signals",
    parts[2] ?? "Why It Matters",
  ];
}
