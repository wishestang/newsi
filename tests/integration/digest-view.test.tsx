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
        markdown: [
          "1. **A new agent IDE launched, adoption up 200%**",
          "   The IDE targets multi-agent workflows and saw rapid early adoption.",
          "   （[Example](https://example.com)）",
          "",
          "> Execution layers are becoming productized.",
        ].join("\n"),
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
    expect(screen.getByText(/A new agent IDE launched/)).toBeInTheDocument();
    expect(screen.getByText(/The IDE targets multi-agent workflows/)).toBeInTheDocument();
  });

  it("renders event content and closing assessment blockquote", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText(/A new agent IDE launched/)).toBeInTheDocument();
    expect(screen.getByText(/adoption up 200%/)).toBeInTheDocument();
    expect(
      screen.getByText(/The IDE targets multi-agent workflows/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Execution layers are becoming productized\./),
    ).toBeInTheDocument();
    expect(screen.queryByText("Top Events")).not.toBeInTheDocument();
    expect(screen.queryByText("Summary")).not.toBeInTheDocument();
  });

  it("renders markdown emphasis and links inside digest content", () => {
    render(
      <DigestView
        {...defaultProps}
        topics={[
          {
            topic: "AI Agents",
            markdown: [
              "1. **A bold move**",
              "   This topic changed quickly. See **why** this matters.",
              "   [source](https://example.com)",
              "",
              "> One **clear** takeaway.",
            ].join("\n"),
          },
        ]}
      />,
    );

    expect(screen.getByText("A bold move")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "source" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
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
            markdown: [
              "1. **Unsafe item**",
              "   Summary text. Unsafe [link](javascript:alert(1))",
              "",
              "> Takeaway text.",
            ].join("\n"),
          },
        ]}
      />,
    );

    expect(screen.queryByRole("link", { name: "link" })).not.toBeInTheDocument();
    expect(screen.getByText("link")).toBeInTheDocument();
  });

  it("renders closing assessment in a styled blockquote", () => {
    render(<DigestView {...defaultProps} />);

    const blockquote = document.querySelector("blockquote");
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveClass("border-l-2");
    expect(blockquote?.textContent).toContain(
      "Execution layers are becoming productized.",
    );
  });

  it("renders the end-of-digest footer", () => {
    render(<DigestView {...defaultProps} />);

    expect(screen.getByText("End of Digest")).toBeInTheDocument();
  });

  it("renders digestDate as-is without formatting", () => {
    render(<DigestView {...defaultProps} digestDate="MARCH 22, 2026" />);

    expect(screen.getByText("MARCH 22, 2026")).toBeInTheDocument();
  });

  it("uses a wider reading column for digest content", () => {
    const { container } = render(<DigestView {...defaultProps} />);

    expect(container.querySelector("article")).toHaveClass("max-w-[760px]");
  });
});
