import { afterEach, describe, expect, it, vi } from "vitest";

describe("createPrismaClient", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
  });

  it("returns null when DATABASE_URL is missing", async () => {
    const { createPrismaClient } = await import("@/lib/db");

    expect(createPrismaClient()).toBeNull();
  });
});
