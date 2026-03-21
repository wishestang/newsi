import { describe, expect, it } from "vitest";
import { normalizeTimezone } from "@/lib/timezone";

describe("normalizeTimezone", () => {
  it("falls back to UTC for unknown values", () => {
    expect(normalizeTimezone("Mars/Base")).toBe("UTC");
  });
});
