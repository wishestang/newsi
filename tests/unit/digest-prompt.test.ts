import { describe, expect, it } from "vitest";
import { buildDigestPrompt, buildBasePrompt } from "@/lib/digest/prompt";

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

    expect(prompt).toContain("#### Event Title");
    expect(prompt).toContain("up to 7");
    expect(prompt).toContain("Why it matters:");
    expect(prompt).toContain("Today's takeaway:");
    expect(prompt).not.toContain("summary, keyPoints, and whyItMatters");
  });

  it("includes Leaderboard format for ranking-type topics", () => {
    const prompt = buildDigestPrompt({
      dateLabel: "2026-03-25",
      interestText: "GitHub Trending",
    });

    expect(prompt).toContain("Format A: Event Briefing");
    expect(prompt).toContain("Format B: Leaderboard");
    expect(prompt).toContain("## Format Selection");
    expect(prompt).toContain("| # | Name | Description | Metric |");
  });
});

describe("buildBasePrompt with dataSourceContexts", () => {
  it("includes pre-fetched data section when contexts are provided", () => {
    const prompt = buildBasePrompt({
      dateLabel: "2026-03-25",
      interestText: "GitHub Trending",
      dataSourceContexts: [
        {
          sourceName: "GitHub Trending",
          markdown: "| # | Repo |\n|---|------|\n| 1 | test-repo |",
        },
      ],
    });

    expect(prompt).toContain("## Pre-fetched Real Data");
    expect(prompt).toContain("### GitHub Trending");
    expect(prompt).toContain("test-repo");
    expect(prompt).toContain("MUST use this data");
  });

  it("omits pre-fetched data section when no contexts", () => {
    const prompt = buildBasePrompt({
      dateLabel: "2026-03-25",
      interestText: "US stocks",
      dataSourceContexts: [],
    });

    expect(prompt).not.toContain("## Pre-fetched Real Data");
  });

  it("omits pre-fetched data section by default", () => {
    const prompt = buildBasePrompt({
      dateLabel: "2026-03-25",
      interestText: "US stocks",
    });

    expect(prompt).not.toContain("## Pre-fetched Real Data");
  });
});
