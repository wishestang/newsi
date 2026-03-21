import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("SignInPage", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
  });

  it("shows a preview entry when auth is not configured", async () => {
    const { default: SignInPage } = await import("@/app/signin/page");

    render(<SignInPage />);

    expect(
      screen.getByRole("link", { name: "Open preview" }),
    ).toBeInTheDocument();
  });

  it("hides the preview entry when auth is configured", async () => {
    process.env.DATABASE_URL = "postgres://localhost/newsi";
    process.env.AUTH_SECRET = "secret";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";

    const { default: SignInPage } = await import("@/app/signin/page");

    render(<SignInPage />);

    expect(
      screen.queryByRole("link", { name: "Open preview" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeInTheDocument();
  });

  it("hides the google login button when auth is not configured", async () => {
    const { default: SignInPage } = await import("@/app/signin/page");

    render(<SignInPage />);

    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
  });
});
