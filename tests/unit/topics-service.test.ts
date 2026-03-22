import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  user: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  interestProfile: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  previewDigest: {
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  dailyDigest: {
    deleteMany: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

describe("saveInterestProfile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("sets timezone and first eligible day on first create", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T08:00:00+08:00"));

    mockDb.user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      accountTimezone: null,
    });
    mockDb.interestProfile.upsert.mockResolvedValue(undefined);
    mockDb.user.update.mockResolvedValue(undefined);

    const { saveInterestProfile } = await import("@/lib/topics/service");

    await saveInterestProfile("user-1", {
      interestText: "AI agents",
      browserTimezone: "Asia/Shanghai",
    });

    expect(mockDb.interestProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          interestText: "AI agents",
          status: "pending_preview",
        }),
        create: expect.objectContaining({
          interestText: "AI agents",
          status: "pending_preview",
          firstEligibleDigestDayKey: "2026-03-22",
        }),
      }),
    );
    expect(mockDb.previewDigest.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        update: expect.objectContaining({
          interestTextSnapshot: "AI agents",
          status: "generating",
          generationToken: expect.any(String),
        }),
        create: expect.objectContaining({
          userId: "user-1",
          interestTextSnapshot: "AI agents",
          status: "generating",
          generationToken: expect.any(String),
        }),
      }),
    );
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { accountTimezone: "Asia/Shanghai" },
    });

    vi.useRealTimers();
  });

  it("clears the saved interest profile for a user", async () => {
    mockDb.interestProfile.deleteMany.mockResolvedValue({ count: 1 });
    mockDb.previewDigest.deleteMany.mockResolvedValue({ count: 1 });

    const { clearInterestProfile } = await import("@/lib/topics/service");

    await clearInterestProfile("user-1");

    expect(mockDb.interestProfile.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mockDb.previewDigest.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mockDb.dailyDigest.deleteMany).not.toHaveBeenCalled();
  });

  it("computes firstEligibleDigestDayKey from Beijing time instead of browser timezone", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-21T23:30:00Z"));

    mockDb.user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      accountTimezone: null,
    });
    mockDb.interestProfile.upsert.mockResolvedValue(undefined);
    mockDb.previewDigest.upsert.mockResolvedValue(undefined);
    mockDb.user.update.mockResolvedValue(undefined);

    const { saveInterestProfile } = await import("@/lib/topics/service");

    await saveInterestProfile("user-1", {
      interestText: "AI agents",
      browserTimezone: "America/New_York",
    });

    expect(mockDb.interestProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          firstEligibleDigestDayKey: "2026-03-23",
        }),
      }),
    );
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { accountTimezone: "America/New_York" },
    });

    vi.useRealTimers();
  });
});
