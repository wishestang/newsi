import { describe, expect, it } from "vitest";
import { formatDigestDate } from "@/lib/digest/format";

describe("formatDigestDate", () => {
  it("formats a YYYY-MM-DD key to uppercase date", () => {
    expect(formatDigestDate("2023-10-24")).toBe("OCTOBER 24, 2023");
  });

  it("formats single-digit months and days", () => {
    expect(formatDigestDate("2026-03-01")).toBe("MARCH 1, 2026");
  });
});
