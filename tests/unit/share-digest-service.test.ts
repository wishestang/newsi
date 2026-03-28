import { describe, expect, it, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    dailyDigest: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: dbMock,
}));

import { shareDigest, getSharedDigest } from "@/lib/digest/service";

describe("shareDigest", () => {
  it("returns existing shareUrl if shareSlug is already set", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue({
      userId: "user1",
      digestDayKey: "2026-03-28",
      status: "ready",
      shareSlug: "existing-slug",
    });

    const result = await shareDigest("user1", "2026-03-28");

    expect(result).toBe("http://localhost:3000/public/existing-slug");
    expect(dbMock.dailyDigest.update).not.toHaveBeenCalled();
  });

  it("generates a new slug and returns the shareUrl", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue({
      userId: "user1",
      digestDayKey: "2026-03-28",
      status: "ready",
      shareSlug: null,
    });
    dbMock.dailyDigest.update.mockResolvedValue({});

    const result = await shareDigest("user1", "2026-03-28");

    expect(result).toMatch(/^http:\/\/localhost:3000\/public\/[a-z0-9]+$/);
    expect(dbMock.dailyDigest.update).toHaveBeenCalledOnce();
  });

  it("throws if digest not found", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue(null);

    await expect(shareDigest("user1", "2026-03-28")).rejects.toThrow(
      "Digest not found.",
    );
  });
});

describe("getSharedDigest", () => {
  it("returns the digest if found with ready status", async () => {
    const digestData = {
      id: "digest1",
      userId: "user1",
      digestDayKey: "2026-03-28",
      status: "ready" as const,
      title: "Today's Synthesis",
      intro: "Intro text",
      contentJson: {
        title: "Today's Synthesis",
        intro: "Intro text",
        readingTime: 5,
        topics: [{ topic: "AI", markdown: "Content" }],
      },
      readingTime: 5,
      shareSlug: "abc123",
    };
    dbMock.dailyDigest.findUnique.mockResolvedValue(digestData);

    const result = await getSharedDigest("abc123");

    expect(result).not.toBeNull();
    expect(result!.digest.title).toBe("Today's Synthesis");
    expect(result!.content).not.toBeNull();
  });

  it("returns null if slug not found", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue(null);

    const result = await getSharedDigest("nonexistent");

    expect(result).toBeNull();
  });

  it("returns null if digest status is not ready", async () => {
    dbMock.dailyDigest.findUnique.mockResolvedValue({
      id: "digest1",
      userId: "user1",
      digestDayKey: "2026-03-28",
      status: "generating",
      shareSlug: "abc123",
    });

    const result = await getSharedDigest("abc123");

    expect(result).toBeNull();
  });
});
