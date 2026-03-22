import { describe, expect, it } from "vitest";
import { buildDigestPrompt } from "@/lib/digest/prompt";

describe("buildDigestPrompt", () => {
  it("keeps one universal prompt with quality requirements", () => {
    const prompt = buildDigestPrompt({
      dateLabel: "March 22, 2026",
      interestText: "US stocks",
    });

    expect(prompt).toContain("expert research analyst");
    expect(prompt).toContain("## Content Quality Requirements");
    expect(prompt).toContain("## Depth Guidelines");
    expect(prompt).not.toContain("finance template");
  });

  it("requires matching the language of the standing brief", () => {
    const prompt = buildDigestPrompt({
      dateLabel: "2026-03-22",
      interestText: "美股",
    });

    expect(prompt).toContain("MUST be in Chinese");
    expect(prompt).toContain("Match the user's language exactly");
  });

  it("allows markdown inside existing string fields", () => {
    const prompt = buildDigestPrompt({
      dateLabel: "2026-03-22",
      interestText: "AI agents",
    });

    expect(prompt).toContain("Markdown");
    expect(prompt).toContain("tables");
    expect(prompt).toContain("summary, keyPoints, and whyItMatters");
  });
});
