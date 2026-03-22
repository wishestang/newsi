import { afterEach, describe, expect, it, vi } from "vitest";

describe("auth environment helpers", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.FORCE_LOCAL_PREVIEW;
  });

  it("requires AUTH_SECRET for auth to be considered configured", async () => {
    process.env.DATABASE_URL = "postgres://localhost/newsi";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";

    const { isAuthConfigured } = await import("@/lib/env");

    expect(isAuthConfigured()).toBe(false);
  });

  it("returns true only when database, secret, and google oauth are all configured", async () => {
    process.env.DATABASE_URL = "postgres://localhost/newsi";
    process.env.AUTH_SECRET = "secret";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";

    const { isAuthConfigured } = await import("@/lib/env");

    expect(isAuthConfigured()).toBe(true);
  });

  it("allows local preview mode to be forced even when auth is configured", async () => {
    process.env.DATABASE_URL = "postgres://localhost/newsi";
    process.env.AUTH_SECRET = "secret";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.FORCE_LOCAL_PREVIEW = "1";

    const { isLocalPreviewMode } = await import("@/lib/env");

    expect(isLocalPreviewMode()).toBe(true);
  });
});
