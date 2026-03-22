import { format, parseISO } from "date-fns";

export type TodayDigestState =
  | "unconfigured"
  | "pending_preview_confirmation"
  | "scheduled"
  | "generating"
  | "failed"
  | "ready";

export function getTodayDigestState({
  hasInterestProfile,
  profileStatus,
  digest,
}: {
  hasInterestProfile: boolean;
  profileStatus?: "pending_preview" | "active" | null;
  digest: { status: Exclude<TodayDigestState, "unconfigured" | "scheduled"> | "scheduled" } | null;
}): TodayDigestState {
  if (!hasInterestProfile) {
    return "unconfigured";
  }

  if (profileStatus === "pending_preview") {
    return "pending_preview_confirmation";
  }

  if (!digest) {
    return "scheduled";
  }

  return digest.status;
}

export function formatScheduledDigestMessage({
  firstEligibleDigestDayKey,
}: {
  firstEligibleDigestDayKey: string | null;
}) {
  if (!firstEligibleDigestDayKey) {
    return "Your next digest will appear after the Beijing 07:00 run.";
  }

  return `Your first digest is scheduled for ${format(parseISO(firstEligibleDigestDayKey), "MMMM d, yyyy")} after the Beijing 07:00 run.`;
}

export function formatFailedDigestMessage() {
  return "Today's digest failed in the Beijing morning batch. The next batch will run tomorrow at 07:00 Beijing time.";
}
