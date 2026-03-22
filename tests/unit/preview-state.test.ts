import { describe, expect, it, vi } from "vitest";

describe("preview state", () => {
  it("builds a pending preview profile without leaking confirmed preview content into formal history", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T08:00:00+08:00"));

    const { buildPreviewInterestProfile } = await import("@/lib/preview-state");

    expect(
      buildPreviewInterestProfile({
        interestText: "AI agents and design tools",
        browserTimezone: "Asia/Shanghai",
      }),
    ).toMatchObject({
      interestText: "AI agents and design tools",
      timezone: "Asia/Shanghai",
      firstEligibleDigestDayKey: "2026-03-23",
      status: "pending_preview",
      preview: {
        status: "generating",
        generationToken: expect.any(String),
      },
    });

    vi.useRealTimers();
  });

  it("parses and rejects malformed cookie payloads safely", async () => {
    const { parsePreviewInterestProfile } = await import("@/lib/preview-state");

    expect(parsePreviewInterestProfile('{"interestText":"AI"}')).toBeNull();
    expect(parsePreviewInterestProfile("not-json")).toBeNull();
  });

  it("completes preview generation only when the token still matches", async () => {
    const { completePreviewGeneration } = await import("@/lib/preview-state");

    const completed = completePreviewGeneration(
      {
        interestText: "AI agents, design tools, indie builders",
        timezone: "Asia/Shanghai",
        firstEligibleDigestDayKey: "2026-03-23",
        status: "pending_preview",
        preview: {
          status: "generating",
          generationToken: "token-1",
        },
      },
      "token-1",
    );

    expect(completed).toMatchObject({
      status: "pending_preview",
      preview: {
        status: "ready",
        generationToken: "token-1",
        digest: {
          title: "Today's Synthesis",
          readingTime: 5,
        },
      },
    });
  });

  it("keeps stale local generation attempts from mutating the profile", async () => {
    const { completePreviewGeneration } = await import("@/lib/preview-state");

    const profile = {
      interestText: "AI agents, design tools, indie builders",
      timezone: "Asia/Shanghai",
      firstEligibleDigestDayKey: "2026-03-23",
      status: "pending_preview" as const,
      preview: {
        status: "generating" as const,
        generationToken: "token-1",
      },
    };

    expect(completePreviewGeneration(profile, "token-2")).toEqual(profile);
  });

  it("confirms a ready preview into an active scheduled profile without creating archive content", async () => {
    const { confirmPreviewInterestProfile, getLocalTodayState, getLocalArchiveItems } =
      await import("@/lib/preview-state");

    const confirmed = confirmPreviewInterestProfile(
      {
        interestText: "AI agents, design tools, indie builders",
        timezone: "Asia/Shanghai",
        firstEligibleDigestDayKey: "2026-03-23",
        status: "pending_preview",
        preview: {
          status: "ready",
          generationToken: "token-1",
          digest: {
            title: "Today's Synthesis",
            intro: "Preview intro",
            readingTime: 5,
            sections: [
              { title: "A", summary: ["a", "b"], keyPoints: ["c", "d"] },
              { title: "B", summary: ["a", "b"], keyPoints: ["c", "d"] },
              { title: "C", summary: ["a", "b"], keyPoints: ["c", "d"] },
            ],
          },
        },
      },
      new Date("2026-03-22T09:00:00+08:00"),
    );

    expect(getLocalTodayState(confirmed)).toMatchObject({
      status: "scheduled",
      firstEligibleDigestDayKey: "2026-03-23",
    });
    expect(getLocalArchiveItems(confirmed)).toEqual([]);
  });
});
