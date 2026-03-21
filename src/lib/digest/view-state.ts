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
