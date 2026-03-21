import { format, parseISO } from "date-fns";
import { z } from "zod";
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
  status: "scheduled";
  detailBody: string;
}

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
