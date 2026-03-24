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
        eventsMarkdown: [
          "- **A new agent IDE launched**",
          "- The IDE targets multi-agent workflows.",
          "- Launched March 24 and targets enterprise teams.",
        ].join("\n"),
        insightsMarkdown: "- Tooling is packaging orchestration into products.",
        takeawayMarkdown: "Execution layers are becoming productized.",
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
            eventsMarkdown: [
              "- A **bold** move with [source](https://example.com).",
              "- First point",
              "- Second point",
            ].join("\n"),
            insightsMarkdown: "- See **why** this matters.",
            takeawayMarkdown: "One **clear** takeaway.",
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
            eventsMarkdown: [
              "- Unsafe [link](javascript:alert(1))",
              "- Point one",
              "- Point two",
            ].join("\n"),
            insightsMarkdown: "- Insight text.",
            takeawayMarkdown: "Takeaway text.",
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
