import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PreviewRetryPanel } from "@/components/preview/preview-retry-panel";

describe("PreviewRetryPanel", () => {
  it("switches to the digest skeleton immediately after retry is clicked", async () => {
    const user = userEvent.setup();
    const onRetryAction = vi.fn(async () => {
      await new Promise(() => {});
    });

    render(
      <PreviewRetryPanel
        body="Preview generation failed. Try again."
        onRetryAction={onRetryAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.queryByText("Preview generation failed. Try again.")).not.toBeInTheDocument();
    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
