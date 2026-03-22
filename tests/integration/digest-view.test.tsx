import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DigestView } from "@/components/digest/digest-view";

describe("DigestView", () => {
  const defaultProps = {
    title: "Today's Synthesis",
    intro: "Two signals stood out across your tracked space today.",
    digestDate: "OCTOBER 24, 2023",
    sections: [
      {
        title: "AI Agents",
        summary: ["A first summary paragraph.", "A second summary paragraph."],
        keyPoints: ["Speed: Faster than before", "Point two"],
      },
    ],
  };

  it("renders digest title and date", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("Today's Synthesis")).toBeInTheDocument();
    expect(screen.getByText("OCTOBER 24, 2023")).toBeInTheDocument();
  });

  it("renders section titles and content", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("AI Agents")).toBeInTheDocument();
    expect(screen.getByText("A first summary paragraph.")).toBeInTheDocument();
  });

  it("renders key points with bold labels when colon is present", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("Speed:")).toBeInTheDocument();
    expect(screen.getByText(/Faster than before/)).toBeInTheDocument();
  });

  it("renders key points without colon as plain text", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("Point two")).toBeInTheDocument();
  });

  it("renders the end-of-digest footer", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("End of Digest")).toBeInTheDocument();
  });

  it("renders digestDate as-is without formatting", () => {
    render(<DigestView {...defaultProps} digestDate="MARCH 22, 2026" />);

    expect(screen.getByText("MARCH 22, 2026")).toBeInTheDocument();
  });
});
