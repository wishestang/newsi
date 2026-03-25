import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const routeFiles = [
  "src/app/(app)/today/page.tsx",
  "src/app/(app)/history/page.tsx",
  "src/app/(app)/history/[digestDayKey]/page.tsx",
  "src/app/(app)/preview/page.tsx",
];

describe("app route segment config", () => {
  it("does not force dynamic rendering for app pages", () => {
    for (const file of routeFiles) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source).not.toContain('export const dynamic = "force-dynamic"');
    }
  });
});
