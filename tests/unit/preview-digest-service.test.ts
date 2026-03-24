import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDb = {
  interestProfile: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  dailyDigest: {
    upsert: vi.fn(),
  },
  previewDigest: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: {
    findUniqueOrThrow: vi.fn(),
  },
  $transaction: vi.fn(async (callback: (tx: typeof mockDb) => unknown) => callback(mockDb)),
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

describe("preview digest service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("claims preview generation only once before calling the provider", async () => {
    mockDb.previewDigest.findUnique.mockResolvedValue({
      userId: "user-1",
      generationToken: "token-1",
      updatedAt: new Date("2026-03-22T10:00:00Z"),
      interestTextSnapshot: "AI agents",
      status: "generating",
      contentJson: null,
    });
    mockDb.previewDigest.updateMany.mockResolvedValue({ count: 1 });

    const provider = {
      name: "gemini",
      model: "gemini-2.5-flash",
      generate: vi.fn().mockResolvedValue({
        title: "Today's Synthesis",
        intro: "Two product signals stood out today.",
        readingTime: 6,
        topics: [
          {
            topic: "AI Agents",
            markdown: "### Top Events\n\n1. **A1**\n   a\n   Insight: AI insight\n   [来源：Example · 2026-03-24](https://example.com/a1)\n\n### Summary\n\nAI takeaway",
          },
          {
            topic: "Design Tools",
            markdown: "### Top Events\n\n1. **D1**\n   a\n   Insight: Design insight\n   [来源：Example · 2026-03-24](https://example.com/d1)\n\n### Summary\n\nDesign takeaway",
          },
          {
            topic: "Indie Builders",
            markdown: "### Top Events\n\n1. **I1**\n   a\n   Insight: Indie insight\n   [来源：Example · 2026-03-24](https://example.com/i1)\n\n### Summary\n\nIndie takeaway",
          },
        ],
      }),
    };

    const { startPreviewDigestGeneration } = await import("@/lib/preview-digest/service");

    await startPreviewDigestGeneration("user-1", { provider });

    expect(mockDb.previewDigest.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        status: "generating",
        generationToken: "token-1",
        updatedAt: new Date("2026-03-22T10:00:00Z"),
      },
      data: {
        updatedAt: expect.any(Date),
      },
    });
    expect(provider.generate).toHaveBeenCalledOnce();
    expect(mockDb.previewDigest.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          generationToken: "token-1",
        },
        data: expect.objectContaining({
          status: "ready",
          providerName: "gemini",
          providerModel: "gemini-2.5-flash",
        }),
      }),
    );
  });

  it("does not call the provider when another request already claimed generation", async () => {
    mockDb.previewDigest.findUnique.mockResolvedValue({
      userId: "user-1",
      generationToken: "token-1",
      updatedAt: new Date("2026-03-22T10:00:00Z"),
      interestTextSnapshot: "AI agents",
      status: "generating",
      contentJson: null,
    });
    mockDb.previewDigest.updateMany.mockResolvedValue({ count: 0 });

    const provider = {
      generate: vi.fn(),
    };

    const { startPreviewDigestGeneration } = await import("@/lib/preview-digest/service");

    await startPreviewDigestGeneration("user-1", { provider });

    expect(provider.generate).not.toHaveBeenCalled();
  });

  it("persists failure state and reason when the provider errors", async () => {
    mockDb.previewDigest.findUnique.mockResolvedValue({
      userId: "user-1",
      generationToken: "token-1",
      updatedAt: new Date("2026-03-22T10:00:00Z"),
      interestTextSnapshot: "AI agents",
      status: "generating",
      contentJson: null,
    });
    mockDb.previewDigest.updateMany.mockResolvedValue({ count: 1 });

    const provider = {
      generate: vi.fn().mockRejectedValue(new Error("preview provider offline")),
    };

    const { startPreviewDigestGeneration } = await import("@/lib/preview-digest/service");

    await startPreviewDigestGeneration("user-1", { provider });

    expect(mockDb.previewDigest.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          userId: "user-1",
          generationToken: "token-1",
        },
        data: expect.objectContaining({
          status: "failed",
          failureReason: "preview provider offline",
        }),
      }),
    );
  });

  it("refreshes the token when retrying a failed preview", async () => {
    mockDb.previewDigest.update.mockResolvedValue(undefined);

    const { retryPreviewDigest } = await import("@/lib/preview-digest/service");

    await retryPreviewDigest("user-1");

    expect(mockDb.previewDigest.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: expect.objectContaining({
        status: "generating",
        generationToken: expect.any(String),
        failureReason: null,
      }),
    });
  });

  it("requires a ready preview with a matching snapshot before confirming", async () => {
    mockDb.previewDigest.findUnique.mockResolvedValue({
      userId: "user-1",
      interestTextSnapshot: "AI agents",
      status: "ready",
    });
    mockDb.interestProfile.findUnique.mockResolvedValue({
      userId: "user-1",
      interestText: "Design tools",
    });

    const { confirmPreviewDigest } = await import("@/lib/preview-digest/service");

    await expect(confirmPreviewDigest("user-1")).rejects.toThrow(
      "Preview digest is stale. Regenerate it from the latest Topics.",
    );
  });

  it("promotes a ready preview into today's formal digest on confirm", async () => {
    mockDb.previewDigest.findUnique.mockResolvedValue({
      userId: "user-1",
      interestTextSnapshot: "AI agents",
      generationToken: "token-1",
      status: "ready",
      title: "Today's Synthesis",
      intro: "Preview intro",
      readingTime: 5,
      contentJson: {
        title: "Today's Synthesis",
        intro: "Preview intro",
        readingTime: 5,
        topics: [
          {
            topic: "A",
            markdown: "### Top Events\n\n1. **A1**\n   a\n   Insight: A insight\n   [来源：Example · 2026-03-24](https://example.com/a1)\n\n### Summary\n\nA takeaway",
          },
          {
            topic: "B",
            markdown: "### Top Events\n\n1. **B1**\n   a\n   Insight: B insight\n   [来源：Example · 2026-03-24](https://example.com/b1)\n\n### Summary\n\nB takeaway",
          },
          {
            topic: "C",
            markdown: "### Top Events\n\n1. **C1**\n   a\n   Insight: C insight\n   [来源：Example · 2026-03-24](https://example.com/c1)\n\n### Summary\n\nC takeaway",
          },
        ],
      },
      providerName: "gemini",
      providerModel: "gemini-2.5-flash",
    });
    mockDb.interestProfile.findUnique.mockResolvedValue({
      userId: "user-1",
      interestText: "AI agents",
    });
    mockDb.user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      accountTimezone: "America/New_York",
    });

    const { confirmPreviewDigest } = await import("@/lib/preview-digest/service");

    await confirmPreviewDigest("user-1", new Date("2026-03-22T00:30:00Z"));

    expect(mockDb.dailyDigest.upsert).toHaveBeenCalledWith({
      where: {
        userId_digestDayKey: {
          userId: "user-1",
          digestDayKey: "2026-03-22",
        },
      },
      update: {
        status: "ready",
        title: "Today's Synthesis",
        intro: "Preview intro",
        contentJson: expect.objectContaining({
          title: "Today's Synthesis",
        }),
        readingTime: 5,
        providerName: "gemini",
        providerModel: "gemini-2.5-flash",
        failureReason: null,
      },
      create: {
        userId: "user-1",
        digestDayKey: "2026-03-22",
        status: "ready",
        title: "Today's Synthesis",
        intro: "Preview intro",
        contentJson: expect.objectContaining({
          title: "Today's Synthesis",
        }),
        readingTime: 5,
        providerName: "gemini",
        providerModel: "gemini-2.5-flash",
        failureReason: null,
      },
    });
    expect(mockDb.interestProfile.update).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: {
        status: "active",
        firstEligibleDigestDayKey: "2026-03-23",
      },
    });
    expect(mockDb.previewDigest.delete).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });
});
