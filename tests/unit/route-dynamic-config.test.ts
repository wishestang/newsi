import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const nonDynamicRouteFiles = [
  "src/app/(app)/today/page.tsx",
  "src/app/(app)/history/page.tsx",
  "src/app/(app)/history/[digestDayKey]/page.tsx",
];

describe("app route segment config", () => {
  it("does not force dynamic rendering for today and history pages", () => {
    for (const file of nonDynamicRouteFiles) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toContain('export const dynamic = "force-dynamic"');
    }
  });

  it("keeps preview page force-dynamic for live generation state refresh", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/app/(app)/preview/page.tsx"),
      "utf8",
    );

    expect(source).toContain('export const dynamic = "force-dynamic"');
  });
});
