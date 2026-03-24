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
            eventsMarkdown: "- A1\na",
            insightsMarkdown: "- AI insight",
            takeawayMarkdown: "AI takeaway",
          },
          {
            topic: "Tools",
            eventsMarkdown: "- T1\na",
            insightsMarkdown: "- Tools insight",
            takeawayMarkdown: "Tools takeaway",
          },
          {
            topic: "Startups",
            eventsMarkdown: "- S1\na",
            insightsMarkdown: "- Startups insight",
            takeawayMarkdown: "Startups takeaway",
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
