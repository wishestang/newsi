import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
}));

describe("AppShell", () => {
  it("renders the primary navigation items", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Topics")).toBeInTheDocument();
  });

  it("renders the Newsi brand name", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(screen.getByText("Newsi")).toBeInTheDocument();
  });

  it("renders sidebar icons from public assets", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(screen.getByAltText("Today icon")).toHaveAttribute(
      "src",
      expect.stringContaining("/icon-calendar.svg"),
    );
    expect(screen.getByAltText("History icon")).toHaveAttribute(
      "src",
      expect.stringContaining("/icon-archive.svg"),
    );
    expect(screen.getByAltText("Topics icon")).toHaveAttribute(
      "src",
      expect.stringContaining("/icon-topics.svg"),
    );
    expect(screen.getByAltText("Collapse navigation")).toHaveAttribute(
      "src",
      expect.stringContaining("/icon-panel-toggle.svg"),
    );
  });
});
