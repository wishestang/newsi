import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ShareButton } from "@/components/digest/share-button";

describe("ShareButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it("renders a share button", () => {
    render(<ShareButton digestDayKey="2026-03-28" />);

    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument();
  });

  it("copies share URL to clipboard on click", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, shareUrl: "https://example.com/public/abc123" }),
    });

    render(<ShareButton digestDayKey="2026-03-28" />);

    const button = screen.getByRole("button", { name: /share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/digests/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digestDayKey: "2026-03-28" }),
      });
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://example.com/public/abc123",
    );
  });

  it("shows 已复制 state after successful share", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, shareUrl: "https://example.com/public/abc123" }),
    });

    render(<ShareButton digestDayKey="2026-03-28" />);

    const button = screen.getByRole("button", { name: /share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("已复制")).toBeInTheDocument();
    });
  });

  it("disables button while API call is in progress", async () => {
    let resolvePromise: (value: unknown) => void;
    mockFetch.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePromise = resolve;
      }),
    );

    render(<ShareButton digestDayKey="2026-03-28" />);

    const button = screen.getByRole("button", { name: /share/i });
    fireEvent.click(button);

    expect(button).toBeDisabled();

    resolvePromise!({
      ok: true,
      json: async () => ({ ok: true, shareUrl: "https://example.com/public/abc123" }),
    });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it("shows 生成链接失败 on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "Digest not found." }),
    });

    render(<ShareButton digestDayKey="2026-03-28" />);

    const button = screen.getByRole("button", { name: /share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("生成链接失败")).toBeInTheDocument();
    });

    expect(screen.getByText("Digest not found.")).toBeInTheDocument();
  });

  it("shows 复制失败 when copying the URL fails", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, shareUrl: "https://example.com/public/abc123" }),
    });

    render(<ShareButton digestDayKey="2026-03-28" />);

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByText("复制失败")).toBeInTheDocument();
    });

    expect(
      screen.getByText("链接已生成，但浏览器拒绝复制。"),
    ).toBeInTheDocument();
  });

  it("shows a log hint when the shareSlug column is missing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        ok: false,
        error: 'column "shareSlug" does not exist',
      }),
    });

    render(<ShareButton digestDayKey="2026-03-28" />);

    fireEvent.click(screen.getByRole("button", { name: /share/i }));

    await waitFor(() => {
      expect(screen.getByText("生成链接失败")).toBeInTheDocument();
    });

    expect(
      screen.getByText("分享链接生成失败。请查看本地服务日志里的 share 错误详情。"),
    ).toBeInTheDocument();
  });
});
