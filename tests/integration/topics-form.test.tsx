import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopicsForm } from "@/components/topics/topics-form";

describe("TopicsForm", () => {
  it("renders the save interests call to action", () => {
    render(
      <TopicsForm
        initialValue=""
        onSubmitAction={vi.fn(async () => undefined)}
        onClearAction={vi.fn(async () => undefined)}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Save interests" }),
    ).toBeInTheDocument();
  });

  it("renders a clear action when interests already exist", () => {
    render(
      <TopicsForm
        initialValue="AI agents"
        onSubmitAction={vi.fn(async () => undefined)}
        onClearAction={vi.fn(async () => undefined)}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Clear interests" }),
    ).toBeInTheDocument();
  });
});
