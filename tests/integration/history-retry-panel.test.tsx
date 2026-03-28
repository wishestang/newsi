import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HistoryRetryPanel } from "@/app/(app)/history/[digestDayKey]/history-retry-panel";

const refreshMock = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

describe("HistoryRetryPanel", () => {
  it("centers the retry button in the failed state", () => {
    render(
      <HistoryRetryPanel
        digestDayKey="2026-03-22"
        label="2026-03-22"
        body="This digest exists, but the readable content is not available yet."
      />,
    );

    expect(screen.getByRole("button", { name: "Retry" }).parentElement).toHaveClass(
      "justify-center",
    );
  });

  it("switches to the digest skeleton immediately after retry is clicked", async () => {
    const user = userEvent.setup();
    refreshMock.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <HistoryRetryPanel
        digestDayKey="2026-03-22"
        label="2026-03-22"
        body="This digest exists, but the readable content is not available yet."
      />,
    );

    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      screen.queryByText("This digest exists, but the readable content is not available yet."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveClass("min-h-[calc(100vh-96px)]");
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
