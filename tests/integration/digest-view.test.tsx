import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DigestView } from "@/components/digest/digest-view";

describe("DigestView", () => {
  it("renders digest sections and key points", () => {
    render(
      <DigestView
        title="Today's Synthesis"
        intro="Two signals stood out across your tracked space today."
        sections={[
          {
            title: "AI Agents",
            summary: ["A first summary paragraph.", "A second summary paragraph."],
            keyPoints: ["Point one", "Point two"],
          },
        ]}
      />,
    );

    expect(screen.getByText("Today's Synthesis")).toBeInTheDocument();
    expect(screen.getByText("AI Agents")).toBeInTheDocument();
    expect(screen.getByText("Point one")).toBeInTheDocument();
  });
});
