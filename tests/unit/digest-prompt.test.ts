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

  it("specifies the new topic markdown format in the output section", () => {
    const prompt = buildDigestPrompt({
      dateLabel: "2026-03-22",
      interestText: "AI agents",
    });

    expect(prompt).toContain('Include a "### Top Events" heading');
    expect(prompt).toContain("List up to 7 numbered events");
    expect(prompt).toContain('one separate line starting with "Insight:"');
    expect(prompt).toContain('End with a "### Summary" heading');
    expect(prompt).not.toContain("summary, keyPoints, and whyItMatters");
  });
});
