import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusPanel } from "@/components/states/status-panel";

describe("StatusPanel", () => {
  it("renders a label and body copy", () => {
    render(
      <StatusPanel
        label="Preview Mode"
        body="Configure your database and auth credentials to enable full flows."
      />,
    );

    expect(screen.getByText("Preview Mode")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Configure your database and auth credentials to enable full flows.",
      ),
    ).toBeInTheDocument();
  });
});
