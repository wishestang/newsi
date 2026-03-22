import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/today",
}));

describe("Mobile navigation", () => {
  it("renders the top bar with brand and current section", () => {
    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    const banner = screen.getByRole("banner");
    expect(within(banner).getByText("Newsi")).toBeInTheDocument();
    expect(within(banner).getByText("Today")).toBeInTheDocument();
    expect(
      within(banner).getByRole("button", { name: "Open navigation" }),
    ).toBeInTheDocument();
  });

  it("opens the drawer and exposes the current route", async () => {
    const user = userEvent.setup();

    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));

    const dialog = screen.getByRole("dialog", { name: "Navigation" });
    expect(dialog).toBeInTheDocument();
    const currentLink = within(dialog).getByRole("link", { name: "Today" });
    expect(currentLink).toHaveAttribute("aria-current", "page");
    expect(currentLink.className).toContain("bg-nav-active");
    expect(
      within(dialog).getByRole("link", { name: "History" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: "Topics" }),
    ).toBeInTheDocument();
  });

  it("closes the drawer", async () => {
    const user = userEvent.setup();

    render(
      <AppShell>
        <div>Body</div>
      </AppShell>,
    );

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByRole("button", { name: "Close navigation" }));

    expect(
      screen.queryByRole("dialog", { name: "Navigation" }),
    ).not.toBeInTheDocument();
  });
});
