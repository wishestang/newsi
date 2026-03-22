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

  it("renders plain-text digests correctly (backward compat)", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("A first summary paragraph.")).toBeInTheDocument();
    expect(screen.getByText(/Speed/)).toBeInTheDocument();
    expect(screen.getByText(/Faster than before/)).toBeInTheDocument();
    expect(screen.getByText("Point two")).toBeInTheDocument();
  });

  it("renders markdown emphasis and links inside digest content", () => {
    render(
      <DigestView
        {...defaultProps}
        sections={[
          {
            title: "AI Agents",
            summary: ["A **bold** move with [source](https://example.com)."],
            keyPoints: ["First point", "Second point"],
            whyItMatters: "See **why** this matters.",
          },
        ]}
      />,
    );

    expect(screen.getByText("bold")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "source" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(screen.getByText("First point")).toBeInTheDocument();
    expect(screen.getByText("why")).toBeInTheDocument();
  });

  it("does not render unsafe javascript links", () => {
    render(
      <DigestView
        {...defaultProps}
        sections={[
          {
            title: "AI Agents",
            summary: ["Unsafe [link](javascript:alert(1))"],
            keyPoints: ["Point one", "Point two"],
          },
        ]}
      />,
    );

    expect(screen.queryByRole("link", { name: "link" })).not.toBeInTheDocument();
    expect(screen.getByText("link")).toBeInTheDocument();
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
