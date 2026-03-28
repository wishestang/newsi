import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { ShareButton } from "@/components/digest/share-button";

describe("ShareButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
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

  it("returns to idle state on API error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: false, error: "Digest not found." }),
    });

    render(<ShareButton digestDayKey="2026-03-28" />);

    const button = screen.getByRole("button", { name: /share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
