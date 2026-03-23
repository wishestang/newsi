import { describe, expect, it } from "vitest";
import { digestResponseSchema } from "@/lib/digest/schema";

function buildTopic(index: number) {
  return {
    topic: `Topic ${index}`,
    events: [
      {
        title: `Event ${index}`,
        summary: "A concise event summary.",
        keyFacts: ["Fact one", "Fact two", "Fact three"],
      },
      {
        title: `Event ${index}b`,
        summary: "Another concise event summary.",
        keyFacts: ["Fact four", "Fact five"],
      },
    ],
    insights: ["Insight one", "Insight two", "Insight three"],
    takeaway: "Why this topic matters today.",
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
      intro: "A short intro",
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

  it("rejects topics with no events", () => {
    const topic = buildTopic(1);
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      topics: [{ ...topic, events: [] }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects topics with no insights", () => {
    const topic = buildTopic(1);
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      topics: [{ ...topic, insights: [] }],
    });

    expect(result.success).toBe(false);
  });

  it("rejects topics without a takeaway", () => {
    const topic = buildTopic(1);
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      topics: [
        {
          topic: topic.topic,
          events: topic.events,
          insights: topic.insights,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
