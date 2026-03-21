import { describe, expect, it } from "vitest";
import { getTodayDigestState } from "@/lib/digest/view-state";

describe("getTodayDigestState", () => {
  it("returns unconfigured when the user has no interest profile", () => {
    expect(getTodayDigestState({ hasInterestProfile: false, digest: null })).toBe(
      "unconfigured",
    );
  });

  it("returns scheduled when the user has interests but no digest yet", () => {
    expect(getTodayDigestState({ hasInterestProfile: true, digest: null })).toBe(
      "scheduled",
    );
  });

  it("returns the stored digest status when a digest exists", () => {
    expect(
      getTodayDigestState({
        hasInterestProfile: true,
        digest: { status: "failed" },
      }),
    ).toBe("failed");
  });
});
