import { describe, expect, it } from "vitest";
import {
  DIGEST_TIMEZONE,
  getBeijingDigestDayKey,
  getNextBeijingDigestDayKey,
  hasBeijingDailyRunPassed,
  normalizeTimezone,
} from "@/lib/timezone";

describe("timezone helpers", () => {
  it("falls back to UTC for unknown values", () => {
    expect(normalizeTimezone("Mars/Base")).toBe("UTC");
  });

  it("uses Asia/Shanghai as the formal digest timezone", () => {
    expect(DIGEST_TIMEZONE).toBe("Asia/Shanghai");
  });

  it("treats 06:59 Beijing time as before the batch window", () => {
    expect(hasBeijingDailyRunPassed(new Date("2026-03-22T06:59:00+08:00"))).toBe(false);
  });

  it("treats 07:00 Beijing time as inside the batch window", () => {
    expect(hasBeijingDailyRunPassed(new Date("2026-03-22T07:00:00+08:00"))).toBe(true);
  });

  it("builds the Beijing digest day key from Beijing calendar time", () => {
    expect(getBeijingDigestDayKey(new Date("2026-03-21T23:30:00Z"))).toBe("2026-03-22");
  });

  it("returns the next Beijing digest day key", () => {
    expect(getNextBeijingDigestDayKey(new Date("2026-03-22T08:00:00+08:00"))).toBe(
      "2026-03-23",
    );
  });
});
