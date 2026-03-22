import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("SignInPage", () => {
  afterEach(() => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
    delete process.env.AUTH_SECRET;
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.FORCE_LOCAL_PREVIEW;
  });

  it("shows a preview entry when auth is not configured", async () => {
    const { default: SignInPage } = await import("@/app/signin/page");

    render(<SignInPage />);

    expect(
      screen.getByRole("link", { name: /explore a preview/ }),
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
      screen.queryByRole("link", { name: /explore a preview/ }),
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

  it("shows the preview entry when local preview mode is forced", async () => {
    process.env.DATABASE_URL = "postgres://localhost/newsi";
    process.env.AUTH_SECRET = "secret";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.FORCE_LOCAL_PREVIEW = "1";

    const { default: SignInPage } = await import("@/app/signin/page");

    render(<SignInPage />);

    expect(
      screen.getByRole("link", { name: /explore a preview/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Continue with Google" }),
    ).not.toBeInTheDocument();
  });
});
