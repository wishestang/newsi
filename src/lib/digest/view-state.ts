import { format, parseISO } from "date-fns";

export type TodayDigestState =
  | "unconfigured"
  | "scheduled"
  | "generating"
  | "failed"
  | "ready";

export function getTodayDigestState({
  hasInterestProfile,
  digest,
}: {
  hasInterestProfile: boolean;
  digest: { status: Exclude<TodayDigestState, "unconfigured" | "scheduled"> | "scheduled" } | null;
}): TodayDigestState {
  if (!hasInterestProfile) {
    return "unconfigured";
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
    return "Your next digest will appear after the local 07:00 run.";
  }

  return `Your first digest is scheduled for ${format(parseISO(firstEligibleDigestDayKey), "MMMM d, yyyy")} after the local 07:00 run.`;
}
