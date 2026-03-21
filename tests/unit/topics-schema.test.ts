import { describe, expect, it } from "vitest";
import { interestProfileSchema } from "@/lib/topics/schema";

describe("interestProfileSchema", () => {
  it("rejects an empty interest description", () => {
    const result = interestProfileSchema.safeParse({
      interestText: "",
      browserTimezone: "Asia/Shanghai",
    });

    expect(result.success).toBe(false);
  });
});
