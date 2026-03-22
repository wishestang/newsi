import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
}));

describe("AppShell", () => {
  it("renders the primary navigation and main content regions", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", { name: "Primary" });
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Topics" })).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("Body");
  });

  it("renders a mobile navigation toggle", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    expect(
      screen.getByRole("button", { name: "Open navigation" }),
    ).toBeInTheDocument();
  });
});
