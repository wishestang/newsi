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

  it("loads archive items across all digest statuses", async () => {
    mockDb.dailyDigest.findMany.mockResolvedValue([]);

    const { listArchivedDigests } = await import("@/lib/digest/service");

    await listArchivedDigests("user-1");

    expect(mockDb.dailyDigest.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
      },
      orderBy: {
        digestDayKey: "desc",
      },
      select: {
        digestDayKey: true,
        title: true,
        readingTime: true,
        status: true,
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

  it("loads today's digest using the Beijing digest day key", async () => {
    mockDb.dailyDigest.findUnique.mockResolvedValue(null);

    const { getTodayDigest } = await import("@/lib/digest/service");

    await getTodayDigest("user-1", new Date("2026-03-21T23:30:00Z"));

    expect(mockDb.dailyDigest.findUnique).toHaveBeenCalledWith({
      where: {
        userId_digestDayKey: {
          userId: "user-1",
          digestDayKey: "2026-03-22",
        },
      },
    });
  });
});
