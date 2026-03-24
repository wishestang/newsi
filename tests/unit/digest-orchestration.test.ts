import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  interestProfile: {
    findMany: vi.fn(),
  },
  dailyDigest: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

describe("runDigestGenerationCycle", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("generates and persists a ready digest for an eligible profile", async () => {
    mockDb.interestProfile.findMany.mockResolvedValue([
      {
        userId: "user-1",
        status: "active",
        interestText: "AI agents and design tools",
        firstEligibleDigestDayKey: "2026-03-21",
      },
    ]);
    mockDb.dailyDigest.findUnique.mockResolvedValue(null);
    mockDb.dailyDigest.upsert.mockResolvedValue(undefined);
    mockDb.dailyDigest.update.mockResolvedValue(undefined);

    const provider = {
      generate: vi.fn().mockResolvedValue({
        title: "Today's Synthesis",
        intro: "Two product signals stood out today.",
        readingTime: 6,
        topics: [
          {
            topic: "AI Agents",
            eventsMarkdown: "- A1\na",
            insightsMarkdown: "- AI insight",
            takeawayMarkdown: "AI takeaway",
          },
          {
            topic: "Design Tools",
            eventsMarkdown: "- D1\na",
            insightsMarkdown: "- Design insight",
            takeawayMarkdown: "Design takeaway",
          },
          {
            topic: "Indie Builders",
            eventsMarkdown: "- I1\na",
            insightsMarkdown: "- Indie insight",
            takeawayMarkdown: "Indie takeaway",
          },
        ],
      }),
    };

    const { runDigestGenerationCycle } = await import("@/lib/digest/service");

    const result = await runDigestGenerationCycle({
      now: new Date("2026-03-21T08:30:00Z"),
      provider,
    });

    expect(result).toEqual({
      processed: 1,
      ready: 1,
      failed: 0,
      skipped: 0,
    });
    expect(mockDb.interestProfile.findMany).toHaveBeenCalledWith({
      where: { status: "active" },
    });
    expect(provider.generate).toHaveBeenCalledOnce();
    expect(mockDb.dailyDigest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_digestDayKey: {
            userId: "user-1",
            digestDayKey: "2026-03-21",
          },
        },
        create: expect.objectContaining({
          userId: "user-1",
          digestDayKey: "2026-03-21",
          status: "generating",
        }),
      }),
    );
    expect(mockDb.dailyDigest.update).toHaveBeenCalledWith({
      where: {
        userId_digestDayKey: {
          userId: "user-1",
          digestDayKey: "2026-03-21",
        },
      },
      data: expect.objectContaining({
        status: "ready",
        title: "Today's Synthesis",
        intro: "Two product signals stood out today.",
        readingTime: 6,
      }),
    });
  });

  it("skips profiles whose local daily run has not reached 07:00 yet", async () => {
    mockDb.interestProfile.findMany.mockResolvedValue([
      {
        userId: "user-1",
        status: "active",
        interestText: "AI agents and design tools",
        firstEligibleDigestDayKey: "2026-03-21",
      },
    ]);

    const provider = {
      generate: vi.fn(),
    };

    const { runDigestGenerationCycle } = await import("@/lib/digest/service");

    const result = await runDigestGenerationCycle({
      now: new Date("2026-03-22T06:30:00+08:00"),
      provider,
    });

    expect(result).toEqual({
      processed: 0,
      ready: 0,
      failed: 0,
      skipped: 1,
    });
    expect(provider.generate).not.toHaveBeenCalled();
    expect(mockDb.dailyDigest.upsert).not.toHaveBeenCalled();
  });

  it("uses one shared Beijing digestDayKey for all active users after 07:00", async () => {
    mockDb.interestProfile.findMany.mockResolvedValue([
      {
        userId: "user-1",
        status: "active",
        interestText: "AI agents and design tools",
        firstEligibleDigestDayKey: "2026-03-21",
      },
      {
        userId: "user-2",
        status: "active",
        interestText: "Semiconductors and robotics",
        firstEligibleDigestDayKey: "2026-03-21",
      },
    ]);
    mockDb.dailyDigest.findUnique.mockResolvedValue(null);
    mockDb.dailyDigest.upsert.mockResolvedValue(undefined);
    mockDb.dailyDigest.update.mockResolvedValue(undefined);

    const provider = {
      generate: vi.fn().mockResolvedValue({
        title: "Today's Synthesis",
        intro: "Two product signals stood out today.",
        readingTime: 6,
        topics: [
          {
            topic: "AI Agents",
            eventsMarkdown: "- A1\na",
            insightsMarkdown: "- AI insight",
            takeawayMarkdown: "AI takeaway",
          },
          {
            topic: "Design Tools",
            eventsMarkdown: "- D1\na",
            insightsMarkdown: "- Design insight",
            takeawayMarkdown: "Design takeaway",
          },
          {
            topic: "Indie Builders",
            eventsMarkdown: "- I1\na",
            insightsMarkdown: "- Indie insight",
            takeawayMarkdown: "Indie takeaway",
          },
        ],
      }),
    };

    const { runDigestGenerationCycle } = await import("@/lib/digest/service");

    await runDigestGenerationCycle({
      now: new Date("2026-03-22T08:15:00+08:00"),
      provider,
    });

    expect(mockDb.dailyDigest.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          userId_digestDayKey: {
            userId: "user-1",
            digestDayKey: "2026-03-22",
          },
        },
      }),
    );
    expect(mockDb.dailyDigest.upsert).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          userId_digestDayKey: {
            userId: "user-2",
            digestDayKey: "2026-03-22",
          },
        },
      }),
    );
  });

  it("marks the digest as failed and increments retry count when generation errors", async () => {
    mockDb.interestProfile.findMany.mockResolvedValue([
      {
        userId: "user-1",
        status: "active",
        interestText: "AI agents and design tools",
        firstEligibleDigestDayKey: "2026-03-21",
      },
    ]);
    mockDb.dailyDigest.findUnique.mockResolvedValue({
      retryCount: 1,
      status: "failed",
    });
    mockDb.dailyDigest.upsert.mockResolvedValue(undefined);
    mockDb.dailyDigest.update.mockResolvedValue(undefined);

    const provider = {
      generate: vi.fn().mockRejectedValue(new Error("provider offline")),
    };

    const { runDigestGenerationCycle } = await import("@/lib/digest/service");

    const result = await runDigestGenerationCycle({
      now: new Date("2026-03-21T08:30:00Z"),
      provider,
    });

    expect(result).toEqual({
      processed: 1,
      ready: 0,
      failed: 1,
      skipped: 0,
    });
    expect(mockDb.dailyDigest.update).toHaveBeenCalledWith({
      where: {
        userId_digestDayKey: {
          userId: "user-1",
          digestDayKey: "2026-03-21",
        },
      },
      data: expect.objectContaining({
        status: "failed",
        retryCount: 2,
        failureReason: "provider offline",
      }),
    });
  });
});
