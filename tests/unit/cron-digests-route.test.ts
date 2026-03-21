import { afterEach, describe, expect, it, vi } from "vitest";

describe("GET /api/cron/digests", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.CRON_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
  });

  it("returns 401 for missing authorization", async () => {
    process.env.CRON_SECRET = "secret";

    const { GET } = await import("@/app/api/cron/digests/route");
    const response = await GET(new Request("http://localhost:3000/api/cron/digests"));

    expect(response.status).toBe(401);
  });

  it("returns a preview-mode payload when auth or persistence is not configured", async () => {
    process.env.CRON_SECRET = "secret";

    const { GET } = await import("@/app/api/cron/digests/route");
    const response = await GET(
      new Request("http://localhost:3000/api/cron/digests", {
        headers: {
          authorization: "Bearer secret",
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      skipped: "preview-mode",
    });
  });
});
