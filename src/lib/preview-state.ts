import { format, parseISO } from "date-fns";
import { z } from "zod";
import type { DigestResponse } from "@/lib/digest/schema";
import {
  getDigestDayKey,
  getNextDigestDayKey,
  hasDailyRunPassed,
  normalizeTimezone,
} from "@/lib/timezone";

export const PREVIEW_INTEREST_COOKIE = "newsi-preview-interest-profile";

const previewInterestProfileSchema = z.object({
  interestText: z.string().min(1),
  timezone: z.string().min(1),
  firstEligibleDigestDayKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type PreviewInterestProfile = z.infer<typeof previewInterestProfileSchema>;

export interface PreviewArchiveDigest {
  digestDayKey: string;
  title: string;
  status: "scheduled" | "ready";
  readingTime?: number;
  detailBody: string;
}

type PreviewDigestState =
  | {
      status: "scheduled";
      archiveItem: PreviewArchiveDigest;
    }
  | {
      status: "ready";
      digestDayKey: string;
      archiveItem: PreviewArchiveDigest;
      digest: DigestResponse;
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

export function buildPreviewArchiveDigest(
  profile: PreviewInterestProfile,
): PreviewArchiveDigest {
  return {
    digestDayKey: profile.firstEligibleDigestDayKey,
    title: "Digest scheduled",
    status: "scheduled",
    detailBody: `Newsi saved this brief and scheduled the first digest for ${format(parseISO(profile.firstEligibleDigestDayKey), "MMMM d, yyyy")} after the local 07:00 run. Standing brief: ${profile.interestText}`,
  };
}

export function getPreviewDigestState(
  profile: PreviewInterestProfile,
  now = new Date(),
): PreviewDigestState {
  const todayDigestDayKey = getDigestDayKey(profile.timezone, now);

  if (todayDigestDayKey < profile.firstEligibleDigestDayKey) {
    return {
      status: "scheduled",
      archiveItem: buildPreviewArchiveDigest(profile),
    };
  }

  const digest = buildPreviewDigest(profile);

  return {
    status: "ready",
    digestDayKey: todayDigestDayKey,
    archiveItem: {
      digestDayKey: todayDigestDayKey,
      title: digest.title,
      status: "ready",
      readingTime: digest.readingTime,
      detailBody: digest.intro,
    },
    digest,
  };
}

function buildPreviewDigest(profile: PreviewInterestProfile): DigestResponse {
  const focusAreas = getFocusAreas(profile.interestText);

  return {
    title: "Today's Synthesis",
    intro: `Newsi prepared a preview synthesis for your standing brief on ${focusAreas.join(", ")}.`,
    readingTime: 5,
    sections: focusAreas.map((focusArea, index) => ({
      title: focusArea,
      summary: [
        `Signals around ${focusArea.toLowerCase()} are the most relevant part of this brief right now, so the preview keeps the summary centered on what changed and why it matters.`,
        `In the full product, this section would be generated from live web research, but the preview keeps the output shape stable so you can evaluate the reading experience locally.`,
      ],
      keyPoints: [
        `${focusArea} is preserved as a first-class topic in the daily synthesis.`,
        "The digest favors concise editorial synthesis over feed-style aggregation.",
      ],
      whyItMatters:
        index === 0
          ? "This mock digest exists to simulate the final reading surface before live provider output is configured."
          : undefined,
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
