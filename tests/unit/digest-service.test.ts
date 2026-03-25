import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/datasources", () => ({
  fetchMatchingDataSources: vi.fn().mockResolvedValue([]),
}));

import { generateDigest } from "@/lib/digest/service";

describe("generateDigest", () => {
  it("returns parsed digest data from the provider", async () => {
    const provider = {
      generate: vi.fn().mockResolvedValue({
        title: "Today's Synthesis",
        intro: "Signals across your tracked space moved in two clear directions.",
        readingTime: 6,
        topics: [
          {
            topic: "AI",
            markdown: "### Top Events\n\n1. **A1**\n   a\n   Insight: AI insight\n   [来源：Example · 2026-03-24](https://example.com/a1)\n\n### Summary\n\nAI takeaway",
          },
          {
            topic: "Tools",
            markdown: "### Top Events\n\n1. **T1**\n   a\n   Insight: Tools insight\n   [来源：Example · 2026-03-24](https://example.com/t1)\n\n### Summary\n\nTools takeaway",
          },
          {
            topic: "Startups",
            markdown: "### Top Events\n\n1. **S1**\n   a\n   Insight: Startups insight\n   [来源：Example · 2026-03-24](https://example.com/s1)\n\n### Summary\n\nStartups takeaway",
          },
        ],
      }),
    };

    const result = await generateDigest({
      provider,
      dateLabel: "2026-03-21",
      interestText: "AI agents and design tools",
    });

    expect(result.title).toBe("Today's Synthesis");
    expect(provider.generate).toHaveBeenCalledOnce();
  });
});
