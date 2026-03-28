import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSharedDigestMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {},
}));

vi.mock("@/lib/digest/service", () => ({
  getSharedDigest: (...args: unknown[]) => getSharedDigestMock(...args),
}));

describe("PublicDigestPage", () => {
  beforeEach(() => {
    vi.resetModules();
    getSharedDigestMock.mockReset();
  });

  it("renders the editorial brand footer for a shared digest", async () => {
    getSharedDigestMock.mockResolvedValue({
      digest: {
        title: "Signals to Watch",
        intro: "A concise summary of today's shifts.",
        digestDayKey: "2026-03-28",
      },
      content: {
        title: "Signals to Watch",
        intro: "A concise summary of today's shifts.",
        topics: [
          {
            topic: "AI",
            markdown: "A topic section.",
          },
        ],
      },
    });

    const { default: PublicDigestPage } = await import("@/app/public/[slug]/page");

    render(await PublicDigestPage({ params: Promise.resolve({ slug: "abc123" }) }));

    expect(screen.getByText("Made with Newsi")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Your Brief" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.queryByText("End of Digest")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "One brief, one digest, every day. Cut through the noise, focus on what matters.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Newsi" })).toHaveAttribute("href", "/");
  });
});
