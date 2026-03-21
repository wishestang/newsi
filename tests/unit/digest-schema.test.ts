import { describe, expect, it } from "vitest";
import { digestResponseSchema } from "@/lib/digest/schema";

describe("digestResponseSchema", () => {
  it("requires between 3 and 5 sections", () => {
    const result = digestResponseSchema.safeParse({
      title: "Today's Synthesis",
      intro: "A short intro",
      readingTime: 5,
      sections: [],
    });

    expect(result.success).toBe(false);
  });
});
