import { describe, expect, it } from "vitest";
import { digestResponseSchema } from "@/lib/digest/schema";

function buildTopic(index: number) {
  return {
    topic: `Topic ${index}`,
    markdown: [
      "### Top Events",
      "",
      `1. **Event ${index}**`,
      "   A concise event summary.",
      "   Insight: This is why it matters.",
      `   [来源：Example ${index} · 2026-03-24](https://example.com/${index})`,
      "",
      "### Summary",
      "",
      "Why this topic matters today.",
    ].join("\n"),
  };
}

describe("digestResponseSchema", () => {
  it("accepts richer digests up to the new topic limits", () => {
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 20,
      topics: Array.from({ length: 3 }, (_, index) => buildTopic(index + 1)),
    });

    expect(result.success).toBe(true);
  });

  it("accepts a single high-signal topic", () => {
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      readingTime: 5,
      topics: [buildTopic(1)],
    });

    expect(result.success).toBe(true);
  });

  it("still rejects digests with no topics", () => {
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      topics: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects topics with no markdown body", () => {
    const topic = buildTopic(1);
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      topics: [{ ...topic, markdown: "" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects topics without a markdown field", () => {
    const topic = buildTopic(1);
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      topics: [
        {
          topic: topic.topic,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
