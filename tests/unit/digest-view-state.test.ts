import { describe, expect, it } from "vitest";
import {
  formatScheduledDigestMessage,
  getTodayDigestState,
} from "@/lib/digest/view-state";

describe("getTodayDigestState", () => {
  it("returns unconfigured when the user has no interest profile", () => {
    expect(getTodayDigestState({ hasInterestProfile: false, digest: null })).toBe(
      "unconfigured",
    );
  });

  it("returns scheduled when the user has interests but no digest yet", () => {
    expect(
      getTodayDigestState({
        hasInterestProfile: true,
        profileStatus: "active",
        digest: null,
      }),
    ).toBe("scheduled");
  });

  it("returns pending preview confirmation when interests are not active yet", () => {
    expect(
      getTodayDigestState({
        hasInterestProfile: true,
        profileStatus: "pending_preview",
        digest: null,
      }),
    ).toBe("pending_preview_confirmation");
  });

  it("returns the stored digest status when a digest exists", () => {
    expect(
      getTodayDigestState({
        hasInterestProfile: true,
        profileStatus: "active",
        digest: { status: "failed" },
      }),
    ).toBe("failed");
  });

  it("formats the scheduled state with an explicit first digest date", () => {
    expect(
      formatScheduledDigestMessage({
        firstEligibleDigestDayKey: "2026-03-22",
      }),
    ).toBe("Your first digest is scheduled for March 22, 2026 after the local 07:00 run.");
  });

  it("falls back to the generic scheduled message when no date is known", () => {
    expect(formatScheduledDigestMessage({ firstEligibleDigestDayKey: null })).toBe(
      "Your next digest will appear after the local 07:00 run.",
    );
  });
});
