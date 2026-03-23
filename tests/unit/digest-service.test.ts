import { describe, expect, it, vi } from "vitest";
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
            events: [{ title: "A1", summary: "a", keyFacts: ["c", "d"] }],
            insights: ["AI insight"],
            takeaway: "AI takeaway",
          },
          {
            topic: "Tools",
            events: [{ title: "T1", summary: "a", keyFacts: ["c", "d"] }],
            insights: ["Tools insight"],
            takeaway: "Tools takeaway",
          },
          {
            topic: "Startups",
            events: [{ title: "S1", summary: "a", keyFacts: ["c", "d"] }],
            insights: ["Startups insight"],
            takeaway: "Startups takeaway",
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
