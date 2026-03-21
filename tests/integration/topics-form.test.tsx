import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopicsForm } from "@/components/topics/topics-form";

describe("TopicsForm", () => {
  it("renders the save interests call to action", () => {
    render(
      <TopicsForm
        initialValue=""
        onSubmitAction={vi.fn(async (_formData: FormData) => undefined)}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Save interests" }),
    ).toBeInTheDocument();
  });
});
