import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  user: {
    findUniqueOrThrow: vi.fn(),
    update: vi.fn(),
  },
  interestProfile: {
    upsert: vi.fn(),
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
        create: expect.objectContaining({
          firstEligibleDigestDayKey: "2026-03-22",
        }),
      }),
    );
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { accountTimezone: "Asia/Shanghai" },
    });

    vi.useRealTimers();
  });
});
