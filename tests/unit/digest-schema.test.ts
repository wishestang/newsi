import { describe, expect, it } from "vitest";
import { digestResponseSchema } from "@/lib/digest/schema";

function buildSection(index: number) {
  return {
    title: `Section ${index}`,
    summary: ["Paragraph one", "Paragraph two", "Paragraph three", "Paragraph four", "Paragraph five", "Paragraph six"],
    keyPoints: ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"],
    whyItMatters: "Why this matters",
  };
}

describe("digestResponseSchema", () => {
  it("accepts richer digests up to the new limits", () => {
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 20,
      sections: Array.from({ length: 3 }, (_, index) => buildSection(index + 1)),
    });

    expect(result.success).toBe(true);
  });

  it("accepts a single high-signal section", () => {
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      sections: [buildSection(1)],
    });

    expect(result.success).toBe(true);
  });

  it("still rejects digests with no sections", () => {
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      sections: [],
    });

    expect(result.success).toBe(false);
  });
});
