import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DigestView } from "@/components/digest/digest-view";

describe("DigestView", () => {
  const defaultProps = {
    title: "Today's Synthesis",
    intro: "Two signals stood out across your tracked space today.",
    digestDate: "OCTOBER 24, 2023",
    topics: [
      {
        topic: "AI Agents",
        events: [
          {
            title: "A new agent IDE launched",
            summary: "The IDE targets multi-agent workflows.",
            keyFacts: ["Launched March 24", "Targets enterprise teams"],
          },
        ],
        insights: ["Tooling is packaging orchestration into products."],
        takeaway: "Execution layers are becoming productized.",
      },
    ],
  };

  it("renders digest title and date", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("Today's Synthesis")).toBeInTheDocument();
    expect(screen.getByText("OCTOBER 24, 2023")).toBeInTheDocument();
  });

  it("renders topic titles and event content", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("AI Agents")).toBeInTheDocument();
    expect(screen.getByText("A new agent IDE launched")).toBeInTheDocument();
    expect(screen.getByText("The IDE targets multi-agent workflows.")).toBeInTheDocument();
  });

  it("renders top events insights and takeaway sections", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("Top Events")).toBeInTheDocument();
    expect(screen.getByText("Insights")).toBeInTheDocument();
    expect(screen.getByText("Takeaway")).toBeInTheDocument();
    expect(screen.getByText("Tooling is packaging orchestration into products.")).toBeInTheDocument();
    expect(screen.getByText("Execution layers are becoming productized.")).toBeInTheDocument();
  });

  it("renders markdown emphasis and links inside digest content", () => {
    render(
      <DigestView
        {...defaultProps}
        topics={[
          {
            topic: "AI Agents",
            events: [
              {
                title: "A **bold** move with [source](https://example.com).",
                summary: "This topic changed quickly.",
                keyFacts: ["First point", "Second point"],
              },
            ],
            insights: ["See **why** this matters."],
            takeaway: "One **clear** takeaway.",
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
    expect(screen.getByText("clear")).toBeInTheDocument();
  });

  it("does not render unsafe javascript links", () => {
    render(
      <DigestView
        {...defaultProps}
        topics={[
          {
            topic: "AI Agents",
            events: [
              {
                title: "Unsafe [link](javascript:alert(1))",
                summary: "Summary text.",
                keyFacts: ["Point one", "Point two"],
              },
            ],
            insights: ["Insight text."],
            takeaway: "Takeaway text.",
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
