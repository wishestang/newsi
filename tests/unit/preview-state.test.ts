import { describe, expect, it, vi } from "vitest";

describe("buildPreviewInterestProfile", () => {
  it("sets the first eligible digest day based on the browser timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T08:00:00+08:00"));

    const { buildPreviewInterestProfile } = await import("@/lib/preview-state");

    expect(
      buildPreviewInterestProfile({
        interestText: "AI agents and design tools",
        browserTimezone: "Asia/Shanghai",
      }),
    ).toEqual({
      interestText: "AI agents and design tools",
      timezone: "Asia/Shanghai",
      firstEligibleDigestDayKey: "2026-03-23",
    });

    vi.useRealTimers();
  });

  it("parses and rejects malformed cookie payloads safely", async () => {
    const { parsePreviewInterestProfile } = await import("@/lib/preview-state");

    expect(parsePreviewInterestProfile('{"interestText":"AI"}')).toBeNull();
    expect(parsePreviewInterestProfile("not-json")).toBeNull();
  });

  it("builds archive preview copy from the saved interest profile", async () => {
    const { buildPreviewArchiveDigest } = await import("@/lib/preview-state");

    expect(
      buildPreviewArchiveDigest({
        interestText: "AI agents and design tools",
        timezone: "Asia/Shanghai",
        firstEligibleDigestDayKey: "2026-03-23",
      }),
    ).toEqual({
      digestDayKey: "2026-03-23",
      title: "Digest scheduled",
      status: "scheduled",
      detailBody:
        "Newsi saved this brief and scheduled the first digest for March 23, 2026 after the local 07:00 run. Standing brief: AI agents and design tools",
    });
  });
});
