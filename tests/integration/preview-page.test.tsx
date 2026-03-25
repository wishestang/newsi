import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const redirectMock = vi.fn();
const refreshMock = vi.fn();
const getServerSessionMock = vi.fn();
const getPreviewDigestMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (href: string) => redirectMock(href),
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/env", () => ({
  isLocalPreviewMode: () => false,
}));

vi.mock("@/lib/preview-digest/service", () => ({
  getPreviewDigest: (...args: unknown[]) => getPreviewDigestMock(...args),
}));

describe("PreviewPage", () => {
  const mockUser = {
    id: "user-1",
    name: null,
    email: "user@example.com",
    emailVerified: null,
    image: null,
    accountTimezone: "UTC",
    createdAt: new Date("2026-03-22T00:00:00Z"),
    updatedAt: new Date("2026-03-22T00:00:00Z"),
  };

  beforeEach(() => {
    vi.resetModules();
    redirectMock.mockReset();
    refreshMock.mockReset();
    getServerSessionMock.mockReset();
    getPreviewDigestMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders a generating state for a pending preview", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db!.user.findUnique).mockResolvedValue(mockUser);
    getServerSessionMock.mockResolvedValue({
      user: { email: "user@example.com" },
    });
    getPreviewDigestMock.mockResolvedValue({
      previewDigest: {
        userId: "user-1",
        status: "generating",
      },
      content: null,
    });
    const { default: PreviewPage } = await import("@/app/(app)/preview/page");

    render(await PreviewPage());

    expect(screen.getByText("Generating")).toBeInTheDocument();
    expect(
      screen.getByText(/Newsi is preparing a real preview digest/i),
    ).toBeInTheDocument();
  });

  it("renders the digest when the preview is ready", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db!.user.findUnique).mockResolvedValue(mockUser);
    getServerSessionMock.mockResolvedValue({
      user: { email: "user@example.com" },
    });
    getPreviewDigestMock.mockResolvedValue({
      previewDigest: {
        userId: "user-1",
        status: "ready",
      },
      content: {
        title: "Today's Synthesis",
        intro: "Two product signals stood out today.",
        readingTime: 6,
        topics: [
          {
            topic: "AI Agents",
            markdown: [
              "Agent tooling saw a notable launch today.",
              "",
              "---",
              "",
              "#### A new agent IDE launched",
              "",
              "The IDE targets multi-agent workflows.",
              "",
              "> **Why it matters:** Tooling is packaging orchestration into products.",
              "",
              "*Sources: [Example](https://example.com)*",
              "",
              "---",
              "",
              "> **Today's takeaway:** Execution layers are becoming productized.",
            ].join("\n"),
          },
        ],
      },
    });

    const { default: PreviewPage } = await import("@/app/(app)/preview/page");

    render(await PreviewPage());

    expect(screen.getByRole("heading", { name: "Today's Synthesis" })).toBeInTheDocument();
    expect(screen.getByText("A new agent IDE launched")).toBeInTheDocument();
    expect(screen.getByText(/Today's takeaway/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm and start daily digests" }),
    ).toBeInTheDocument();
  });

  it("redirects back to topics when there is no pending preview", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db!.user.findUnique).mockResolvedValue(mockUser);
    getServerSessionMock.mockResolvedValue({
      user: { email: "user@example.com" },
    });
    getPreviewDigestMock.mockResolvedValue(null);

    const { default: PreviewPage } = await import("@/app/(app)/preview/page");

    await PreviewPage();

    expect(redirectMock).toHaveBeenCalledWith("/topics");
  });
});
