import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  dailyDigest: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

describe("digest read helpers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("filters archive items to ready digests only", async () => {
    mockDb.dailyDigest.findMany.mockResolvedValue([]);

    const { listArchivedDigests } = await import("@/lib/digest/service");

    await listArchivedDigests("user-1");

    expect(mockDb.dailyDigest.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: "ready",
      },
      orderBy: {
        digestDayKey: "desc",
      },
      select: {
        digestDayKey: true,
        title: true,
        readingTime: true,
      },
    });
  });

  it("returns parsed digest content for a stored digest", async () => {
    mockDb.dailyDigest.findUnique.mockResolvedValue({
      digestDayKey: "2026-03-21",
      status: "ready",
      title: "Today's Synthesis",
      intro: "Two signals stood out.",
      contentJson: {
        title: "Today's Synthesis",
        intro: "Two signals stood out.",
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
      },
    });

    const { getDigestByDayKey } = await import("@/lib/digest/service");

    const result = await getDigestByDayKey("user-1", "2026-03-21");

    expect(result?.content?.title).toBe("Today's Synthesis");
    expect(mockDb.dailyDigest.findUnique).toHaveBeenCalledWith({
      where: {
        userId_digestDayKey: {
          userId: "user-1",
          digestDayKey: "2026-03-21",
        },
      },
    });
  });
});
