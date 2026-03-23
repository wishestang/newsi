import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PreviewActions } from "@/components/preview/preview-actions";

describe("PreviewActions", () => {
  it("centers the confirm and back actions in ready preview state", () => {
    const onConfirmAction = vi.fn(async () => {});

    render(<PreviewActions onConfirmAction={onConfirmAction} canConfirm />);

    const confirmButton = screen.getByRole("button", {
      name: "Confirm and start daily digests",
    });

    expect(confirmButton).toBeInTheDocument();
    expect(confirmButton.closest("div")).toHaveClass("justify-center");
    expect(screen.getByRole("link", { name: "Back to Topics" })).toBeInTheDocument();
  });
});
