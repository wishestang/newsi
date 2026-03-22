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
        user: {
          accountTimezone: "UTC",
        },
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
        sections: [
          {
            title: "AI Agents",
            summary: ["a", "b"],
            keyPoints: ["c", "d"],
          },
          {
            title: "Design Tools",
            summary: ["a", "b"],
            keyPoints: ["c", "d"],
          },
          {
            title: "Indie Builders",
            summary: ["a", "b"],
            keyPoints: ["c", "d"],
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
      include: {
        user: {
          select: {
            accountTimezone: true,
          },
        },
      },
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
        user: {
          accountTimezone: "America/Los_Angeles",
        },
      },
    ]);

    const provider = {
      generate: vi.fn(),
    };

    const { runDigestGenerationCycle } = await import("@/lib/digest/service");

    const result = await runDigestGenerationCycle({
      now: new Date("2026-03-21T12:30:00Z"),
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

  it("marks the digest as failed and increments retry count when generation errors", async () => {
    mockDb.interestProfile.findMany.mockResolvedValue([
      {
        userId: "user-1",
        status: "active",
        interestText: "AI agents and design tools",
        firstEligibleDigestDayKey: "2026-03-21",
        user: {
          accountTimezone: "UTC",
        },
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
