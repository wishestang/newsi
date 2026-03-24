import { describe, expect, it } from "vitest";
import { digestResponseSchema } from "@/lib/digest/schema";

function buildTopic(index: number) {
  return {
    topic: `Topic ${index}`,
    eventsMarkdown: [
      `- **Event ${index}:** A concise event summary.`,
      `- **Event ${index}b:** Another concise event summary.`,
    ].join("\n"),
    insightsMarkdown: [
      "- Insight one",
      "- Insight two",
      "- Insight three",
    ].join("\n"),
    takeawayMarkdown: "Why this topic matters today.",
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

  it("rejects topics with no top-events markdown", () => {
    const topic = buildTopic(1);
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      topics: [{ ...topic, eventsMarkdown: "" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects topics with no insights markdown", () => {
    const topic = buildTopic(1);
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      topics: [{ ...topic, insightsMarkdown: "" }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects topics without a takeaway markdown block", () => {
    const topic = buildTopic(1);
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      topics: [
        {
          topic: topic.topic,
          eventsMarkdown: topic.eventsMarkdown,
          insightsMarkdown: topic.insightsMarkdown,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
