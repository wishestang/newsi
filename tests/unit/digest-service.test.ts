import { describe, expect, it, vi } from "vitest";
import { generateDigest } from "@/lib/digest/service";

describe("generateDigest", () => {
  it("returns parsed digest data from the provider", async () => {
    const provider = {
      generate: vi.fn().mockResolvedValue({
        title: "Today's Synthesis",
        intro: "Signals across your tracked space moved in two clear directions.",
        readingTime: 6,
        sections: [
          {
            title: "AI",
            summary: ["a", "b"],
            keyPoints: ["c", "d"],
          },
          {
            title: "Tools",
            summary: ["a", "b"],
            keyPoints: ["c", "d"],
          },
          {
            title: "Startups",
            summary: ["a", "b"],
            keyPoints: ["c", "d"],
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
