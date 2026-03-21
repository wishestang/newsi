import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchiveList } from "@/components/archive/archive-list";

describe("ArchiveList", () => {
  it("renders digest metadata rows", () => {
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

    expect(screen.getByText("2026-03-21")).toBeInTheDocument();
    expect(screen.getByText("Today's Synthesis")).toBeInTheDocument();
    expect(screen.getByText("6 min")).toBeInTheDocument();
  });
});
