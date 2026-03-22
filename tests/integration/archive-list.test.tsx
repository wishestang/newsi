import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveList } from "@/components/archive/archive-list";

describe("ArchiveList", () => {
  it("renders digest items grouped by month", () => {
    render(
      <ArchiveList
        items={[
          {
            digestDayKey: "2026-03-21",
            title: "Today's Synthesis",
            readingTime: 6,
          },
        ]}
      />,
    );

    expect(screen.getByText("March 2026")).toBeInTheDocument();
    expect(screen.getByText("Mar 21")).toBeInTheDocument();
    expect(screen.getByText("Today's Synthesis")).toBeInTheDocument();
    expect(screen.getByText("6 min")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/history/2026-03-21");
  });

  it("groups items by month", () => {
    render(
      <ArchiveList
        items={[
          { digestDayKey: "2024-10-24", title: "AI Hardware", readingTime: 4 },
          { digestDayKey: "2024-10-23", title: "State of CSS", readingTime: 3 },
          { digestDayKey: "2024-09-30", title: "Local First", readingTime: 4 },
        ]}
      />,
    );

    expect(screen.getByText("October 2024")).toBeInTheDocument();
    expect(screen.getByText("September 2024")).toBeInTheDocument();
  });

  it("highlights the latest item with bold text", () => {
    render(
      <ArchiveList
        items={[
          { digestDayKey: "2024-10-24", title: "Latest", readingTime: 4 },
          { digestDayKey: "2024-10-23", title: "Older", readingTime: 3 },
        ]}
      />,
    );

    const latest = screen.getByText("Latest");
    expect(latest.className).toContain("font-semibold");
  });
});
